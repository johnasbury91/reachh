'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseCommaSeparated } from '@/lib/utils'
import type { Project } from '@/lib/types'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [projectName, setProjectName] = useState('')
  const [keywordsInput, setKeywordsInput] = useState('')
  const [subredditsInput, setSubredditsInput] = useState('')

  const MAX_KEYWORDS = 5

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()

        if (data.project) {
          setProject(data.project)
          setProjectName(data.project.name)
          setKeywordsInput(data.project.keywords.join(', '))
          setSubredditsInput(data.project.subreddits?.join(', ') || '')
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

  const handleSave = async () => {
    if (!project) return

    const keywords = parseCommaSeparated(keywordsInput)
    if (keywords.length === 0) {
      setError('Please enter at least one keyword')
      return
    }

    if (keywords.length > MAX_KEYWORDS) {
      setError(`Maximum ${MAX_KEYWORDS} keywords allowed`)
      return
    }

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const subreddits = parseCommaSeparated(subredditsInput)

      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          name: projectName.trim(),
          keywords,
          subreddits,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data = await response.json()
      setProject(data.project)
      setSuccess('Settings saved!')

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const currentKeywordCount = parseCommaSeparated(keywordsInput).length

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
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-gray-800/50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-800 text-gray-400">1</div>
            <div className="flex-1">
              <p className="font-medium text-white">Find Opportunities</p>
              <p className="text-xs text-gray-500">Discover threads to comment on</p>
            </div>
          </Link>

          {/* Step 2: Comment */}
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-gray-800/50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-800 text-gray-400">2</div>
            <div className="flex-1">
              <p className="font-medium text-white">To Comment</p>
              <p className="text-xs text-gray-500">Your team's to-do list</p>
            </div>
          </Link>

          {/* Step 3: Done */}
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-gray-800/50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-800 text-gray-400">3</div>
            <div className="flex-1">
              <p className="font-medium text-white">Done</p>
              <p className="text-xs text-gray-500">Completed comments</p>
            </div>
          </Link>

          <div className="pt-4 mt-4 border-t border-gray-800">
            <div
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-gray-800/70 border border-gray-700"
            >
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium text-orange-500">Settings</span>
            </div>
          </div>
        </nav>

        {/* Keywords Usage Card */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-sm font-medium text-white mb-3">Keywords</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Used</span>
              <span className="text-sm font-semibold text-orange-400">{project?.keywords.length || 0} / {MAX_KEYWORDS}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${((project?.keywords.length || 0) / MAX_KEYWORDS) * 100}%` }}
              />
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
              <h1 className="text-2xl font-semibold text-white">Settings</h1>
              <p className="text-gray-500 mt-1">Manage your project configuration and account</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl space-y-6">
            {/* Project Settings */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Project Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Update your brand and search configuration</p>
              </div>

              <div className="p-6 space-y-5">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {success}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Brand Name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Keywords
                    </label>
                    <span className={`text-xs ${currentKeywordCount > MAX_KEYWORDS ? 'text-red-400' : 'text-gray-500'}`}>
                      {currentKeywordCount} / {MAX_KEYWORDS}
                    </span>
                  </div>
                  <textarea
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    placeholder="best electric scooter, budget scooter, scooter recommendation"
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />

                  {/* Keyword Tips */}
                  <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                    <p className="text-sm font-medium text-orange-400 mb-2">Tips for better keywords:</p>
                    <ul className="text-xs text-gray-400 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong className="text-gray-300">Use question phrases:</strong> "best [product]", "looking for [product]", "[product] recommendation"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong className="text-gray-300">Include problems you solve:</strong> "how to fix [problem]", "help with [issue]"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong className="text-gray-300">Add comparison terms:</strong> "[product] vs", "[product] alternative", "similar to [competitor]"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">✗</span>
                        <span><strong className="text-gray-300">Avoid single words:</strong> Too broad, use 2-4 word phrases for better matches</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Subreddits <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={subredditsInput}
                    onChange={(e) => setSubredditsInput(e.target.value)}
                    placeholder="r/ElectricScooters, r/scooters, r/micromobility"
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Leave empty to search all of Reddit, or specify subreddits to focus on.
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>

            {/* Account */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Account</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Sign out</p>
                    <p className="text-sm text-gray-500 mt-1">Sign out of your Reachh account</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-all"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
