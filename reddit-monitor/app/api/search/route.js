import { ApifyClient } from 'apify-client';
import { NextResponse } from 'next/server';

const client = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

export async function POST(request) {
  try {
    const { keywords, subreddits, maxResults = 50 } = await request.json();
    
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'Keywords required' }, { status: 400 });
    }

    // Build search queries - search for each keyword
    const searchTerms = Array.isArray(keywords) ? keywords : [keywords];
    
    const run = await client.actor('practicaltools/apify-reddit-api').call({
      searches: searchTerms,
      sort: 'new',
      time: 'week',
      maxItems: maxResults,
      skipComments: true,
      skipCommunity: true,
      skipUserPosts: true,
    });

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Filter and format results
    const opportunities = items
      .filter(item => item.dataType === 'post')
      .map(item => ({
        id: item.id || item.parsedId,
        title: item.title,
        url: item.url,
        subreddit: item.communityName || item.parsedCommunityName || 'unknown',
        score: item.upVotes || 0,
        numComments: item.numberOfComments || 0,
        createdAt: item.createdAt,
        body: item.body?.substring(0, 300) || '',
      }))
      // Filter by subreddits if specified
      .filter(item => {
        if (!subreddits || subreddits.length === 0) return true;
        const sub = item.subreddit.toLowerCase().replace('r/', '');
        return subreddits.some(s => s.toLowerCase().replace('r/', '') === sub);
      })
      // Sort by newest first
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ 
      opportunities,
      count: opportunities.length,
      runId: run.id,
    });
    
  } catch (error) {
    console.error('Apify search error:', error);
    return NextResponse.json({ 
      error: error.message || 'Search failed',
      details: error.toString(),
    }, { status: 500 });
  }
}
