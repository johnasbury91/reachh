'use client'

import React from 'react'
import { Button } from './ui/Button'
import { formatDistanceToNow } from '@/lib/utils'
import type { Opportunity, RedditSearchResult } from '@/lib/types'

interface OpportunityCardProps {
  opportunity: Opportunity | RedditSearchResult
  variant: 'search' | 'queue' | 'posted'
  onAddToQueue?: (opp: RedditSearchResult) => void
  onRemove?: (opp: Opportunity) => void
  onMarkPosted?: (opp: Opportunity) => void
  loading?: boolean
}

export function OpportunityCard({
  opportunity,
  variant,
  onAddToQueue,
  onRemove,
  onMarkPosted,
  loading = false,
}: OpportunityCardProps) {
  const isSearchResult = 'numComments' in opportunity
  const numComments = isSearchResult ? opportunity.numComments : opportunity.num_comments
  const createdAt = isSearchResult ? opportunity.createdAt : opportunity.reddit_created_at

  return (
    <div className="p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:text-orange-400 transition-colors line-clamp-2 block"
          >
            {opportunity.title}
          </a>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="text-orange-400">{opportunity.subreddit}</span>
            <span>↑ {opportunity.score}</span>
            <span>{numComments} comments</span>
            {createdAt && <span>{formatDistanceToNow(createdAt)}</span>}
          </div>

          {opportunity.body && (
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">
              {opportunity.body}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {variant === 'search' && onAddToQueue && (
            <Button
              size="sm"
              onClick={() => onAddToQueue(opportunity as RedditSearchResult)}
              loading={loading}
            >
              + Queue
            </Button>
          )}

          {variant === 'queue' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(opportunity.url, '_blank')}
              >
                Open
              </Button>
              {onMarkPosted && (
                <Button
                  size="sm"
                  onClick={() => onMarkPosted(opportunity as Opportunity)}
                  loading={loading}
                >
                  Mark Posted
                </Button>
              )}
              {onRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(opportunity as Opportunity)}
                >
                  ✕
                </Button>
              )}
            </>
          )}

          {variant === 'posted' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(opportunity.url, '_blank')}
              >
                Thread
              </Button>
              {(opportunity as Opportunity).comment_url && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open((opportunity as Opportunity).comment_url!, '_blank')}
                >
                  Comment
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
