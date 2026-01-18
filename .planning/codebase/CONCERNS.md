# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Massive Dashboard Component:**
- Issue: `app/dashboard/page.tsx` is 1577 lines - a monolithic component handling multiple views, state management, and business logic
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/dashboard/page.tsx`
- Impact: Difficult to maintain, test, and extend. Performance risk from re-renders. Cognitive load for developers.
- Fix approach: Extract into smaller components (OpportunitiesView, ToCommentView, PostedView), create custom hooks for data fetching (useSubscription, useTasks, useOpportunities), move business logic to separate utilities.

**Incomplete Task Server Integration:**
- Issue: TODO comment indicates editing tasks doesn't sync to external task server
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/queue/route.ts` (line 189)
- Impact: Edits made in Reachh won't reflect in task server - workers will execute original content
- Fix approach: Implement PATCH endpoint call to task server API when updating task content locally

**Excessive Use of `any` Types:**
- Issue: Multiple instances of `any` type defeating TypeScript's type safety
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/search/route.ts` (lines 58, 59, 70, 72)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/projects/route.ts` (line 89)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/verify-tasks/route.ts` (lines 50, 174)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/onboarding/page.tsx` (line 175)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/settings/page.tsx` (line 92)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/dashboard/page.tsx` (line 902)
- Impact: Runtime errors possible, no IDE autocompletion, maintenance burden
- Fix approach: Define proper interfaces for Apify responses, task data, and form errors

**Inconsistent Error Handling:**
- Issue: Some errors are caught and logged with generic messages, others silently swallowed
- Files: Multiple API routes - see catch blocks in `/Users/johnasbury/Reachh/reddit-monitor/app/api/*/route.ts`
- Impact: Difficult debugging in production, users see generic errors, no error tracking
- Fix approach: Implement centralized error handling utility with structured error codes, integrate error tracking service (Sentry)

## Known Bugs

**Task Cancellation Doesn't Refund Credits:**
- Symptoms: User loses credit even when canceling a queued task
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/queue/route.ts` (DELETE handler)
- Trigger: Create task (credit deducted), then cancel task before worker picks it up
- Workaround: None - credits are lost

**Email Failures Silently Ignored:**
- Symptoms: Users may not receive important emails (welcome, subscription confirmation)
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/signup/page.tsx` (lines 45-47)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/stripe/webhook/route.ts` (lines 84-86)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/opportunities/route.ts` (lines 156-158)
- Trigger: Email service (Resend) failure
- Workaround: None - failures logged but not surfaced

## Security Considerations

**Webhook Signature Verification Skipped:**
- Risk: Task server webhook can be spoofed if TASK_SERVER_WEBHOOK_SECRET not configured
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/webhook/route.ts` (line 15)
- Current mitigation: Signature verification only when secret is set
- Recommendations: Make TASK_SERVER_WEBHOOK_SECRET required, fail if not configured

**Cron Endpoints Use Bearer Token:**
- Risk: Cron secret could leak, allowing unauthorized job execution
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/onboarding/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/reengagement/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/weekly-summary/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/verify-tasks/route.ts`
- Current mitigation: Bearer token check against CRON_SECRET env var
- Recommendations: Consider using Vercel's native cron protection, add IP allowlist

**Service Role Key Used in Multiple Places:**
- Risk: Overprivileged database access from webhook/cron endpoints
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/stripe/webhook/route.ts` (lines 11-12)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/webhook/route.ts` (lines 9-10)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/*.ts`
- Current mitigation: Webhooks verify signatures before using service role
- Recommendations: Audit RLS policies, ensure minimal privileges

**No Input Sanitization for AI Generation:**
- Risk: Prompt injection via user-provided description/keywords
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/suggest-keywords/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/generate-comments/route.ts`
- Current mitigation: None
- Recommendations: Sanitize user input before passing to AI, implement output validation

## Performance Bottlenecks

**Apify Actor Polling in Verify-Tasks:**
- Problem: Synchronous polling with 10-second intervals, up to 5 minutes
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/cron/verify-tasks/route.ts` (lines 75-103)
- Cause: Waiting for Apify scrape to complete within the same request
- Improvement path: Use Apify webhooks for completion notification, or separate scrape initiation from result processing

**No Pagination on Task Lists:**
- Problem: All tasks loaded at once, will degrade with scale
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/route.ts`
- Cause: Query fetches all tasks matching filters
- Improvement path: Add pagination with cursor-based approach

**Dashboard Makes Multiple Sequential Fetches:**
- Problem: Several API calls on mount, not batched
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/dashboard/page.tsx` (multiple useEffect hooks)
- Cause: Separate effects for project, opportunities, subscription, tasks
- Improvement path: Server components for initial data, or single aggregated API endpoint

## Fragile Areas

**Subscription State Management:**
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/subscription/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/stripe/webhook/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/lib/stripe.ts`
- Why fragile: State split between Stripe (source of truth) and Supabase (cached). Webhook timing issues can cause inconsistency.
- Safe modification: Always test webhook flows end-to-end, use Stripe CLI for local testing
- Test coverage: No automated tests for subscription flows

**Credit Deduction Logic:**
- Files:
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/tasks/queue/route.ts` (line 122-129)
  - `/Users/johnasbury/Reachh/reddit-monitor/app/api/user/credits/check/route.ts`
  - `/Users/johnasbury/Reachh/reddit-monitor/supabase/migrations/add_task_tracking.sql` (decrement function)
- Why fragile: Credits deducted in multiple places, race conditions possible
- Safe modification: Use database transactions, consider locking
- Test coverage: None

**Apify API Response Parsing:**
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/search/route.ts`
- Why fragile: Relies on Apify response structure that could change
- Safe modification: Add defensive checks, validate response schema
- Test coverage: None - relies on external service

## Scaling Limits

**Database Queries Not Optimized:**
- Current capacity: Fine for small user base
- Limit: No connection pooling visible, indexes may not cover all query patterns
- Scaling path: Add proper connection pooling, analyze query plans, consider read replicas

**Verification Cron Processes 100 Tasks Per Run:**
- Current capacity: `LIMIT 100` in verify-tasks
- Limit: With many submitted tasks, backlog will grow
- Scaling path: Increase limit or add more frequent runs, consider queue-based processing

## Dependencies at Risk

**Apify API Dependency:**
- Risk: Third-party service, rate limits, pricing changes
- Impact: Reddit search and verification breaks completely
- Migration plan: Consider Reddit API direct integration, cache results

**Resend Email Service:**
- Risk: Fallback to 'dummy_key' if not configured masks issues
- Impact: Silent email failures
- Migration plan: Add proper error handling, consider fallback provider

## Missing Critical Features

**No Automated Testing:**
- Problem: Zero test files in src directory (only in node_modules)
- Blocks: Safe refactoring, CI/CD confidence, regression prevention
- Files: No `*.test.ts` or `*.spec.ts` in `/Users/johnasbury/Reachh/reddit-monitor`

**No Rate Limiting:**
- Problem: Only one mention of rate limiting (comment between AI batches)
- Files: `/Users/johnasbury/Reachh/reddit-monitor/app/api/generate-comments/route.ts` (line 110)
- Blocks: API abuse prevention, cost control for AI/Apify calls

**No Structured Logging:**
- Problem: Using console.log/console.error throughout
- Blocks: Production debugging, monitoring, alerting

## Test Coverage Gaps

**All Areas Untested:**
- What's not tested: Everything - API routes, components, utilities, business logic
- Files: All files in `/Users/johnasbury/Reachh/reddit-monitor/app` and `/Users/johnasbury/Reachh/reddit-monitor/lib`
- Risk: Any change could break functionality unnoticed, payment flows especially risky
- Priority: High - start with critical paths (subscription, task queue, auth)

---

*Concerns audit: 2026-01-18*
