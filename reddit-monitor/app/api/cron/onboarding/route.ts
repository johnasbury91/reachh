import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendOnboardingDay1Email,
  sendOnboardingDay2Email,
  sendOnboardingDay4Email,
  sendOnboardingDay7Email,
  sendOnboardingDay14Email,
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
      day1: 0,
      day2: 0,
      day4: 0,
      day7: 0,
      day14: 0,
      errors: [] as string[],
    }

    // Get all users with their profiles and projects
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        created_at,
        onboarding_completed
      `)
      .eq('onboarding_completed', false)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    for (const profile of users || []) {
      try {
        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        if (!authUser?.user?.email) continue

        const user = {
          id: profile.id,
          email: authUser.user.email,
          full_name: profile.full_name,
        }

        // Get user's project
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, keywords')
          .eq('user_id', profile.id)
          .limit(1)

        const project = projects?.[0] || { id: '', name: 'Your Project', keywords: [] }

        // Calculate days since signup
        const signupDate = new Date(profile.created_at)
        const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))

        // Check which emails have already been sent
        const { data: sentEmails } = await supabase
          .from('email_logs')
          .select('email_type')
          .eq('user_id', profile.id)
          .in('email_type', [
            'onboarding_day_1',
            'onboarding_day_2',
            'onboarding_day_4',
            'onboarding_day_7',
            'onboarding_day_14',
          ])

        const sentTypes = new Set(sentEmails?.map((e) => e.email_type) || [])

        // Send appropriate onboarding email based on days since signup
        if (daysSinceSignup >= 1 && !sentTypes.has('onboarding_day_1')) {
          await sendOnboardingDay1Email(user, project)
          results.day1++
        } else if (daysSinceSignup >= 2 && !sentTypes.has('onboarding_day_2')) {
          await sendOnboardingDay2Email(user, project)
          results.day2++
        } else if (daysSinceSignup >= 4 && !sentTypes.has('onboarding_day_4')) {
          await sendOnboardingDay4Email(user)
          results.day4++
        } else if (daysSinceSignup >= 7 && !sentTypes.has('onboarding_day_7')) {
          await sendOnboardingDay7Email(user)
          results.day7++
        } else if (daysSinceSignup >= 14 && !sentTypes.has('onboarding_day_14')) {
          await sendOnboardingDay14Email(user)
          results.day14++

          // Mark onboarding as completed after day 14 email
          await supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('id', profile.id)
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
    console.error('Onboarding cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
