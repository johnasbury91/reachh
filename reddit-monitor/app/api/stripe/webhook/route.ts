import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe, SUBSCRIPTION_PLAN } from '@/lib/stripe'
import { sendSubscriptionConfirmationEmail } from '@/lib/email-triggers'
import Stripe from 'stripe'

// Lazy-load Supabase client with service role for webhooks
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()
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
      // Subscription created or updated
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription') {
          const userId = session.metadata?.user_id
          const subscriptionId = session.subscription as string
          const customerId = session.customer as string

          if (!userId) {
            console.error('Missing user_id in checkout session metadata')
            break
          }

          // Update user profile with subscription info
          await supabase
            .from('user_profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              subscription_plan: SUBSCRIPTION_PLAN.id,
              comments_remaining: SUBSCRIPTION_PLAN.commentsPerMonth,
              subscription_started_at: new Date().toISOString(),
              current_period_end: null, // Will be set by subscription.updated event
            })
            .eq('id', userId)

          // Send confirmation email
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId)
            if (authUser?.user?.email) {
              await sendSubscriptionConfirmationEmail(
                {
                  id: userId,
                  email: authUser.user.email,
                  full_name: authUser.user.user_metadata?.full_name,
                },
                SUBSCRIPTION_PLAN.name,
                SUBSCRIPTION_PLAN.price / 100,
                SUBSCRIPTION_PLAN.commentsPerMonth
              )
            }
          } catch (emailError) {
            console.error('Failed to send subscription confirmation email:', emailError)
          }

          console.log(`Subscription activated for user ${userId}`)
        }
        break
      }

      // Subscription updated (renewal, plan change, etc)
      case 'customer.subscription.updated': {
        const subscriptionData = event.data.object as Stripe.Subscription
        const customerId = subscriptionData.customer as string

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const status = subscriptionData.status === 'active' ? 'active' :
                        subscriptionData.status === 'past_due' ? 'past_due' :
                        subscriptionData.status === 'canceled' ? 'canceled' : 'inactive'

          // Get period end from the subscription object
          const periodEnd = (subscriptionData as unknown as { current_period_end: number }).current_period_end
          const periodStart = (subscriptionData as unknown as { current_period_start: number }).current_period_start

          await supabase
            .from('user_profiles')
            .update({
              subscription_status: status,
              current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            })
            .eq('id', profile.id)

          // Reset comments on new billing period
          if (subscriptionData.status === 'active' && periodStart) {
            const periodStartDate = new Date(periodStart * 1000)
            const { data: currentProfile } = await supabase
              .from('user_profiles')
              .select('subscription_started_at')
              .eq('id', profile.id)
              .single()

            // If this is a new period, reset comments
            if (currentProfile?.subscription_started_at) {
              const lastReset = new Date(currentProfile.subscription_started_at)
              if (periodStartDate > lastReset) {
                await supabase
                  .from('user_profiles')
                  .update({
                    comments_remaining: SUBSCRIPTION_PLAN.commentsPerMonth,
                    subscription_started_at: periodStartDate.toISOString(),
                  })
                  .eq('id', profile.id)
              }
            }
          }
        }
        break
      }

      // Subscription canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', profile.id)

          console.log(`Subscription canceled for user ${profile.id}`)
        }
        break
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id)

          console.log(`Payment failed for user ${profile.id}`)
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
