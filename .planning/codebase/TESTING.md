# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- Not configured - No test framework installed

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
# No test scripts defined in package.json
```

## Test File Organization

**Location:**
- No test files present in the source code

**Naming:**
- Not applicable (no tests exist)

**Structure:**
```
# No test directory structure exists
```

## Current Testing Status

**Project has no automated tests.** The `package.json` contains only:
- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`

No test-related dependencies are installed.

## Test Infrastructure Gaps

**Missing dependencies:**
- No Jest, Vitest, or other test runner
- No React Testing Library
- No Playwright or Cypress for E2E
- No test utilities or mocking libraries

**Missing configuration:**
- No `jest.config.js` or `vitest.config.ts`
- No test scripts in `package.json`
- No test directories or files

## Recommended Test Setup

If tests are added, the following patterns are recommended based on the codebase:

**Suggested Framework:** Vitest (compatible with Next.js, fast, modern)

**Suggested Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Suggested Config (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

## Suggested Test Patterns

**Unit Tests for Utilities:**
```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatDistanceToNow, parseCommaSeparated, cn } from '@/lib/utils'

describe('formatDistanceToNow', () => {
  it('returns "Just now" for very recent dates', () => {
    const now = new Date()
    expect(formatDistanceToNow(now)).toBe('Just now')
  })

  it('returns hours ago for dates within 24 hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(formatDistanceToNow(twoHoursAgo)).toBe('2h ago')
  })
})

describe('parseCommaSeparated', () => {
  it('parses comma-separated strings', () => {
    expect(parseCommaSeparated('a, b, c')).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty input', () => {
    expect(parseCommaSeparated('')).toEqual([])
  })
})
```

**Component Tests:**
```typescript
// components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

**API Route Tests:**
```typescript
// app/api/projects/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'project-1', name: 'Test' },
        error: null,
      }),
    })),
  })),
}))

describe('GET /api/projects', () => {
  it('returns project for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/projects')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project).toBeDefined()
  })
})
```

## Mocking Patterns

**External Services to Mock:**
- Supabase client (`@/lib/supabase/server`, `@/lib/supabase/client`)
- Stripe client (`@/lib/stripe`)
- Apify client (`apify-client`)
- Google AI (`@google/generative-ai`)
- Resend email (`resend`)

**Mock Examples:**
```typescript
// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => mockStripeInstance),
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
  },
}))

// Mock fetch for client components
global.fetch = vi.fn()
```

**What to Mock:**
- Database calls (Supabase)
- Payment processing (Stripe)
- External API calls (Apify, Google AI)
- Email sending (Resend)

**What NOT to Mock:**
- Pure utility functions
- React hooks behavior
- Component rendering

## Fixtures and Factories

**Suggested Test Data:**
```typescript
// test/fixtures/users.ts
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

// test/fixtures/projects.ts
export const mockProject = {
  id: 'project-123',
  user_id: 'user-123',
  name: 'Test Project',
  keywords: ['test keyword', 'another keyword'],
  subreddits: ['r/test'],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// test/fixtures/opportunities.ts
export const mockOpportunity = {
  id: 'opp-123',
  project_id: 'project-123',
  reddit_id: 'abc123',
  url: 'https://reddit.com/r/test/comments/abc123',
  title: 'Test Thread',
  body: 'Test body',
  subreddit: 'r/test',
  score: 100,
  num_comments: 50,
  status: 'new' as const,
}
```

**Location:**
- Suggest `test/fixtures/` or `__tests__/fixtures/`

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured
```

**Suggested Coverage Setup:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, pure utilities
- Files: `lib/utils.ts`, `lib/stripe.ts` helpers

**Integration Tests:**
- Scope: API routes with mocked dependencies
- Files: `app/api/*/route.ts`

**Component Tests:**
- Scope: UI components in isolation
- Files: `components/ui/*.tsx`, `components/*.tsx`

**E2E Tests:**
- Framework: Not used
- Suggested: Playwright for critical user flows
- Priority flows: Login, onboarding, dashboard interactions

## Priority Test Coverage

**High Priority (if adding tests):**
1. `lib/utils.ts` - Pure functions, easy to test
2. `lib/stripe.ts` - Critical payment logic
3. `components/ui/Button.tsx` - Reusable, high usage
4. `app/api/projects/route.ts` - Core CRUD operations
5. `app/api/subscription/route.ts` - Payment-related

**Medium Priority:**
1. `app/api/tasks/route.ts` - Task queue logic
2. `app/api/search/route.ts` - Search filtering logic
3. `components/OpportunityCard.tsx` - Key UI component

**Low Priority (complex, may need E2E instead):**
1. `app/dashboard/page.tsx` - Large, stateful page
2. `app/api/stripe/webhook/route.ts` - Webhook handling

---

*Testing analysis: 2026-01-18*
