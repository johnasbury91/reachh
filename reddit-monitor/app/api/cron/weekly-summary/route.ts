import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWeeklySummaryEmail } from '@/lib/email-triggers'

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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const results = {
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Get all users with their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, credits, email_preferences')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    for (const profile of profiles || []) {
      try {
        // Check if user wants weekly summaries
        const prefs = profile.email_preferences as { weekly_summary?: boolean } | null
        if (prefs && prefs.weekly_summary === false) {
          results.skipped++
          continue
        }

        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        if (!authUser?.user?.email) continue

        // Get user's project
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, keywords')
          .eq('user_id', profile.id)
          .limit(1)

        const project = projects?.[0]
        if (!project) {
          results.skipped++
          continue
        }

        // Get stats for the week
        const { data: weeklyPosted } = await supabase
          .from('opportunities')
          .select('id', { count: 'exact' })
          .eq('project_id', project.id)
          .eq('status', 'posted')
          .gte('posted_at', oneWeekAgo.toISOString())

        const { data: queuedOpportunities } = await supabase
          .from('opportunities')
          .select('id', { count: 'exact' })
          .eq('project_id', project.id)
          .eq('status', 'queued')

        const { data: totalPosted } = await supabase
          .from('opportunities')
          .select('id, subreddit', { count: 'exact' })
          .eq('project_id', project.id)
          .eq('status', 'posted')

        // Calculate unique subreddits
        const uniqueSubreddits = new Set(totalPosted?.map((o) => o.subreddit) || []).size

        const stats = {
          commentsPosted: weeklyPosted?.length || 0,
          queueCount: queuedOpportunities?.length || 0,
          creditsRemaining: profile.credits || 0,
          totalComments: totalPosted?.length || 0,
          totalSubreddits: uniqueSubreddits,
        }

        // Only send if there was some activity
        if (stats.commentsPosted === 0 && stats.queueCount === 0) {
          results.skipped++
          continue
        }

        await sendWeeklySummaryEmail(
          {
            id: profile.id,
            email: authUser.user.email,
            full_name: profile.full_name,
          },
          project,
          stats
        )

        results.sent++
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
    console.error('Weekly summary cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
