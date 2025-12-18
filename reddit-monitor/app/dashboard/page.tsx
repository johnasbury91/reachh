'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, Opportunity, RedditSearchResult } from '@/lib/types'

type View = 'opportunities' | 'to-comment' | 'done' | 'tracking'

type Task = {
  id: string
  type: 'comment' | 'post'
  thread_url: string
  subreddit: string
  thread_title: string | null
  body: string
  title: string | null
  status: string
  reddit_account: string | null
  proof_url: string | null
  verified_at: string | null
  rejection_reason: string | null
  created_at: string
  submitted_at: string | null
  upvotes: number | null
  notes: string | null
}

type TaskStats = {
  total: number
  byStatus: {
    queued: number
    assigned: number
    submitted: number
    verified: number
    failed: number
    rejected: number
  }
  byType: {
    comment: number
    post: number
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

type Subscription = {
  isSubscribed: boolean
  status: string
  commentsRemaining: number
  commentsTotal: number
  currentPeriodEnd: string | null
  hasCustomer: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<View>('opportunities')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Subscription
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  // Data
  const [opportunities, setOpportunities] = useState<RedditSearchResult[]>([])
  const [toComment, setToComment] = useState<Opportunity[]>([])
  const [done, setDone] = useState<Opportunity[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Task tracking
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [taskFilter, setTaskFilter] = useState<string>('all')
  const [tasksLoading, setTasksLoading] = useState(false)

  // Filters
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'comments'>('score')

  const MAX_KEYWORDS = 5

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()

        if (data.project) {
          setProject(data.project)
          // Show welcome for new users
          const hasSeenWelcome = localStorage.getItem('reachh_welcome_seen')
          if (!hasSeenWelcome) {
            setShowWelcome(true)
          }
        } else {
          router.push('/onboarding')
        }
      } catch (error) {
        console.error('Failed to load project:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [router])

  // Load opportunities from DB
  const loadSavedOpportunities = useCallback(async () => {
    if (!project) return
    try {
      const [toCommentRes, doneRes] = await Promise.all([
        fetch(`/api/opportunities?projectId=${project.id}&status=queued`),
        fetch(`/api/opportunities?projectId=${project.id}&status=posted`),
      ])
      const toCommentData = await toCommentRes.json()
      const doneData = await doneRes.json()
      setToComment(toCommentData.opportunities || [])
      setDone(doneData.opportunities || [])
    } catch (error) {
      console.error('Failed to load:', error)
    }
  }, [project])

  useEffect(() => {
    if (project) loadSavedOpportunities()
  }, [project, loadSavedOpportunities])

  // Load subscription status
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const response = await fetch('/api/subscription')
        const data = await response.json()
        setSubscription(data)
      } catch (error) {
        console.error('Failed to load subscription:', error)
      }
    }
    loadSubscription()
  }, [])

  // Load tasks when tracking view is active
  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`/api/tasks${taskFilter !== 'all' ? `?status=${taskFilter}` : ''}`),
        fetch('/api/tasks/stats'),
      ])
      const tasksData = await tasksRes.json()
      const statsData = await statsRes.json()
      setTasks(tasksData.tasks || [])
      setTaskStats(statsData.stats || null)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setTasksLoading(false)
    }
  }, [taskFilter])

  useEffect(() => {
    if (activeView === 'tracking') {
      loadTasks()
    }
  }, [activeView, loadTasks])

  // Handle subscribe
  const handleSubscribe = async () => {
    setSubscriptionLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro_monthly' }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert('Failed to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to connect to payment system. Please try again.')
    } finally {
      setSubscriptionLoading(false)
    }
  }

  // Handle manage subscription
  const handleManageSubscription = async () => {
    setSubscriptionLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setSubscriptionLoading(false)
    }
  }

  // Search Reddit
  const findOpportunities = async () => {
    if (!project || project.keywords.length === 0) return
    setSearchLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: project.keywords,
          subreddits: project.subreddits,
          maxResults: 50,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        const existingIds = new Set([...toComment, ...done].map(o => o.reddit_id))
        const newOps = (data.opportunities || []).filter(
          (t: RedditSearchResult) => !existingIds.has(t.id)
        )
        setOpportunities(newOps)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // Auto-search on load
  useEffect(() => {
    if (project && project.keywords.length > 0 && opportunities.length === 0) {
      findOpportunities()
    }
  }, [project])

  // Add to comment list
  const handleAddToCommentList = async (thread: RedditSearchResult) => {
    if (!project) return
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, opportunity: thread }),
      })
      if (response.ok) {
        const data = await response.json()
        setToComment(prev => [data.opportunity, ...prev])
        setOpportunities(prev => prev.filter(t => t.id !== thread.id))
      }
    } catch (error) {
      console.error('Failed:', error)
    }
  }

  // Mark as done
  const handleMarkDone = async (opp: Opportunity) => {
    try {
      const response = await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, status: 'posted' }),
      })
      if (response.ok) {
        const data = await response.json()
        setToComment(prev => prev.filter(o => o.id !== opp.id))
        setDone(prev => [data.opportunity, ...prev])
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Failed:', error)
    }
  }

  // Skip/remove
  const handleSkip = async (opp: Opportunity) => {
    try {
      await fetch(`/api/opportunities?id=${opp.id}`, { method: 'DELETE' })
      setToComment(prev => prev.filter(o => o.id !== opp.id))
    } catch (error) {
      console.error('Failed:', error)
    }
  }

  // Sort opportunities
  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score
    if (sortBy === 'comments') return b.numComments - a.numComments
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Dismiss welcome
  const dismissWelcome = () => {
    localStorage.setItem('reachh_welcome_seen', 'true')
    setShowWelcome(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-800 flex flex-col bg-gray-900/30 h-screen sticky top-0">
        <div className="p-5 border-b border-gray-800">
          <a href="https://reachh.com" className="text-lg font-semibold text-white hover:opacity-80 transition-opacity">
            reachh
          </a>
        </div>

        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/50 rounded-xl">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 font-bold">
              {project?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{project?.name}</p>
              <p className="text-xs text-gray-500">{project?.keywords.length} keywords</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {/* Step 1: Find */}
          <button
            onClick={() => setActiveView('opportunities')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
              activeView === 'opportunities'
                ? 'bg-orange-500/10 border border-orange-500/30'
                : 'hover:bg-gray-800/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              activeView === 'opportunities' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>1</div>
            <div className="flex-1">
              <p className={`font-medium ${activeView === 'opportunities' ? 'text-orange-500' : 'text-white'}`}>
                Find Opportunities
              </p>
              <p className="text-xs text-gray-500">Discover threads to comment on</p>
            </div>
            {opportunities.length > 0 && (
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-medium">
                {opportunities.length}
              </span>
            )}
          </button>

          {/* Step 2: Comment */}
          <button
            onClick={() => setActiveView('to-comment')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
              activeView === 'to-comment'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'hover:bg-gray-800/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              activeView === 'to-comment' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>2</div>
            <div className="flex-1">
              <p className={`font-medium ${activeView === 'to-comment' ? 'text-blue-400' : 'text-white'}`}>
                To Comment
              </p>
              <p className="text-xs text-gray-500">Your team's to-do list</p>
            </div>
            {toComment.length > 0 && (
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                {toComment.length}
              </span>
            )}
          </button>

          {/* Step 3: Done */}
          <button
            onClick={() => setActiveView('done')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
              activeView === 'done'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'hover:bg-gray-800/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              activeView === 'done' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>3</div>
            <div className="flex-1">
              <p className={`font-medium ${activeView === 'done' ? 'text-green-400' : 'text-white'}`}>
                Done
              </p>
              <p className="text-xs text-gray-500">Completed comments</p>
            </div>
            {done.length > 0 && (
              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                {done.length}
              </span>
            )}
          </button>

          {/* Task Tracking */}
          <button
            onClick={() => setActiveView('tracking')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
              activeView === 'tracking'
                ? 'bg-purple-500/10 border border-purple-500/30'
                : 'hover:bg-gray-800/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeView === 'tracking' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`font-medium ${activeView === 'tracking' ? 'text-purple-400' : 'text-white'}`}>
                Task Tracking
              </p>
              <p className="text-xs text-gray-500">Outsourced comments</p>
            </div>
            {taskStats && taskStats.byStatus.submitted > 0 && (
              <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full font-medium">
                {taskStats.byStatus.submitted}
              </span>
            )}
          </button>

          <div className="pt-4 mt-4 border-t border-gray-800">
            <Link
              href="/settings"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </Link>
          </div>
        </nav>

        {/* Keywords Card */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Keywords</p>
              <Link
                href="/settings"
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Edit
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {project?.keywords.slice(0, 3).map((kw, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded-md truncate max-w-[100px]">
                  {kw}
                </span>
              ))}
              {(project?.keywords.length || 0) > 3 && (
                <span className="text-xs px-2 py-1 text-gray-500">
                  +{(project?.keywords.length || 0) - 3} more
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Used</span>
              <span className="text-xs font-medium text-gray-400">{project?.keywords.length || 0} / {MAX_KEYWORDS}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all"
                style={{ width: `${((project?.keywords.length || 0) / MAX_KEYWORDS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="p-4 pt-0">
          {subscription?.isSubscribed ? (
            <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 rounded-xl p-4 border border-green-700/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-green-400">Pro Plan</p>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Comments this month</span>
                <span className="text-sm font-semibold text-white">
                  {subscription.commentsRemaining} / {subscription.commentsTotal}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(subscription.commentsRemaining / subscription.commentsTotal) * 100}%` }}
                />
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={subscriptionLoading}
                className="w-full text-xs text-gray-400 hover:text-white transition-colors"
              >
                {subscriptionLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 rounded-xl p-4 border border-orange-700/50">
              <p className="text-sm font-medium text-white mb-2">Upgrade to Pro</p>
              <p className="text-xs text-gray-400 mb-3">250 comments/month for $499</p>
              <button
                onClick={handleSubscribe}
                disabled={subscriptionLoading}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {subscriptionLoading ? 'Loading...' : 'Subscribe Now'}
              </button>
            </div>
          )}
        </div>

        {/* Progress Card */}
        <div className="p-4 pt-0">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm font-medium text-white mb-3">Your Progress</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Opportunities found</span>
                <span className="text-sm font-semibold text-orange-400">{opportunities.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Waiting to comment</span>
                <span className="text-sm font-semibold text-blue-400">{toComment.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Comments posted</span>
                <span className="text-sm font-semibold text-green-400">{done.length}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-800 px-8 py-5 bg-gray-900/20">
          <div className="flex items-center justify-between">
            <div>
              {activeView === 'opportunities' && (
                <>
                  <h1 className="text-2xl font-semibold text-white">Find Opportunities</h1>
                  <p className="text-gray-500 mt-1">
                    These Reddit threads match your keywords. Add the best ones to your comment list.
                  </p>
                </>
              )}
              {activeView === 'to-comment' && (
                <>
                  <h1 className="text-2xl font-semibold text-white">To Comment</h1>
                  <p className="text-gray-500 mt-1">
                    Your team's to-do list. Open each thread, write a helpful comment, then mark as done.
                  </p>
                </>
              )}
              {activeView === 'done' && (
                <>
                  <h1 className="text-2xl font-semibold text-white">Done</h1>
                  <p className="text-gray-500 mt-1">
                    Comments you've posted. Nice work!
                  </p>
                </>
              )}
              {activeView === 'tracking' && (
                <>
                  <h1 className="text-2xl font-semibold text-white">Task Tracking</h1>
                  <p className="text-gray-500 mt-1">
                    Track outsourced comments and posts from your task server.
                  </p>
                </>
              )}
            </div>

            {activeView === 'opportunities' && (
              <button
                onClick={findOpportunities}
                disabled={searchLoading || !project?.keywords.length}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium btn-lift"
              >
                {searchLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find New Threads
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            {/* OPPORTUNITIES VIEW */}
            {activeView === 'opportunities' && (
              <motion.div
                key="opportunities"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* No keywords */}
                {project && project.keywords.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Set up your keywords first</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Add keywords like "best [your product]" or "[your product] review" so we can find relevant Reddit threads.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-all"
                    >
                      Add Keywords
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}

                {/* Loading */}
                {searchLoading && opportunities.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Searching Reddit...</h3>
                    <p className="text-gray-500">Finding threads that match your keywords</p>
                  </div>
                )}

                {/* Results */}
                {sortedOpportunities.length > 0 && (
                  <>
                    {/* Sort controls */}
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400">
                        <span className="text-white font-semibold">{sortedOpportunities.length}</span> threads found
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="score">Most Upvotes</option>
                          <option value="comments">Most Comments</option>
                          <option value="recent">Most Recent</option>
                        </select>
                      </div>
                    </div>

                    {/* Thread cards */}
                    <div className="space-y-4">
                      {sortedOpportunities.map((thread, index) => (
                        <motion.div
                          key={thread.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-background-card border border-gray-800 rounded-2xl p-5 card-hover group"
                        >
                          <div className="flex gap-5">
                            {/* Stats */}
                            <div className="flex flex-col items-center gap-1 py-2 px-3 bg-gray-800/50 rounded-xl min-w-[70px]">
                              <span className="text-lg font-bold text-white">{formatNumber(thread.score)}</span>
                              <span className="text-xs text-gray-500">upvotes</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-orange-400">{thread.subreddit}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-sm text-gray-500">{formatTimeAgo(thread.createdAt)}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-sm text-gray-500">{thread.numComments} comments</span>
                              </div>

                              <h3 className="text-lg font-medium text-white mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
                                {thread.title}
                              </h3>

                              {thread.body && (
                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">{thread.body}</p>
                              )}

                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleAddToCommentList(thread)}
                                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium btn-lift"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add to Comment List
                                </button>
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium btn-lift"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Preview Thread
                                </a>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Nudge to comment list */}
                    {toComment.length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-blue-400">Ready to comment?</p>
                              <p className="text-sm text-blue-400/70">You have {toComment.length} thread{toComment.length !== 1 ? 's' : ''} in your comment list</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveView('to-comment')}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
                          >
                            Go to Comment List
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Empty state */}
                {!searchLoading && (project?.keywords?.length ?? 0) > 0 && sortedOpportunities.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No new threads found</h3>
                    <p className="text-gray-400 mb-6">Try different keywords or check back later for new opportunities</p>
                    <button
                      onClick={findOpportunities}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-all"
                    >
                      Search Again
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* TO COMMENT VIEW */}
            {activeView === 'to-comment' && (
              <motion.div
                key="to-comment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {toComment.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Your comment list is empty</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Find interesting threads and add them here. Your team can then work through this list.
                    </p>
                    <button
                      onClick={() => setActiveView('opportunities')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-all"
                    >
                      Find Opportunities
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Instructions */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-blue-400">How this works</p>
                          <p className="text-sm text-blue-400/70 mt-1">
                            1. Click "Open Thread" to view the Reddit post<br/>
                            2. Write a helpful, authentic comment that mentions your product naturally<br/>
                            3. Click "Mark as Done" when you've posted your comment
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Thread list */}
                    <div className="space-y-4">
                      {toComment.map((opp, index) => (
                        <motion.div
                          key={opp.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-background-card border border-gray-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-orange-400">{opp.subreddit}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-sm text-gray-500">{formatNumber(opp.score || 0)} upvotes</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-sm text-gray-500">{opp.num_comments || 0} comments</span>
                              </div>
                              <h3 className="text-lg font-medium text-white mb-4 line-clamp-2">
                                {opp.title}
                              </h3>
                              <div className="flex items-center gap-3">
                                <a
                                  href={opp.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium btn-lift"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Open Thread
                                </a>
                                <button
                                  onClick={() => handleMarkDone(opp)}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium btn-lift"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Mark as Done
                                </button>
                                <button
                                  onClick={() => handleSkip(opp)}
                                  className="px-4 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg font-medium transition-all"
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* DONE VIEW */}
            {activeView === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {done.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No comments posted yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Once you post comments on Reddit and mark them as done, they'll appear here.
                    </p>
                    <button
                      onClick={() => setActiveView('to-comment')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
                    >
                      View Comment List
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Success banner */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-green-400">{done.length} comment{done.length !== 1 ? 's' : ''} posted!</p>
                          <p className="text-sm text-green-400/70">Great work engaging with your community</p>
                        </div>
                      </div>
                    </div>

                    {/* Completed list */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                      <div className="p-5 border-b border-gray-800">
                        <h3 className="font-semibold text-white">Completed Comments</h3>
                      </div>
                      <div className="divide-y divide-gray-800">
                        {done.map((opp) => (
                          <div key={opp.id} className="p-5 flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white line-clamp-1">{opp.title}</p>
                              <p className="text-sm text-gray-500 mt-1">{opp.subreddit}</p>
                            </div>
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              View thread →
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TRACKING VIEW */}
            {activeView === 'tracking' && (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats Cards */}
                {taskStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-sm text-gray-500">Queued</p>
                      <p className="text-2xl font-bold text-yellow-400">{taskStats.byStatus.queued}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-sm text-gray-500">Assigned</p>
                      <p className="text-2xl font-bold text-blue-400">{taskStats.byStatus.assigned}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-sm text-gray-500">Submitted</p>
                      <p className="text-2xl font-bold text-purple-400">{taskStats.byStatus.submitted}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-sm text-gray-500">Verified</p>
                      <p className="text-2xl font-bold text-green-400">{taskStats.byStatus.verified}</p>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Filter:</span>
                    <select
                      value={taskFilter}
                      onChange={(e) => setTaskFilter(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Tasks</option>
                      <option value="queued">Queued</option>
                      <option value="assigned">Assigned</option>
                      <option value="submitted">Submitted</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <button
                    onClick={loadTasks}
                    disabled={tasksLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium"
                  >
                    {tasksLoading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Refresh
                  </button>
                </div>

                {/* Loading */}
                {tasksLoading && tasks.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Loading tasks...</h3>
                  </div>
                )}

                {/* Empty state */}
                {!tasksLoading && tasks.length === 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No tasks yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Tasks from your outsourced comment queue will appear here once you start using the task server.
                    </p>
                  </div>
                )}

                {/* Task Table */}
                {tasks.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subreddit</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  task.type === 'comment'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {task.type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-orange-400">{task.subreddit}</span>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <p className="text-sm text-white truncate" title={task.body}>
                                  {task.body.substring(0, 50)}{task.body.length > 50 ? '...' : ''}
                                </p>
                                {task.thread_url && (
                                  <a
                                    href={task.thread_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-gray-400"
                                  >
                                    View thread →
                                  </a>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-400">{task.reddit_account || '—'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  task.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                                  task.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                                  task.status === 'submitted' ? 'bg-purple-500/20 text-purple-400' :
                                  task.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                                  task.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {task.status}
                                </span>
                                {task.rejection_reason && (
                                  <p className="text-xs text-red-400 mt-1">{task.rejection_reason}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-500">{formatTimeAgo(task.created_at)}</span>
                              </td>
                              <td className="px-4 py-3">
                                {task.proof_url ? (
                                  <a
                                    href={task.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-purple-400 hover:text-purple-300"
                                  >
                                    View
                                  </a>
                                ) : (
                                  <span className="text-sm text-gray-600">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to Reachh!</h2>
                  <p className="text-gray-400">Here's how to get customers from Reddit in 3 simple steps</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium text-white">Find Opportunities</p>
                      <p className="text-sm text-gray-400">We search Reddit for threads where people are looking for products like yours</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium text-white">Add to Comment List</p>
                      <p className="text-sm text-gray-400">Pick the best threads and add them to your team's to-do list</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium text-white">Post & Track</p>
                      <p className="text-sm text-gray-400">Write helpful comments, mark as done, and watch your traffic grow</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={dismissWelcome}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-all"
                >
                  Let's Go!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Comment marked as done!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
