import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, SUBSCRIPTION_PLAN } from '@/lib/stripe'

// Ensure APP_URL is valid - trim and default to reachh.com
const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()
const APP_URL = rawAppUrl && rawAppUrl.startsWith('http') ? rawAppUrl : 'https://reachh.com'

export async function POST(request: NextRequest) {
  console.log('=== CHECKOUT v3 ===')
  console.log('APP_URL:', APP_URL)

  // 1. Check Stripe key
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'E1_STRIPE_KEY_MISSING' }, { status: 500 })
  }
  if (!stripeKey.startsWith('sk_')) {
    return NextResponse.json({ error: 'E2_STRIPE_KEY_BAD_FORMAT' }, { status: 500 })
  }
  console.log('Stripe key prefix:', stripeKey.substring(0, 8))

  // 2. Init Supabase
  let supabase
  try {
    supabase = await createClient()
  } catch (e) {
    console.error('Supabase init:', e)
    return NextResponse.json({ error: 'E3_SUPABASE_INIT' }, { status: 500 })
  }

  // 3. Get user
  let user
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return NextResponse.json({ error: 'E4_NOT_LOGGED_IN' }, { status: 401 })
    }
    user = data.user
  } catch (e) {
    console.error('Auth:', e)
    return NextResponse.json({ error: 'E5_AUTH_ERROR' }, { status: 500 })
  }
  console.log('User:', user.email)

  // 4. Check subscription status
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ error: 'E6_ALREADY_SUBSCRIBED' }, { status: 400 })
    }
  } catch (e) {
    console.error('Profile check:', e)
    // Continue anyway - new user might not have profile
  }

  // 5. Init Stripe
  let stripe
  try {
    stripe = getStripe()
  } catch (e) {
    console.error('Stripe init:', e)
    return NextResponse.json({ error: 'E7_STRIPE_INIT' }, { status: 500 })
  }

  // 6. Create checkout session
  try {
    console.log('Creating session...')
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
            recurring: { interval: SUBSCRIPTION_PLAN.interval },
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

    console.log('Session created:', session.id)
    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    console.error('Stripe create error:', e)
    const err = e as { message?: string; type?: string }
    return NextResponse.json({
      error: `E8_STRIPE: ${err.message || err.type || 'unknown'}`
    }, { status: 500 })
  }
}
