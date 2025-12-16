import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getPackageById } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.reachh.com'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 })
    }

    const creditPackage = getPackageById(packageId)
    if (!creditPackage) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: creditPackage.name,
              description: `${creditPackage.credits} credits for Reachh`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        package_id: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
      success_url: `${APP_URL}/settings?purchase=success`,
      cancel_url: `${APP_URL}/settings?purchase=cancelled`,
    })

    // Create pending purchase record
    await supabase.from('credit_purchases').insert({
      user_id: user.id,
      stripe_payment_intent_id: session.payment_intent as string,
      credits: creditPackage.credits,
      amount: creditPackage.price,
      status: 'pending',
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
