import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called when user visits dashboard to track activity
export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update last active timestamp
    await supabase
      .from('user_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Activity tracking error:', error)
    return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
  }
}
