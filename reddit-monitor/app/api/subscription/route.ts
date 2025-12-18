import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUBSCRIPTION_PLAN } from '@/lib/stripe'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        subscription_status,
        subscription_plan,
        comments_remaining,
        current_period_end,
        stripe_customer_id
      `)
      .eq('id', user.id)
      .single()

    const isActive = profile?.subscription_status === 'active'
    const isPastDue = profile?.subscription_status === 'past_due'

    return NextResponse.json({
      isSubscribed: isActive || isPastDue,
      status: profile?.subscription_status || 'none',
      plan: isActive ? SUBSCRIPTION_PLAN : null,
      commentsRemaining: profile?.comments_remaining || 0,
      commentsTotal: SUBSCRIPTION_PLAN.commentsPerMonth,
      currentPeriodEnd: profile?.current_period_end,
      hasCustomer: !!profile?.stripe_customer_id,
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 })
  }
}
