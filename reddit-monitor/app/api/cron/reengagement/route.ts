import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendReengagement30DaysEmail,
  sendReengagement60DaysEmail,
  sendWinback90DaysEmail,
} from '@/lib/email-triggers'

// Use service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const results = {
      day30: 0,
      day60: 0,
      day90: 0,
      errors: [] as string[],
    }

    // Get all users with their last active date
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, last_active_at, created_at')
      .not('last_active_at', 'is', null)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    for (const profile of profiles || []) {
      try {
        const lastActive = new Date(profile.last_active_at || profile.created_at)
        const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

        // Skip if user was active recently (less than 25 days)
        if (daysSinceActive < 25) continue

        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        if (!authUser?.user?.email) continue

        const user = {
          id: profile.id,
          email: authUser.user.email,
          full_name: profile.full_name,
        }

        // Check which re-engagement emails have already been sent
        const { data: sentEmails } = await supabase
          .from('email_logs')
          .select('email_type')
          .eq('user_id', profile.id)
          .in('email_type', ['reengagement_30d', 'reengagement_60d', 'winback_90d'])

        const sentTypes = new Set(sentEmails?.map((e) => e.email_type) || [])

        // Get user's project for 60-day email
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, keywords')
          .eq('user_id', profile.id)
          .limit(1)

        const project = projects?.[0] || { id: '', name: 'Your Project', keywords: [] }

        // Send appropriate re-engagement email
        // 30-day range: 25-35 days
        if (daysSinceActive >= 25 && daysSinceActive < 35 && !sentTypes.has('reengagement_30d')) {
          await sendReengagement30DaysEmail(user)
          results.day30++
        }
        // 60-day range: 55-70 days
        else if (daysSinceActive >= 55 && daysSinceActive < 70 && !sentTypes.has('reengagement_60d')) {
          await sendReengagement60DaysEmail(user, project)
          results.day60++
        }
        // 90-day range: 85-100 days
        else if (daysSinceActive >= 85 && daysSinceActive < 100 && !sentTypes.has('winback_90d')) {
          await sendWinback90DaysEmail(user)
          results.day90++
        }
      } catch (err) {
        results.errors.push(`User ${profile.id}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Re-engagement cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
