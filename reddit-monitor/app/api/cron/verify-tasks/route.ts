import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for cron job
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const APIFY_API_KEY = process.env.APIFY_API_KEY

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    // Get all submitted tasks awaiting verification
    const { data: tasks, error } = await supabase
      .from('task_queue')
      .select('*')
      .eq('status', 'submitted')
      .not('proof_url', 'is', null)
      .limit(100) // Process in batches

    if (error) throw error

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: 'No tasks to verify', verified: 0 })
    }

    console.log(`Verifying ${tasks.length} tasks...`)

    // Group tasks by proof URL domain for efficient scraping
    const redditUrls = tasks
      .filter(t => t.proof_url?.includes('reddit.com'))
      .map(t => t.proof_url)

    if (redditUrls.length === 0) {
      return NextResponse.json({ message: 'No Reddit URLs to verify', verified: 0 })
    }

    // Call Apify to scrape the proof URLs
    let scrapedData: Record<string, any> = {}

    if (APIFY_API_KEY && redditUrls.length > 0) {
      try {
        // Use Reddit Comment Scraper actor
        const actorResponse = await fetch(
          `https://api.apify.com/v2/acts/trudax~reddit-comment-scraper/runs?token=${APIFY_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              urls: redditUrls,
              maxComments: 1, // We only need to verify the comment exists
            }),
          }
        )

        if (actorResponse.ok) {
          const runData = await actorResponse.json()
          const runId = runData.data?.id

          // Wait for completion (with timeout)
          let attempts = 0
          const maxAttempts = 30 // 5 minutes max

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)) // 10s between checks

            const statusResponse = await fetch(
              `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
            )
            const statusData = await statusResponse.json()

            if (statusData.data?.status === 'SUCCEEDED') {
              // Get results
              const datasetResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
              )
              const results = await datasetResponse.json()

              // Index by URL
              for (const item of results) {
                if (item.url) {
                  scrapedData[item.url] = item
                }
              }
              break
            } else if (statusData.data?.status === 'FAILED') {
              console.error('Apify scrape failed')
              break
            }

            attempts++
          }
        }
      } catch (scrapeError) {
        console.error('Scraping error:', scrapeError)
        // Continue with manual verification fallback
      }
    }

    // Process each task
    let verifiedCount = 0
    let rejectedCount = 0

    for (const task of tasks) {
      const scraped = scrapedData[task.proof_url]

      if (scraped) {
        // Verify the comment/post exists and matches
        const isValid = verifyTask(task, scraped)

        if (isValid) {
          await supabase
            .from('task_queue')
            .update({
              status: 'verified',
              verified_at: new Date().toISOString(),
              verification_data: scraped,
              upvotes: scraped.score || scraped.upvotes || 0,
            })
            .eq('id', task.id)

          verifiedCount++

          // Update reddit account stats
          if (task.reddit_account) {
            await supabase.rpc('increment_account_tasks', {
              p_user_id: task.user_id,
              p_username: task.reddit_account,
              p_success: true,
            })
          }
        } else {
          await supabase
            .from('task_queue')
            .update({
              status: 'rejected',
              rejection_reason: 'Content mismatch or deleted',
              verification_data: scraped,
            })
            .eq('id', task.id)

          rejectedCount++
        }
      } else {
        // Could not scrape - mark for manual review or retry
        // For now, leave as submitted for next run
        console.log(`Could not verify task ${task.id} - URL: ${task.proof_url}`)
      }
    }

    return NextResponse.json({
      message: 'Verification complete',
      total: tasks.length,
      verified: verifiedCount,
      rejected: rejectedCount,
    })
  } catch (error) {
    console.error('Verification cron error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

function verifyTask(task: any, scraped: any): boolean {
  // Basic verification checks

  // 1. Check if content exists (not deleted)
  if (scraped.removed || scraped.deleted) {
    return false
  }

  // 2. Check if the body/text roughly matches (allow for minor edits)
  const taskBody = task.body?.toLowerCase().trim() || ''
  const scrapedBody = (scraped.body || scraped.selftext || scraped.text || '').toLowerCase().trim()

  if (taskBody.length > 0 && scrapedBody.length > 0) {
    // Simple similarity check - at least 50% of words should match
    const taskWordsArr = taskBody.split(/\s+/).filter((w: string) => w.length > 3)
    const scrapedWordsSet = new Set(scrapedBody.split(/\s+/).filter((w: string) => w.length > 3))

    let matchCount = 0
    for (const word of taskWordsArr) {
      if (scrapedWordsSet.has(word)) matchCount++
    }

    const similarity = taskWordsArr.length > 0 ? matchCount / taskWordsArr.length : 0
    if (similarity < 0.5) { // At least 50% match
      return false
    }
  }

  // 3. If reddit account specified, verify author matches
  if (task.reddit_account && scraped.author) {
    if (task.reddit_account.toLowerCase() !== scraped.author.toLowerCase()) {
      return false
    }
  }

  return true
}
