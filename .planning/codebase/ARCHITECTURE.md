# Architecture

**Analysis Date:** 2026-01-18

## Pattern Overview

**Overall:** Next.js 14 App Router SaaS Application with Supabase Backend

**Key Characteristics:**
- Server-side rendering with client-side interactivity (`'use client'` directives)
- API routes handle all backend logic as serverless functions
- Supabase for authentication, database, and row-level security
- External service integrations (Stripe, Apify, Gemini AI, Resend)
- Middleware-based route protection

## Layers

**Presentation Layer:**
- Purpose: React components that render UI and handle user interactions
- Location: `reddit-monitor/app/*/page.tsx`, `reddit-monitor/components/`
- Contains: Page components, UI components, client-side state management
- Depends on: API routes via fetch(), Supabase client for auth
- Used by: Next.js routing system

**API Layer:**
- Purpose: Serverless API endpoints handling all business logic
- Location: `reddit-monitor/app/api/**/route.ts`
- Contains: RESTful handlers (GET, POST, PATCH, DELETE), validation, authorization
- Depends on: Supabase server client, external services (Stripe, Apify, Gemini)
- Used by: Frontend via fetch(), external webhooks (Stripe)

**Data Access Layer:**
- Purpose: Supabase client abstraction for database and auth operations
- Location: `reddit-monitor/lib/supabase/`
- Contains: Browser client (`client.ts`), Server client (`server.ts`)
- Depends on: @supabase/ssr package, environment variables
- Used by: All pages and API routes

**Service Layer:**
- Purpose: Business logic helpers and external integrations
- Location: `reddit-monitor/lib/`
- Contains: Stripe integration (`stripe.ts`), Email services (`email.ts`, `email-triggers.ts`), Utilities (`utils.ts`)
- Depends on: External APIs (Stripe, Resend)
- Used by: API routes

**Database Layer:**
- Purpose: PostgreSQL database via Supabase with RLS policies
- Location: `reddit-monitor/supabase/migrations/`
- Contains: SQL migrations, table definitions, RLS policies
- Depends on: Supabase infrastructure
- Used by: Data access layer

## Data Flow

**User Authentication Flow:**

1. User submits login/signup form at `app/login/page.tsx` or `app/signup/page.tsx`
2. Supabase Auth handles OAuth/Magic Link via `app/auth/callback/route.ts`
3. Middleware (`middleware.ts`) validates session on protected routes
4. Supabase SSR manages cookies for session persistence
5. Protected routes redirect to `/login` if unauthenticated

**Reddit Opportunity Discovery Flow:**

1. Dashboard (`app/dashboard/page.tsx`) calls `POST /api/search`
2. Search API (`app/api/search/route.ts`) authenticates user
3. Apify client queries Reddit API with user keywords
4. Results filtered by keyword matching and subreddit
5. Frontend displays opportunities, user adds to queue
6. `POST /api/opportunities` saves to database with status `queued`

**Comment Generation and Task Queue Flow:**

1. User clicks "Generate Comment" on dashboard
2. `POST /api/generate-comments` sends post context to Gemini AI
3. AI generates Reddit-style comments in JSON format
4. User edits and clicks "Queue to Task Server"
5. `POST /api/tasks/queue` creates task in `task_queue` table
6. Task auto-pushed to external task server if configured
7. Credits deducted from `user_profiles.comments_remaining`

**Subscription and Payment Flow:**

1. User clicks subscribe on dashboard
2. `POST /api/stripe/checkout` creates Stripe Checkout session
3. User redirected to Stripe, completes payment
4. Stripe webhook hits `POST /api/stripe/webhook`
5. Webhook updates `user_profiles` with subscription status
6. User redirected to `/dashboard?subscription=success`

**State Management:**
- Local: React `useState` for UI state, `useCallback` for memoization
- Server: Supabase database as source of truth
- Session: Supabase Auth cookies managed via middleware
- No global state library (Redux, Zustand) - each page fetches own data

## Key Abstractions

**Supabase Clients:**
- Purpose: Two client types for different execution contexts
- Examples: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server)
- Pattern: Lazy initialization with placeholder fallbacks for build-time

**API Route Handlers:**
- Purpose: Consistent pattern for all API endpoints
- Examples: `app/api/projects/route.ts`, `app/api/opportunities/route.ts`
- Pattern: Auth check -> Validate input -> Business logic -> Supabase query -> JSON response

**Type Definitions:**
- Purpose: TypeScript interfaces for domain entities
- Examples: `lib/types.ts` - Profile, Project, Opportunity, RedditSearchResult
- Pattern: Matches Supabase table schemas

**Stripe Integration:**
- Purpose: Lazy-loaded Stripe instance with plan configuration
- Examples: `lib/stripe.ts`
- Pattern: Singleton with getter, plan constants exported

## Entry Points

**Application Root:**
- Location: `app/layout.tsx`
- Triggers: All page loads
- Responsibilities: HTML structure, fonts, metadata, Google Analytics

**Authentication Gateway:**
- Location: `app/page.tsx`
- Triggers: Root URL access
- Responsibilities: Auth check, redirect to dashboard or landing page

**Dashboard:**
- Location: `app/dashboard/page.tsx`
- Triggers: `/dashboard` navigation
- Responsibilities: Main application UI, opportunity discovery, task management

**API Endpoints:**
- Location: `app/api/**/route.ts`
- Triggers: Frontend fetch calls, external webhooks
- Responsibilities: All server-side business logic

**Middleware:**
- Location: `middleware.ts`
- Triggers: All non-static requests
- Responsibilities: Auth session refresh, route protection

**Cron Jobs:**
- Location: `app/api/cron/*/route.ts`
- Triggers: Vercel cron or external scheduler
- Responsibilities: Weekly summaries, task verification, user engagement emails

## Error Handling

**Strategy:** Try-catch with structured error responses

**Patterns:**
- API routes return `{ error: string }` with appropriate HTTP status
- Console logging for debugging, no error tracking service visible
- Frontend displays errors via state and conditional rendering
- Non-blocking email errors (logged but don't fail requests)

**Error Response Format:**
```typescript
// Success
{ data: any }

// Error
{ error: 'Error message' }
// with status: 400 (validation), 401 (auth), 402 (payment), 500 (server)
```

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log` and `console.error` throughout codebase
- No structured logging library
- Request/response logging in API routes for debugging

**Validation:**
- Approach: Manual validation in API route handlers
- No schema validation library (Zod, Yup)
- Type assertions via TypeScript

**Authentication:**
- Approach: Supabase Auth with SSR cookie management
- Middleware validates session on protected paths
- Admin bypass via `ADMIN_EMAILS` environment variable

**Rate Limiting:**
- Approach: Implicit via Supabase RLS and credit system
- No explicit rate limiting middleware
- Apify calls include delays between batches

---

*Architecture analysis: 2026-01-18*
