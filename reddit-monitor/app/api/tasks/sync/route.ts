import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TASK_SERVER_URL = process.env.TASK_SERVER_URL || ''
const TASK_SERVER_API_KEY = process.env.TASK_SERVER_API_KEY || ''

// POST: Push queued tasks to external task server
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!TASK_SERVER_URL || !TASK_SERVER_API_KEY) {
      return NextResponse.json({ error: 'Task server not configured' }, { status: 500 })
    }

    const { taskIds, projectName } = await request.json()

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds array required' }, { status: 400 })
    }

    // Get the tasks
    const { data: tasks, error } = await supabase
      .from('task_queue')
      .select('*')
      .eq('user_id', user.id)
      .in('id', taskIds)
      .eq('status', 'queued')

    if (error) throw error

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ error: 'No queued tasks found' }, { status: 404 })
    }

    // Format tasks for task server API
    const formattedTasks = tasks.map(t => ({
      type: t.type || 'comment',
      url: t.thread_url,
      comment: t.type === 'comment' ? t.body : undefined,
      subreddit: t.subreddit,
      title: t.type === 'post' ? t.title : undefined,
      body: t.type === 'post' ? t.body : undefined,
      external_id: t.id, // Link back to our task_queue ID
      reddit_account: t.reddit_account,
    }))

    // Push to task server via API
    const response = await fetch(`${TASK_SERVER_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TASK_SERVER_API_KEY,
      },
      body: JSON.stringify({
        project: projectName || `reachh_${user.id.slice(0, 8)}`,
        tasks: formattedTasks,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Task server returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    // Update task status to assigned
    await supabase
      .from('task_queue')
      .update({
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .in('id', taskIds)

    return NextResponse.json({
      success: true,
      synced: tasks.length,
      taskServerResponse: result,
    })
  } catch (error) {
    console.error('Task sync error:', error)
    return NextResponse.json({ error: 'Failed to sync tasks' }, { status: 500 })
  }
}

// GET: Pull completed tasks from task server and update status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!TASK_SERVER_URL || !TASK_SERVER_API_KEY) {
      return NextResponse.json({ error: 'Task server not configured' }, { status: 500 })
    }

    // Fetch submissions from task server via API
    const response = await fetch(`${TASK_SERVER_URL}/api/submissions`, {
      headers: {
        'X-API-Key': TASK_SERVER_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Task server returned ${response.status}`)
    }

    const data = await response.json()
    const submissions = data.submissions || []

    // Get assigned tasks for this user
    const { data: assignedTasks, error } = await supabase
      .from('task_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'assigned')

    if (error) throw error

    let updatedCount = 0

    // Match submissions to tasks by external_id
    for (const task of assignedTasks || []) {
      const matchingSubmission = submissions.find((s: { external_id?: string }) =>
        s.external_id === task.id
      )

      if (matchingSubmission) {
        await supabase
          .from('task_queue')
          .update({
            status: 'submitted',
            proof_url: matchingSubmission.proof_url,
            task_code: matchingSubmission.code,
            reddit_account: matchingSubmission.reddit_account,
            worker_id: matchingSubmission.worker_id,
            submitted_at: matchingSubmission.submitted_at,
          })
          .eq('id', task.id)

        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    })
  } catch (error) {
    console.error('Task pull error:', error)
    return NextResponse.json({ error: 'Failed to pull tasks' }, { status: 500 })
  }
}
