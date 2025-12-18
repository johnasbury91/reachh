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
      const { error } = await supabase
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

      if (error) {
        console.error('Failed to update task:', error)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }

      console.log(`Task ${submission.external_id} marked as submitted`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
