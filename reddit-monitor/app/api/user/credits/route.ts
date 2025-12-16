import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_PACKAGES } from '@/lib/stripe'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    // Get purchase history
    const { data: purchases } = await supabase
      .from('credit_purchases')
      .select('id, credits, amount, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      credits: profile?.credits || 0,
      packages: CREDIT_PACKAGES,
      recentPurchases: purchases || [],
    })
  } catch (error) {
    console.error('Get credits error:', error)
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 })
  }
}
