export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  keywords: string[]
  subreddits: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  project_id: string
  reddit_id: string
  url: string
  title: string
  body: string | null
  subreddit: string
  score: number
  num_comments: number
  reddit_created_at: string | null
  found_at: string
  status: 'new' | 'queued' | 'requested' | 'writing' | 'posted' | 'rejected'
  comment_url: string | null
}

export interface RedditSearchResult {
  id: string
  url: string
  title: string
  body: string
  subreddit: string
  score: number
  numComments: number
  createdAt: string
}
