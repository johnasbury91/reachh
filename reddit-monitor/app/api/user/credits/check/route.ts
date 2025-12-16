import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCreditsLowEmail, sendCreditsEmptyEmail } from '@/lib/email-triggers'

const LOW_CREDITS_THRESHOLD = 5
const EMPTY_CREDITS_THRESHOLD = 0

export async function POST() {
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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const credits = profile.credits || 0

    // Get queued opportunities count
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    const projectId = projects?.[0]?.id

    let queueCount = 0
    if (projectId) {
      const { count } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', 'queued')

      queueCount = count || 0
    }

    // Check recent alerts to avoid spamming
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentAlerts } = await supabase
      .from('email_logs')
      .select('email_type')
      .eq('user_id', user.id)
      .in('email_type', ['credits_low', 'credits_empty'])
      .gte('created_at', oneDayAgo)

    const recentTypes = new Set(recentAlerts?.map((a) => a.email_type) || [])

    const userObj = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name,
    }

    // Send appropriate alert
    if (credits <= EMPTY_CREDITS_THRESHOLD && !recentTypes.has('credits_empty')) {
      // Get total stats for empty email
      const { count: totalComments } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!)
        .eq('status', 'posted')

      const { data: postedOpps } = await supabase
        .from('opportunities')
        .select('subreddit')
        .eq('project_id', projectId!)
        .eq('status', 'posted')

      const uniqueSubreddits = new Set(postedOpps?.map((o) => o.subreddit) || []).size

      await sendCreditsEmptyEmail(userObj, totalComments || 0, uniqueSubreddits)

      return NextResponse.json({ alert: 'credits_empty', credits })
    } else if (credits <= LOW_CREDITS_THRESHOLD && credits > EMPTY_CREDITS_THRESHOLD && !recentTypes.has('credits_low')) {
      await sendCreditsLowEmail(userObj, queueCount)

      return NextResponse.json({ alert: 'credits_low', credits })
    }

    return NextResponse.json({ credits, status: 'ok' })
  } catch (error) {
    console.error('Credits check error:', error)
    return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 })
  }
}
