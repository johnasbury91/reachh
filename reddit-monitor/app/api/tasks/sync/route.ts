import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TASK_SERVER_URL = process.env.TASK_SERVER_URL || 'https://your-task-server.railway.app'
const TASK_SERVER_PASSWORD = process.env.TASK_SERVER_PASSWORD || ''

// POST: Push queued tasks to external task server
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Format tasks for task server (URL | Comment format)
    const taskLines = tasks.map(t => `${t.thread_url} | ${t.body}`).join('\n')

    // Push to task server
    const formData = new URLSearchParams()
    formData.append('project', projectName || `project_${user.id.slice(0, 8)}`)
    formData.append('tasks', taskLines)

    const response = await fetch(`${TASK_SERVER_URL}/admin/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`admin:${TASK_SERVER_PASSWORD}`).toString('base64')}`,
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`Task server returned ${response.status}`)
    }

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

    // Fetch submissions from task server
    const response = await fetch(`${TASK_SERVER_URL}/admin/export`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`admin:${TASK_SERVER_PASSWORD}`).toString('base64')}`,
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

    // Match submissions to tasks by URL
    for (const task of assignedTasks || []) {
      const matchingSubmission = submissions.find((s: any) =>
        s.proof_url && task.thread_url &&
        (s.proof_url.includes(task.thread_url.split('/comments/')[1]?.split('/')[0] || 'nomatch'))
      )

      if (matchingSubmission) {
        await supabase
          .from('task_queue')
          .update({
            status: 'submitted',
            proof_url: matchingSubmission.proof_url,
            task_code: matchingSubmission.code,
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
