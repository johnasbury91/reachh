# External Integrations

**Analysis Date:** 2025-01-18

## APIs & External Services

**Reddit Data (Apify):**
- Service: Apify `practicaltools/apify-reddit-api` actor
- Purpose: Search and scrape Reddit posts
- SDK: `apify-client` ^2
- Auth: `APIFY_API_KEY`
- Usage: `reddit-monitor/app/api/search/route.ts`
- Features: Keyword search, subreddit filtering, post metadata

**AI/LLM (Google Gemini):**
- Service: Google Generative AI
- Purpose: Generate Reddit comments and keyword suggestions
- SDK: `@google/generative-ai` ^0.24.1
- Model: `gemini-1.5-flash`
- Auth: `GEMINI_API_KEY`
- Usage:
  - `reddit-monitor/app/api/suggest-keywords/route.ts` - Keyword generation
  - `reddit-monitor/app/api/generate-comments/route.ts` - Comment generation

**Email (Resend):**
- Service: Resend transactional email
- Purpose: All user emails (welcome, notifications, summaries)
- SDK: `resend` ^6.6.0
- Auth: `RESEND_API_KEY`
- From: `hello@reachh.com`
- Usage:
  - `reddit-monitor/lib/email.ts` - Core email sending
  - `reddit-monitor/lib/email-triggers.ts` - Email trigger functions
  - `reddit-monitor/lib/email-templates.ts` - HTML templates

**Payments (Stripe):**
- Service: Stripe subscriptions and payments
- Purpose: Monthly subscription billing ($499/mo Pro plan)
- SDK: `stripe` ^20.0.0
- Auth:
  - `STRIPE_SECRET_KEY` - Server-side API
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side
  - `STRIPE_WEBHOOK_SECRET` - Webhook verification
- Usage:
  - `reddit-monitor/lib/stripe.ts` - Stripe client and plan config
  - `reddit-monitor/app/api/stripe/checkout/route.ts` - Create checkout sessions
  - `reddit-monitor/app/api/stripe/webhook/route.ts` - Handle Stripe events
  - `reddit-monitor/app/api/stripe/portal/route.ts` - Customer portal

## Data Storage

**Database (Supabase PostgreSQL):**
- Provider: Supabase (hosted PostgreSQL)
- Client: `@supabase/supabase-js` ^2, `@supabase/ssr` ^0
- Connection:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side, admin operations)
- Schema: `reddit-monitor/supabase/schema.sql`
- Migrations: `reddit-monitor/supabase/migrations/`

**Tables:**
- `projects` - User projects with keywords/subreddits
- `opportunities` - Reddit posts to comment on
- `user_profiles` - User data, credits, subscription status
- `task_queue` - Comment/post tasks for workers
- `reddit_accounts` - Worker Reddit account tracking
- `email_logs` - Email send history
- `credit_purchases` - Payment records

**File Storage:**
- Not used - No file uploads

**Caching:**
- None detected - No Redis/Memcached

## Authentication & Identity

**Auth Provider (Supabase Auth):**
- Implementation: Supabase Auth via SSR package
- Features: Email/password, magic links
- Client helpers:
  - `reddit-monitor/lib/supabase/client.ts` - Browser client
  - `reddit-monitor/lib/supabase/server.ts` - Server client with cookies
- Session: Cookie-based via `@supabase/ssr`

**Admin Detection:**
- Env var: `ADMIN_EMAILS` (comma-separated list)
- Helper: `isAdmin()` in `reddit-monitor/lib/stripe.ts`
- Admins bypass credit limits

## Task Server Integration

**Internal Microservice:**
- Service: FastAPI task server
- Purpose: Queue and distribute Reddit posting tasks to workers
- Location: `task-server/app.py`
- Deployment: Railway
- Connection:
  - `TASK_SERVER_URL` - Base URL
  - `TASK_SERVER_API_KEY` - API authentication
  - `TASK_SERVER_WEBHOOK_SECRET` - Webhook HMAC verification

**API Endpoints (Next.js -> Task Server):**
- `POST /api/tasks` - Create new tasks
- Task server calls back via webhook when completed

**Webhook (Task Server -> Next.js):**
- Endpoint: `reddit-monitor/app/api/tasks/webhook/route.ts`
- Purpose: Receive task completion notifications
- Auth: HMAC signature verification
- Actions: Update task status, deduct user credits

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry/Bugsnag configured

**Logs:**
- Console logging via `console.log/error`
- No structured logging service

**Analytics:**
- Not detected in codebase

## CI/CD & Deployment

**Main App Hosting (Vercel):**
- Config: `vercel.json`
- Root directory: `reddit-monitor`
- Auto-deploys from git

**Task Server Hosting (Railway):**
- Config: `task-server/railway.toml`
- Builder: nixpacks
- Start: `uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}`
- Health check: `/health`

**Landing Page Hosting (Netlify):**
- Config: `netlify.toml` (at root and in `reachh-landing-page/`)
- Static HTML site

## Environment Configuration

**Required env vars (Main App):**
```
# Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# External APIs
APIFY_API_KEY
GEMINI_API_KEY
RESEND_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Task Server
TASK_SERVER_URL
TASK_SERVER_API_KEY
TASK_SERVER_WEBHOOK_SECRET

# App Config
NEXT_PUBLIC_APP_URL
ADMIN_EMAIL
ADMIN_EMAILS
CRON_SECRET
```

**Required env vars (Task Server):**
```
ADMIN_PASSWORD
API_KEY
WEBHOOK_URL
WEBHOOK_SECRET
DATA_FILE
MAX_TASKS_PER_HOUR
MAX_REJECTIONS
```

**Secrets location:**
- Vercel environment variables (main app)
- Railway environment variables (task server)

## Webhooks & Callbacks

**Incoming Webhooks:**
- `POST /api/stripe/webhook` - Stripe payment events
  - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- `POST /api/tasks/webhook` - Task server completion notifications

**Outgoing Webhooks:**
- Task server calls back to main app when tasks complete

**Cron Jobs:**
- `GET /api/cron/weekly-summary` - Weekly email digest
- `GET /api/cron/onboarding` - Onboarding email sequence
- `GET /api/cron/reengagement` - Re-engagement emails
- `GET /api/cron/verify-tasks` - Task verification
- Auth: Bearer token via `CRON_SECRET`

## Integration Dependencies

**Critical Path:**
1. Supabase - All data storage and auth
2. Stripe - Revenue (subscription billing)
3. Task Server - Core product functionality

**Feature Dependencies:**
- Apify - Search functionality
- Gemini - AI features (keyword suggestions, comment generation)
- Resend - User communication

---

*Integration audit: 2025-01-18*
