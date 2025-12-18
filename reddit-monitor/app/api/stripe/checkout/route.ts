import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, SUBSCRIPTION_PLAN } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reachh.com'

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an active subscription
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    // Create Stripe checkout session for subscription
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Reachh ${SUBSCRIPTION_PLAN.name}`,
              description: `${SUBSCRIPTION_PLAN.commentsPerMonth} comments per month`,
            },
            unit_amount: SUBSCRIPTION_PLAN.price,
            recurring: {
              interval: SUBSCRIPTION_PLAN.interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_id: SUBSCRIPTION_PLAN.id,
      },
      success_url: `${APP_URL}/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/dashboard?subscription=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
