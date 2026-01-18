# Technology Stack

**Analysis Date:** 2025-01-18

## Languages

**Primary:**
- TypeScript 5.9.3 - Main app (`reddit-monitor/`)
- Python 3.x - Task server (`task-server/`)

**Secondary:**
- SQL - Database schema and migrations (`reddit-monitor/supabase/`)
- HTML/CSS - Landing page (`reachh-landing-page/`)

## Runtime

**Environment:**
- Node.js (Next.js 14 runtime)
- Python (FastAPI/Uvicorn)

**Package Manager:**
- npm - Main app
- pip - Task server
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14 - Full-stack React framework with App Router
- React 18 - UI library
- FastAPI 0.109.0 - Python microservice framework (task-server)

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS
- PostCSS 8 - CSS processing
- Autoprefixer 10 - CSS vendor prefixes

**Animation:**
- Framer Motion 12.23.26 - React animations

**Testing:**
- Not detected - No test framework configured

**Build/Dev:**
- TypeScript 5.9.3 - Type checking
- Next.js built-in - Development server, bundling

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2 - Database client
- `@supabase/ssr` ^0 - Server-side Supabase auth
- `stripe` ^20.0.0 - Payment processing
- `@google/generative-ai` ^0.24.1 - AI comment generation (Gemini)
- `apify-client` ^2 - Reddit scraping
- `resend` ^6.6.0 - Transactional email

**Infrastructure:**
- `next` ^14 - Framework
- `react` ^18, `react-dom` ^18 - UI

**Python Task Server:**
- `fastapi` 0.109.0 - API framework
- `uvicorn` 0.27.0 - ASGI server
- `httpx` 0.26.0 - HTTP client
- `pydantic` 2.5.3 - Data validation
- `python-multipart` 0.0.6 - Form handling

## Configuration

**TypeScript:**
- Config: `reddit-monitor/tsconfig.json`
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` -> `./*`
- JSX: preserve (for Next.js)

**Tailwind:**
- Config: `reddit-monitor/tailwind.config.ts`
- Custom color palette (dark theme)
- Custom fonts: Space Grotesk, DM Mono
- Custom animations: fade-in, slide-up

**Next.js:**
- Config: `reddit-monitor/next.config.js`
- External package: apify-client (server components)

**Environment Variables:**
Required (see `reddit-monitor/.env.example`):
```
APIFY_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
ADMIN_EMAIL
CRON_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
TASK_SERVER_URL
TASK_SERVER_API_KEY
```

**Build:**
- Vercel config: `vercel.json` - root directory set to `reddit-monitor`
- PostCSS config: `reddit-monitor/postcss.config.js`

## Platform Requirements

**Development:**
- Node.js (version not pinned, recommend 18+)
- npm
- Python 3.x (for task-server)

**Production:**
- Main app: Vercel (Next.js hosting)
- Task server: Railway (Python hosting)
- Landing page: Netlify (static hosting)

## Repository Structure

**Monorepo with multiple projects:**
- `reddit-monitor/` - Main Next.js application
- `task-server/` - Python FastAPI microservice
- `reachh-landing-page/` - Static HTML landing page
- `dolphin/` - Python tracking utility (separate tool)

---

*Stack analysis: 2025-01-18*
