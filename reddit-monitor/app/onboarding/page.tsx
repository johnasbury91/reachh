'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const SUGGESTED_SUBREDDITS: Record<string, string[]> = {
  saas: ['r/SaaS', 'r/startups', 'r/Entrepreneur', 'r/smallbusiness', 'r/marketing'],
  ecommerce: ['r/ecommerce', 'r/dropship', 'r/FulfillmentByAmazon', 'r/shopify', 'r/Entrepreneur'],
  tech: ['r/technology', 'r/gadgets', 'r/tech', 'r/hardware', 'r/software'],
  fitness: ['r/fitness', 'r/bodybuilding', 'r/running', 'r/weightlifting', 'r/homegym'],
  finance: ['r/personalfinance', 'r/investing', 'r/financialindependence', 'r/stocks', 'r/CryptoCurrency'],
  food: ['r/food', 'r/Cooking', 'r/recipes', 'r/MealPrepSunday', 'r/EatCheapAndHealthy'],
  gaming: ['r/gaming', 'r/pcgaming', 'r/Games', 'r/GameDeals', 'r/IndieGaming'],
  default: ['r/Entrepreneur', 'r/startups', 'r/smallbusiness', 'r/marketing', 'r/business'],
}

// Fallback keyword generator if AI fails
function generateFallbackKeywords(brandName: string, description: string): string[] {
  const words = description.toLowerCase().split(/\s+/)
  const suggestions: string[] = []

  const meaningfulWords = words.filter(w =>
    w.length > 4 &&
    !['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when', 'where', 'which', 'would', 'could', 'should', 'about'].includes(w)
  )

  meaningfulWords.slice(0, 3).forEach(word => {
    suggestions.push(`best ${word}`)
    suggestions.push(`${word} recommendation`)
    suggestions.push(`${word} for beginners`)
  })

  return Array.from(new Set(suggestions)).slice(0, 8)
}

function detectCategory(description: string): string {
  const text = description.toLowerCase()
  if (text.includes('software') || text.includes('saas') || text.includes('app') || text.includes('platform')) return 'saas'
  if (text.includes('shop') || text.includes('store') || text.includes('ecommerce') || text.includes('product')) return 'ecommerce'
  if (text.includes('tech') || text.includes('device') || text.includes('gadget')) return 'tech'
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout') || text.includes('health')) return 'fitness'
  if (text.includes('money') || text.includes('finance') || text.includes('invest') || text.includes('crypto')) return 'finance'
  if (text.includes('food') || text.includes('recipe') || text.includes('cook') || text.includes('meal')) return 'food'
  if (text.includes('game') || text.includes('gaming') || text.includes('play')) return 'gaming'
  return 'default'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [brandName, setBrandName] = useState('')
  const [description, setDescription] = useState('')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState('')
  const [suggestedSubreddits, setSuggestedSubreddits] = useState<string[]>([])
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([])
  const [searchAllReddit, setSearchAllReddit] = useState(true)

  const handleStep1Continue = async () => {
    if (!brandName.trim()) {
      setError('Please enter your brand or product name')
      return
    }
    if (!description.trim()) {
      setError('Please describe your product or service')
      return
    }

    setError('')
    setGenerating(true)

    try {
      // Call AI to generate keyword suggestions
      const response = await fetch('/api/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brandName.trim(), description: description.trim() }),
      })

      let keywords: string[] = []

      if (response.ok) {
        const data = await response.json()
        keywords = data.keywords || []
      }

      // Fallback if AI fails or returns nothing
      if (keywords.length === 0) {
        keywords = generateFallbackKeywords(brandName, description)
      }

      setSuggestedKeywords(keywords)

      const category = detectCategory(description)
      setSuggestedSubreddits(SUGGESTED_SUBREDDITS[category] || SUGGESTED_SUBREDDITS.default)

      setStep(2)
    } catch (err) {
      console.error('Failed to generate keywords:', err)
      // Use fallback on error
      const keywords = generateFallbackKeywords(brandName, description)
      setSuggestedKeywords(keywords)

      const category = detectCategory(description)
      setSuggestedSubreddits(SUGGESTED_SUBREDDITS[category] || SUGGESTED_SUBREDDITS.default)

      setStep(2)
    } finally {
      setGenerating(false)
    }
  }

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(prev => prev.filter(k => k !== keyword))
    } else if (selectedKeywords.length < 5) {
      setSelectedKeywords(prev => [...prev, keyword])
    }
  }

  const addCustomKeyword = () => {
    if (customKeyword.trim() && selectedKeywords.length < 5 && !selectedKeywords.includes(customKeyword.trim())) {
      setSelectedKeywords(prev => [...prev, customKeyword.trim()])
      setCustomKeyword('')
    }
  }

  const toggleSubreddit = (subreddit: string) => {
    if (selectedSubreddits.includes(subreddit)) {
      setSelectedSubreddits(prev => prev.filter(s => s !== subreddit))
    } else {
      setSelectedSubreddits(prev => [...prev, subreddit])
    }
  }

  const handleStep2Continue = () => {
    if (selectedKeywords.length === 0) {
      setError('Please select at least one keyword')
      return
    }
    setError('')
    setStep(3)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName.trim(),
          keywords: selectedKeywords,
          subreddits: searchAllReddit ? [] : selectedSubreddits,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      setStep(4) // Success step
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 px-6 py-4">
        <a href="https://reachh.com" className="text-lg font-semibold text-white hover:opacity-80 transition-opacity">
          reachh
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Progress bar */}
          {step < 4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>Step {step} of 3</span>
                <span>{step === 1 ? 'Tell us about your brand' : step === 2 ? 'Choose keywords' : 'Target subreddits'}</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      i <= step ? 'bg-orange-500' : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Brand Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    Let's set up your monitoring
                  </h1>
                  <p className="text-gray-400">
                    Tell us about your brand so we can suggest the best keywords to track.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Brand or product name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      placeholder="e.g. Acme Scooters"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      What does your product or service do?
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                      placeholder="e.g. We sell premium electric scooters for urban commuters looking for eco-friendly transportation"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This helps us suggest relevant keywords to monitor
                    </p>
                  </div>

                  <button
                    onClick={handleStep1Continue}
                    disabled={generating}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating suggestions...
                      </>
                    ) : (
                      <>
                        Continue
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Keywords */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    Choose your keywords
                  </h1>
                  <p className="text-gray-400">
                    Select 3-5 keywords to monitor. We'll find Reddit posts matching these.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Selected keywords */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Selected keywords
                    </label>
                    <span className={`text-sm ${selectedKeywords.length >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                      {selectedKeywords.length}/5
                    </span>
                  </div>
                  <div className="min-h-[52px] bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex flex-wrap gap-2">
                    {selectedKeywords.length === 0 ? (
                      <span className="text-gray-500 text-sm">Click keywords below to add them</span>
                    ) : (
                      selectedKeywords.map(keyword => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg text-sm"
                        >
                          {keyword}
                          <button
                            onClick={() => toggleKeyword(keyword)}
                            className="hover:text-orange-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Suggested keywords */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Suggested keywords
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedKeywords.map(keyword => (
                      <button
                        key={keyword}
                        onClick={() => toggleKeyword(keyword)}
                        disabled={selectedKeywords.length >= 5 && !selectedKeywords.includes(keyword)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedKeywords.includes(keyword)
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom keyword */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add custom keyword
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomKeyword()}
                      className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="Type a keyword..."
                      disabled={selectedKeywords.length >= 5}
                    />
                    <button
                      onClick={addCustomKeyword}
                      disabled={!customKeyword.trim() || selectedKeywords.length >= 5}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStep2Continue}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Subreddits */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    Where should we look?
                  </h1>
                  <p className="text-gray-400">
                    Choose specific subreddits or let us search all of Reddit.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Search all Reddit option */}
                <div className="mb-6">
                  <button
                    onClick={() => setSearchAllReddit(true)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      searchAllReddit
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        searchAllReddit ? 'border-orange-500' : 'border-gray-600'
                      }`}>
                        {searchAllReddit && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">Search all of Reddit</p>
                        <p className="text-sm text-gray-400">Find opportunities across the entire platform</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <button
                    onClick={() => setSearchAllReddit(false)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      !searchAllReddit
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !searchAllReddit ? 'border-orange-500' : 'border-gray-600'
                      }`}>
                        {!searchAllReddit && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">Target specific subreddits</p>
                        <p className="text-sm text-gray-400">Focus on communities most relevant to you</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Subreddit selection */}
                {!searchAllReddit && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Recommended for your niche
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSubreddits.map(subreddit => (
                        <button
                          key={subreddit}
                          onClick={() => toggleSubreddit(subreddit)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedSubreddits.includes(subreddit)
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          {subreddit}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Summary */}
                <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Your monitoring setup:</p>
                  <div className="space-y-1">
                    <p className="text-white"><span className="text-gray-400">Brand:</span> {brandName}</p>
                    <p className="text-white"><span className="text-gray-400">Keywords:</span> {selectedKeywords.join(', ')}</p>
                    <p className="text-white">
                      <span className="text-gray-400">Scope:</span>{' '}
                      {searchAllReddit ? 'All of Reddit' : selectedSubreddits.join(', ') || 'All of Reddit'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Start Monitoring
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h1 className="text-2xl font-semibold text-white mb-2">You're all set!</h1>
                <p className="text-gray-400">Taking you to your dashboard...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
