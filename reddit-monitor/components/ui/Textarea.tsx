import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm text-gray-400">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
          text-white placeholder-gray-500
          focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
          resize-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
