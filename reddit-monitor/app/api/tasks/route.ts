import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List tasks for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('task_queue')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)

    const { data: tasks, error, count } = await query

    if (error) throw error

    return NextResponse.json({ tasks, total: count })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST: Create new task(s)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const tasks = Array.isArray(body) ? body : [body]

    // Validate and prepare tasks
    const preparedTasks = tasks.map(task => {
      if (!task.body || !task.subreddit) {
        throw new Error('body and subreddit are required')
      }

      // Extract subreddit from URL if not provided
      let subreddit = task.subreddit
      if (task.thread_url && !subreddit) {
        const match = task.thread_url.match(/reddit\.com\/r\/([^\/]+)/)
        if (match) subreddit = match[1]
      }

      return {
        user_id: user.id,
        project_id: task.project_id || null,
        type: task.type || 'comment',
        thread_url: task.thread_url || null,
        subreddit,
        thread_title: task.thread_title || null,
        title: task.title || null,
        body: task.body,
        reddit_account: task.reddit_account || null,
        notes: task.notes || null,
        status: 'queued',
      }
    })

    const { data, error } = await supabase
      .from('task_queue')
      .insert(preparedTasks)
      .select()

    if (error) throw error

    return NextResponse.json({ tasks: data })
  } catch (error) {
    console.error('Error creating tasks:', error)
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 })
  }
}
