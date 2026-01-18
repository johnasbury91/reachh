# Codebase Structure

**Analysis Date:** 2026-01-18

## Directory Layout

```
reddit-monitor/                   # Main Next.js application
├── app/                          # App Router pages and API routes
│   ├── api/                      # API route handlers
│   │   ├── auth/                 # Auth-related endpoints
│   │   ├── cron/                 # Scheduled job endpoints
│   │   ├── opportunities/        # Opportunity CRUD
│   │   ├── projects/             # Project CRUD
│   │   ├── search/               # Reddit search via Apify
│   │   ├── stripe/               # Payment endpoints
│   │   ├── subscription/         # Subscription status
│   │   ├── tasks/                # Task queue management
│   │   ├── user/                 # User data endpoints
│   │   ├── fetch-reddit-post/    # Single post fetching
│   │   ├── generate-comments/    # AI comment generation
│   │   └── suggest-keywords/     # AI keyword suggestions
│   ├── auth/                     # Auth callback route
│   ├── dashboard/                # Main application view
│   ├── generator/                # Comment generator tool
│   ├── login/                    # Login page
│   ├── onboarding/               # New user onboarding
│   ├── settings/                 # Project settings
│   ├── signup/                   # Signup page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root redirect logic
│   └── not-found.tsx             # 404 page
├── components/                   # Reusable React components
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Spinner.tsx
│   │   ├── Tabs.tsx
│   │   └── Textarea.tsx
│   ├── Header.tsx
│   ├── OpportunityCard.tsx
│   └── Sidebar.tsx
├── lib/                          # Shared utilities and services
│   ├── supabase/                 # Supabase client configuration
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── email.ts                  # Email sending via Resend
│   ├── email-templates.ts        # HTML email templates
│   ├── email-triggers.ts         # Email event handlers
│   ├── stripe.ts                 # Stripe integration
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # Helper functions
├── public/                       # Static assets
│   ├── assets/                   # Images, icons
│   ├── landing.html              # Static landing page
│   ├── favicon.png
│   └── og-image.png
├── supabase/                     # Database migrations
│   └── migrations/
│       ├── add_subscription_fields.sql
│       └── add_task_tracking.sql
├── middleware.ts                 # Route protection
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components (`page.tsx`), API handlers (`route.ts`), layouts
- Key files: `layout.tsx`, `page.tsx`, `globals.css`

**`app/api/`:**
- Purpose: All backend API endpoints as serverless functions
- Contains: Route handlers organized by resource
- Key files: `search/route.ts`, `tasks/queue/route.ts`, `stripe/webhook/route.ts`

**`app/api/cron/`:**
- Purpose: Scheduled background jobs
- Contains: Endpoints called by external scheduler (Vercel cron)
- Key files: `weekly-summary/route.ts`, `verify-tasks/route.ts`, `reengagement/route.ts`

**`components/`:**
- Purpose: Reusable React components
- Contains: UI primitives and feature components
- Key files: `ui/Button.tsx`, `Header.tsx`, `Sidebar.tsx`

**`components/ui/`:**
- Purpose: Base UI component library
- Contains: Buttons, inputs, cards, spinners
- Key files: All `.tsx` files are individual components

**`lib/`:**
- Purpose: Shared utilities, types, and service integrations
- Contains: Business logic helpers, external API clients
- Key files: `stripe.ts`, `email.ts`, `types.ts`, `supabase/server.ts`

**`lib/supabase/`:**
- Purpose: Supabase client configuration for different contexts
- Contains: Browser client, server client
- Key files: `client.ts` (browser), `server.ts` (server-side)

**`public/`:**
- Purpose: Static files served directly
- Contains: Landing page, images, favicons, manifests
- Key files: `landing.html`, `favicon.png`, `og-image.png`

**`supabase/`:**
- Purpose: Database schema and migrations
- Contains: SQL migration files
- Key files: `migrations/*.sql`

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with fonts, metadata, analytics
- `app/page.tsx`: Auth-based routing (dashboard vs landing)
- `middleware.ts`: Request interception and auth validation

**Configuration:**
- `package.json`: Dependencies and scripts
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS theme
- `tsconfig.json`: TypeScript configuration
- `.env.local`: Environment variables (not committed)

**Core Logic:**
- `app/dashboard/page.tsx`: Main application (~1577 lines, contains most UI)
- `app/api/search/route.ts`: Reddit search via Apify
- `app/api/tasks/queue/route.ts`: Task creation and management
- `app/api/stripe/webhook/route.ts`: Subscription lifecycle handling

**Testing:**
- No test files detected in codebase

**Types:**
- `lib/types.ts`: Domain entity interfaces (Profile, Project, Opportunity)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `Header.tsx`)
- Utilities: `kebab-case.ts` (e.g., `email-triggers.ts`)
- Types: `types.ts` (single file for domain types)

**Directories:**
- API routes: `kebab-case` (e.g., `suggest-keywords`, `weekly-summary`)
- Pages: `kebab-case` matching URL path (e.g., `dashboard`, `onboarding`)
- Components: `PascalCase` for feature, `kebab-case/ui` for primitives

**Code Style:**
- Variables/functions: `camelCase`
- React components: `PascalCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` or `camelCase` (inconsistent)

## Where to Add New Code

**New Page:**
- Create directory: `app/{page-name}/`
- Add: `page.tsx` with `'use client'` if interactive
- Update: `middleware.ts` if route needs protection

**New API Endpoint:**
- Create directory: `app/api/{resource-name}/`
- Add: `route.ts` with exported HTTP method handlers
- For nested routes: `app/api/{resource}/{action}/route.ts`

**New Component:**
- Feature component: `components/{ComponentName}.tsx`
- UI primitive: `components/ui/{ComponentName}.tsx`

**New Type:**
- Add interface to: `lib/types.ts`

**New Utility Function:**
- General helper: `lib/utils.ts`
- Domain-specific: Create new file in `lib/` (e.g., `lib/reddit.ts`)

**New External Integration:**
- Create: `lib/{service-name}.ts`
- Pattern: Lazy-loaded client with configuration

**New Database Table:**
- Create migration: `supabase/migrations/{description}.sql`
- Include: Table definition, indexes, RLS policies

**New Cron Job:**
- Create: `app/api/cron/{job-name}/route.ts`
- Include: Cron secret verification
- Configure: External scheduler (Vercel cron in `vercel.json`)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`.vercel/`:**
- Purpose: Vercel deployment configuration
- Generated: Yes (by Vercel CLI)
- Committed: No

**`supabase/migrations/`:**
- Purpose: Database schema history
- Generated: No (manually created)
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root URL
- Generated: No
- Committed: Yes

## Import Aliases

**Configured in `tsconfig.json`:**
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

**Usage:**
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types'
import { Button } from '@/components/ui/Button'
```

---

*Structure analysis: 2026-01-18*
