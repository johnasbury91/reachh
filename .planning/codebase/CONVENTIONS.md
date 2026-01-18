# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- React components: PascalCase (`OpportunityCard.tsx`, `Button.tsx`)
- API routes: `route.ts` in nested directories following Next.js App Router conventions
- Utilities/helpers: camelCase (`utils.ts`, `stripe.ts`, `email.ts`)
- Types: camelCase (`types.ts`)
- Supabase clients: descriptive names (`client.ts`, `server.ts`)

**Functions:**
- React components: PascalCase function declarations (`function Button()`, `function OpportunityCard()`)
- Utility functions: camelCase (`formatDistanceToNow`, `parseCommaSeparated`)
- Event handlers: `handle` prefix + action (`handleSubmit`, `handleSave`, `handleLogout`)
- API functions: HTTP method names match function names (`GET`, `POST`, `PATCH`)
- Callbacks: `on` prefix for props (`onAddToQueue`, `onRemove`, `onMarkPosted`)

**Variables:**
- State: camelCase with descriptive names (`loading`, `subscriptionLoading`, `tasksLoading`)
- State setters: `set` prefix matching state name (`setLoading`, `setProject`)
- Boolean state: often uses `is` or loading suffix (`isSubscribed`, `searchLoading`)
- Constants: SCREAMING_SNAKE_CASE for config values (`MAX_KEYWORDS`, `FREE_TRIAL_CREDITS`, `ADMIN_EMAILS`)

**Types:**
- Interfaces: PascalCase (`Profile`, `Project`, `Opportunity`)
- Type aliases: PascalCase (`View`, `Task`, `TaskStats`)
- Props interfaces: ComponentName + `Props` suffix (`ButtonProps`, `InputProps`, `OpportunityCardProps`)

## Code Style

**Formatting:**
- No explicit Prettier or ESLint config in project root
- Implicit formatting follows TypeScript defaults
- 2-space indentation
- Single quotes for strings
- No semicolons at statement ends (consistent across codebase)
- Max line length ~120 characters

**Linting:**
- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- No explicit ESLint configuration (relies on Next.js defaults)
- Type checking via `noEmit: true`

## Import Organization

**Order:**
1. React imports (`import React, { useState, useEffect } from 'react'`)
2. Next.js imports (`import { NextRequest, NextResponse } from 'next/server'`)
3. Third-party libraries (`import { motion, AnimatePresence } from 'framer-motion'`)
4. Internal components (`import { Button } from '@/components/ui/Button'`)
5. Internal utilities/types (`import type { Project } from '@/lib/types'`)

**Path Aliases:**
- `@/*` maps to project root (`@/lib/types`, `@/components/ui/Button`)
- Always use path alias over relative imports for lib/components

**Pattern examples:**
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'
```

## Error Handling

**API Routes:**
- Wrap entire handler in try/catch
- Return structured JSON errors with status codes
- Console.error for server-side logging
- Standard error response format: `{ error: 'Message' }`

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... logic
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error description:', error)
    return NextResponse.json({ error: 'Failed to X' }, { status: 500 })
  }
}
```

**Client Components:**
- Try/catch around async operations
- Set error state for user-facing messages
- Console.error for debugging
- Finally blocks for loading state cleanup

```typescript
const handleAction = async () => {
  setLoading(true)
  try {
    const response = await fetch('/api/endpoint')
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed')
    }
    // success handling
  } catch (error) {
    console.error('Failed:', error)
    setError(error.message || 'An error occurred')
  } finally {
    setLoading(false)
  }
}
```

## Logging

**Framework:** Console (no external logging service)

**Patterns:**
- `console.log` for debug output with descriptive messages
- `console.error` for error conditions with context
- Include relevant data in logs (counts, IDs, states)

```typescript
console.log('Searching with keywords:', keywords)
console.log(`Got ${items.length} raw results from Apify`)
console.error('Webhook signature verification failed:', err)
console.error('Error fetching tasks:', error)
```

## Comments

**When to Comment:**
- Block comments for section headers in large files
- Inline comments for non-obvious logic
- TODO comments for incomplete features (sparingly used)

**Pattern:**
```typescript
// Load project
useEffect(() => { ... }, [router])

// Handle subscription success redirect from Stripe
useEffect(() => { ... }, [loadSubscription])

// TODO: If task is already pushed to task server, update it there too
```

**No JSDoc/TSDoc usage** - Types provide documentation through TypeScript interfaces

## Function Design

**Size:**
- React components: Can be large (500+ lines for page components)
- Utility functions: Small, focused (under 20 lines typically)
- API handlers: Medium size (30-80 lines per HTTP method)

**Parameters:**
- Destructure props in component signatures
- Use TypeScript interfaces for complex parameter types
- Default values in parameter destructuring

```typescript
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...props
}: ButtonProps) {
```

**Return Values:**
- Components return JSX
- API routes return `NextResponse.json()`
- Utilities return simple types or objects
- Early returns for guard clauses

## Module Design

**Exports:**
- Named exports for utilities and components
- Default exports for page components (`export default function DashboardPage()`)
- Type exports with `export interface` or `export type`
- Lazy initialization for expensive clients (`getStripe()`)

**Barrel Files:**
- Not used extensively
- Direct imports preferred over barrel re-exports

## React Patterns

**State Management:**
- Local state with useState for all component state
- No global state library (Redux, Zustand)
- URL state via Next.js router/searchParams

**Data Fetching:**
- Client-side fetch in useEffect
- useCallback for memoized async functions
- Loading/error state pattern

```typescript
const [data, setData] = useState<Type | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  const loadData = async () => {
    try {
      const response = await fetch('/api/endpoint')
      const json = await response.json()
      setData(json.data)
    } catch (error) {
      console.error('Failed:', error)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [dependencies])
```

**Component Structure:**
1. 'use client' directive (if client component)
2. Imports
3. Type definitions (local to component)
4. Helper functions
5. Main component function
6. Export

## Tailwind CSS Patterns

**Class Organization:**
- Layout classes first (flex, grid, w-, h-)
- Spacing (p-, m-, gap-)
- Typography (text-, font-)
- Colors (bg-, text-)
- Borders/rounded
- States (hover:, focus:, disabled:)
- Transitions

**Custom Utilities:**
- Defined in `globals.css` under `@layer utilities`
- Custom CSS variables for theme colors
- Animation classes: `.btn-lift`, `.card-hover`, `.animate-in`

**Color Scheme:**
- Gray scale: gray-950 (darkest) to gray-50 (lightest)
- Accent: orange-500/600 for primary actions
- Semantic: green for success, red for errors/danger, blue for info

---

*Convention analysis: 2026-01-18*
