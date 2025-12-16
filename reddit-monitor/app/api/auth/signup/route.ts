import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email-triggers'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if welcome email was already sent
    const { data: existingLog } = await supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_type', 'welcome')
      .single()

    if (existingLog) {
      return NextResponse.json({ message: 'Welcome email already sent' })
    }

    // Send welcome email
    await sendWelcomeEmail({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json({ error: 'Failed to process signup' }, { status: 500 })
  }
}
