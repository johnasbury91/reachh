import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TASK_SERVER_URL = process.env.TASK_SERVER_URL || ''
const TASK_SERVER_API_KEY = process.env.TASK_SERVER_API_KEY || ''

// POST: Create task and auto-push to task server
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user has credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('comments_remaining, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.comments_remaining <= 0) {
      return NextResponse.json({
        error: 'No credits remaining. Please upgrade your plan.'
      }, { status: 402 })
    }

    const body = await request.json()
    const {
      type = 'comment',
      thread_url,
      subreddit,
      thread_title,
      title,        // for posts
      comment_text, // the comment or post body
      project_id,
      project_name,
    } = body

    if (!comment_text || !subreddit) {
      return NextResponse.json({ error: 'comment_text and subreddit required' }, { status: 400 })
    }

    if (type === 'comment' && !thread_url) {
      return NextResponse.json({ error: 'thread_url required for comments' }, { status: 400 })
    }

    // Create task in our database
    const { data: task, error: createError } = await supabase
      .from('task_queue')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        type,
        thread_url: thread_url || null,
        subreddit,
        thread_title: thread_title || null,
        title: type === 'post' ? title : null,
        body: comment_text,
        status: 'queued',
      })
      .select()
      .single()

    if (createError || !task) {
      console.error('Failed to create task:', createError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Auto-push to task server if configured
    if (TASK_SERVER_URL && TASK_SERVER_API_KEY) {
      try {
        const taskForServer = {
          type,
          url: thread_url,
          comment: type === 'comment' ? comment_text : undefined,
          subreddit,
          title: type === 'post' ? title : undefined,
          body: type === 'post' ? comment_text : undefined,
          external_id: task.id,
        }

        const response = await fetch(`${TASK_SERVER_URL}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': TASK_SERVER_API_KEY,
          },
          body: JSON.stringify({
            project: project_name || `reachh_${user.id.slice(0, 8)}`,
            tasks: [taskForServer],
          }),
        })

        if (response.ok) {
          // Update status to assigned
          await supabase
            .from('task_queue')
            .update({
              status: 'assigned',
              assigned_at: new Date().toISOString(),
            })
            .eq('id', task.id)

          task.status = 'assigned'
        } else {
          console.error('Task server push failed:', await response.text())
          // Task stays as 'queued', can retry later
        }
      } catch (pushError) {
        console.error('Task server push error:', pushError)
        // Task stays as 'queued', can retry later
      }
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Queue task error:', error)
    return NextResponse.json({ error: 'Failed to queue task' }, { status: 500 })
  }
}

// PATCH: Edit a task (only if not yet filled/submitted)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, comment_text, title } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Get task and verify ownership + status
    const { data: task, error: fetchError } = await supabase
      .from('task_queue')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Can only edit if not yet submitted/verified
    if (task.status === 'submitted' || task.status === 'verified') {
      return NextResponse.json({
        error: 'Cannot edit task that has been completed'
      }, { status: 400 })
    }

    // Update task
    const updates: Record<string, unknown> = {}
    if (comment_text !== undefined) updates.body = comment_text
    if (title !== undefined) updates.title = title

    const { data: updated, error: updateError } = await supabase
      .from('task_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // TODO: If task is already pushed to task server, update it there too
    // For now, edits only work locally (task server will use original)

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error('Edit task error:', error)
    return NextResponse.json({ error: 'Failed to edit task' }, { status: 500 })
  }
}

// DELETE: Cancel a task (only if not yet submitted)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Get task and verify ownership + status
    const { data: task } = await supabase
      .from('task_queue')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status === 'submitted' || task.status === 'verified') {
      return NextResponse.json({
        error: 'Cannot cancel completed task'
      }, { status: 400 })
    }

    // Delete task
    await supabase
      .from('task_queue')
      .delete()
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel task error:', error)
    return NextResponse.json({ error: 'Failed to cancel task' }, { status: 500 })
  }
}
