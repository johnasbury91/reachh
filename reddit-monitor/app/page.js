'use client';

import { useState, useEffect } from 'react';

// Default project config
const DEFAULT_PROJECT = {
  name: 'Dharm',
  keywords: ['best electric scooter', 'offroad electric scooter', 'budget electric scooter'],
  subreddits: ['r/ElectricScooters', 'r/scooters', 'r/electricvehicles'],
};

export default function Dashboard() {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [opportunities, setOpportunities] = useState([]);
  const [queue, setQueue] = useState([]);
  const [posted, setPosted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [searchKeywords, setSearchKeywords] = useState(DEFAULT_PROJECT.keywords.join(', '));

  // Load saved data from localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem('reddit-monitor-queue');
    const savedPosted = localStorage.getItem('reddit-monitor-posted');
    const savedProject = localStorage.getItem('reddit-monitor-project');
    
    if (savedQueue) setQueue(JSON.parse(savedQueue));
    if (savedPosted) setPosted(JSON.parse(savedPosted));
    if (savedProject) {
      const proj = JSON.parse(savedProject);
      setProject(proj);
      setSearchKeywords(proj.keywords.join(', '));
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('reddit-monitor-queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('reddit-monitor-posted', JSON.stringify(posted));
  }, [posted]);

  useEffect(() => {
    localStorage.setItem('reddit-monitor-project', JSON.stringify(project));
  }, [project]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const keywords = searchKeywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          subreddits: project.subreddits,
          maxResults: 100,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }
      
      // Filter out already queued/posted
      const queueUrls = new Set(queue.map(q => q.url));
      const postedUrls = new Set(posted.map(p => p.url));
      
      const newOpportunities = data.opportunities.filter(
        opp => !queueUrls.has(opp.url) && !postedUrls.has(opp.url)
      );
      
      setOpportunities(newOpportunities);
      
      // Update project keywords
      setProject(prev => ({ ...prev, keywords }));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = (opportunity) => {
    const queueItem = {
      ...opportunity,
      addedAt: new Date().toISOString(),
      status: 'pending',
    };
    setQueue(prev => [...prev, queueItem]);
    setOpportunities(prev => prev.filter(o => o.id !== opportunity.id));
  };

  const removeFromQueue = (id) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const markAsPosted = (queueItem, commentUrl) => {
    const postedItem = {
      ...queueItem,
      commentUrl,
      postedAt: new Date().toISOString(),
      status: 'posted',
    };
    setPosted(prev => [postedItem, ...prev]);
    setQueue(prev => prev.filter(q => q.id !== queueItem.id));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg"></div>
            <span className="font-semibold text-lg">Reddit Monitor</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">{project.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Queue: <span className="text-white">{queue.length}</span>
            </span>
            <span className="text-gray-500">
              Posted: <span className="text-green-400">{posted.length}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {['search', 'queue', 'posted'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'queue' && queue.length > 0 && (
                <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {queue.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Form */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Find Opportunities</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={searchKeywords}
                    onChange={(e) => setSearchKeywords(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    placeholder="best electric scooter, budget scooter..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Target Subreddits</label>
                  <div className="flex flex-wrap gap-2">
                    {project.subreddits.map(sub => (
                      <span key={sub} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Search Reddit'
                  )}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Results */}
            {opportunities.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold">Found {opportunities.length} opportunities</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {opportunities.map(opp => (
                    <div key={opp.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <a
                            href={opp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-white hover:text-orange-400 transition-colors line-clamp-2"
                          >
                            {opp.title}
                          </a>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="text-orange-400">{opp.subreddit}</span>
                            <span>↑ {opp.score}</span>
                            <span>💬 {opp.numComments}</span>
                            <span>{formatDate(opp.createdAt)}</span>
                          </div>
                          {opp.body && (
                            <p className="text-gray-500 text-sm mt-2 line-clamp-2">{opp.body}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addToQueue(opp)}
                          className="shrink-0 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          + Queue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Comment Queue ({queue.length})</h3>
            </div>
            {queue.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No items in queue. Search and add opportunities first.
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {queue.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onRemove={() => removeFromQueue(item.id)}
                    onMarkPosted={(url) => markAsPosted(item, url)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Posted Tab */}
        {activeTab === 'posted' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Posted Comments ({posted.length})</h3>
            </div>
            {posted.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No comments posted yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {posted.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-white hover:text-orange-400 transition-colors line-clamp-1"
                        >
                          {item.title}
                        </a>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="text-orange-400">{item.subreddit}</span>
                          <span>Posted {formatDate(item.postedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.commentUrl && (
                          <a
                            href={item.commentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                          >
                            View Comment
                          </a>
                        )}
                        <span className="text-green-400">✓</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Queue Item Component with inline comment URL input
function QueueItem({ item, onRemove, onMarkPosted, formatDate }) {
  const [showInput, setShowInput] = useState(false);
  const [commentUrl, setCommentUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentUrl.trim()) {
      onMarkPosted(commentUrl.trim());
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:text-orange-400 transition-colors line-clamp-2"
          >
            {item.title}
          </a>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="text-orange-400">{item.subreddit}</span>
            <span>↑ {item.score}</span>
            <span>💬 {item.numComments}</span>
            <span>Added {formatDate(item.addedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Open ↗
          </a>
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Mark Posted
            </button>
          ) : null}
          <button
            onClick={onRemove}
            className="text-gray-500 hover:text-red-400 p-2 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      
      {showInput && (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="url"
            value={commentUrl}
            onChange={(e) => setCommentUrl(e.target.value)}
            placeholder="Paste comment URL..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            autoFocus
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
            className="text-gray-500 hover:text-white px-3 py-2 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
