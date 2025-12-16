import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendPurchaseConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email-triggers'
import Stripe from 'stripe'

// Use service role for webhooks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.user_id
        const credits = parseInt(session.metadata?.credits || '0')
        const paymentIntentId = session.payment_intent as string

        if (!userId || !credits) {
          console.error('Missing metadata in checkout session')
          break
        }

        // Update purchase record to completed
        await supabase
          .from('credit_purchases')
          .update({ status: 'completed' })
          .eq('stripe_payment_intent_id', paymentIntentId)

        // Add credits to user
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        const currentCredits = profile?.credits || 0
        const newCredits = currentCredits + credits

        await supabase
          .from('user_profiles')
          .update({ credits: newCredits })
          .eq('id', userId)

        // Get user email and send confirmation
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        if (authUser?.user?.email) {
          // Get purchase record for confirmation email
          const { data: purchase } = await supabase
            .from('credit_purchases')
            .select('id, credits, amount')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .single()

          if (purchase) {
            await sendPurchaseConfirmationEmail(
              {
                id: userId,
                email: authUser.user.email,
                full_name: authUser.user.user_metadata?.full_name,
              },
              {
                id: purchase.id,
                credits: purchase.credits,
                amount: purchase.amount / 100, // Convert cents to dollars
              },
              newCredits
            )
          }
        }

        console.log(`Added ${credits} credits to user ${userId}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Find the purchase record
        const { data: purchase } = await supabase
          .from('credit_purchases')
          .select('user_id, amount')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (purchase) {
          // Update purchase record to failed
          await supabase
            .from('credit_purchases')
            .update({ status: 'failed' })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          // Send payment failed email
          const { data: authUser } = await supabase.auth.admin.getUserById(purchase.user_id)
          if (authUser?.user?.email) {
            await sendPaymentFailedEmail(
              {
                id: purchase.user_id,
                email: authUser.user.email,
                full_name: authUser.user.user_metadata?.full_name,
              },
              purchase.amount / 100
            )
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
