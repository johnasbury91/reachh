import { NextRequest, NextResponse } from 'next/server'
import { ApifyClient } from 'apify-client'
import { createClient } from '@/lib/supabase/server'

const apify = new ApifyClient({
  token: process.env.APIFY_API_KEY,
})

// Check if a post matches any of the keywords
function postMatchesKeywords(post: { title: string; body: string }, keywords: string[]): boolean {
  const searchText = `${post.title} ${post.body}`.toLowerCase()

  return keywords.some(keyword => {
    // Split keyword into words and check if all words appear in the text
    const keywordWords = keyword.toLowerCase().trim().split(/\s+/)
    return keywordWords.every(word => searchText.includes(word))
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keywords, subreddits, maxResults = 50 } = await request.json()

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'Keywords required' }, { status: 400 })
    }

    console.log('Searching with keywords:', keywords)

    // Call Apify Reddit scraper with proper search format
    // Each keyword should be searched as a phrase
    const searchQueries = keywords.map((k: string) => `"${k.trim()}"`)

    const run = await apify.actor('practicaltools/apify-reddit-api').call({
      searches: searchQueries,
      sort: 'relevance',
      time: 'month',
      maxItems: maxResults * 2, // Get more to filter
      skipComments: true,
      skipCommunity: true,
      skipUserPosts: true,
      searchType: 'posts',
    })

    const { items } = await apify.dataset(run.defaultDatasetId).listItems()

    console.log(`Got ${items.length} raw results from Apify`)

    // Filter and transform results
    const opportunities = items
      .filter((item: any) => item.dataType === 'post')
      .map((item: any) => ({
        id: item.id || item.parsedId || `${Date.now()}-${Math.random()}`,
        url: item.url,
        title: item.title || 'Untitled',
        body: item.body?.substring(0, 300) || '',
        subreddit: item.communityName || `r/${item.parsedCommunityName}` || 'r/unknown',
        score: item.upVotes || 0,
        numComments: item.numberOfComments || 0,
        createdAt: item.createdAt || new Date().toISOString(),
      }))
      // Filter to only posts that actually match keywords
      .filter((item: any) => postMatchesKeywords(item, keywords))
      // Filter by subreddit if specified
      .filter((item: any) => {
        if (!subreddits || subreddits.length === 0) return true
        const sub = item.subreddit.toLowerCase().replace('r/', '')
        return subreddits.some((s: string) =>
          s.toLowerCase().replace('r/', '') === sub
        )
      })
      .slice(0, maxResults)

    console.log(`Returning ${opportunities.length} filtered results`)

    return NextResponse.json({ opportunities, count: opportunities.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
