import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCommentPostedEmail } from '@/lib/email-triggers'

// GET - List opportunities
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
    }

    return NextResponse.json({ opportunities: data || [] })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Add opportunity to queue
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, opportunity } = await request.json()

    if (!projectId || !opportunity) {
      return NextResponse.json({ error: 'Project ID and opportunity required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('opportunities')
      .upsert({
        project_id: projectId,
        reddit_id: opportunity.id,
        url: opportunity.url,
        title: opportunity.title,
        body: opportunity.body || '',
        subreddit: opportunity.subreddit,
        score: opportunity.score || 0,
        num_comments: opportunity.numComments || 0,
        reddit_created_at: opportunity.createdAt,
        status: 'queued',
      }, {
        onConflict: 'project_id,reddit_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Upsert error:', error)
      return NextResponse.json({ error: 'Failed to add opportunity' }, { status: 500 })
    }

    return NextResponse.json({ opportunity: data })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Update opportunity status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status, commentUrl } = await request.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (commentUrl) {
      updateData.comment_url = commentUrl
    }
    if (status === 'posted') {
      updateData.posted_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
    }

    // Send email notification when comment is posted
    if (status === 'posted' && data) {
      try {
        // Get user profile for credits
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('credits')
          .eq('id', user.id)
          .single()

        await sendCommentPostedEmail(
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name,
          },
          {
            id: data.id,
            title: data.title,
            subreddit: data.subreddit,
            url: data.url,
            comment_url: data.comment_url,
            score: data.score,
          },
          profile?.credits || 0
        )
      } catch (emailError) {
        // Non-blocking - log error but don't fail the request
        console.error('Failed to send comment posted email:', emailError)
      }
    }

    return NextResponse.json({ opportunity: data })
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove opportunity from queue
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
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
