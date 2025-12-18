import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.TASK_SERVER_WEBHOOK_SECRET || ''

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true // Skip verification if no secret configured

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// POST: Receive webhook from task server when task is completed
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-webhook-signature') || ''

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET && !verifySignature(payload, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const submission = JSON.parse(payload)
    const supabase = getSupabaseAdmin()

    // Find the task by external_id (our task_queue ID)
    if (submission.external_id) {
      // Get the task first to find the user
      const { data: task, error: fetchError } = await supabase
        .from('task_queue')
        .select('user_id, status')
        .eq('id', submission.external_id)
        .single()

      if (fetchError || !task) {
        console.error('Task not found:', submission.external_id)
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      // Only process if not already submitted/verified
      if (task.status === 'submitted' || task.status === 'verified') {
        return NextResponse.json({ received: true, message: 'Already processed' })
      }

      // Update task status to submitted
      const { error: updateError } = await supabase
        .from('task_queue')
        .update({
          status: 'submitted',
          proof_url: submission.proof_url,
          reddit_account: submission.reddit_account,
          task_code: submission.code,
          worker_id: submission.worker_id,
          submitted_at: submission.submitted_at,
        })
        .eq('id', submission.external_id)

      if (updateError) {
        console.error('Failed to update task:', updateError)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }

      // Deduct 1 credit from user's comments_remaining
      const { error: creditError } = await supabase.rpc('decrement_user_credits', {
        p_user_id: task.user_id,
      })

      if (creditError) {
        console.error('Failed to deduct credit:', creditError)
        // Don't fail the webhook, just log it
      }

      console.log(`Task ${submission.external_id} completed, credit deducted for user ${task.user_id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
