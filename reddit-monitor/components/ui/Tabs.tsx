import React from 'react'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${activeTab === tab.id
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
