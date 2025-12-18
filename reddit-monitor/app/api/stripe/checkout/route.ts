import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, SUBSCRIPTION_PLAN } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://reachh.com'

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Payment system not configured. Please contact support.' }, { status: 500 })
    }

    // Validate key format
    if (!stripeKey.startsWith('sk_')) {
      console.error('STRIPE_SECRET_KEY has invalid format')
      return NextResponse.json({ error: 'Invalid payment configuration. Please contact support.' }, { status: 500 })
    }

    console.log('Stripe key format valid, checking auth...')

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Please log in to subscribe' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Check if user already has an active subscription
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
    }

    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    // Create Stripe checkout session for subscription
    console.log('Creating Stripe checkout session for:', user.email)
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

    // Handle Stripe errors specifically
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message?: string; code?: string }
      console.error('Stripe error type:', stripeError.type, 'code:', stripeError.code)
      return NextResponse.json({
        error: stripeError.message || `Stripe error: ${stripeError.type}`
      }, { status: 500 })
    }

    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
