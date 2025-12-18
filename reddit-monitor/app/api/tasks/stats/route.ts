import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Task statistics for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts by status
    const { data: tasks, error } = await supabase
      .from('task_queue')
      .select('status, type')
      .eq('user_id', user.id)

    if (error) throw error

    const stats = {
      total: tasks.length,
      byStatus: {
        queued: 0,
        assigned: 0,
        submitted: 0,
        verified: 0,
        failed: 0,
        rejected: 0,
      },
      byType: {
        comment: 0,
        post: 0,
      },
    }

    for (const task of tasks) {
      if (stats.byStatus[task.status as keyof typeof stats.byStatus] !== undefined) {
        stats.byStatus[task.status as keyof typeof stats.byStatus]++
      }
      if (stats.byType[task.type as keyof typeof stats.byType] !== undefined) {
        stats.byType[task.type as keyof typeof stats.byType]++
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching task stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
