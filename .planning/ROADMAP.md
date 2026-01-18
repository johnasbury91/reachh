# Roadmap: Dolphin v2

## Overview

Dolphin v2 transforms the existing Reddit account tracker into an automated Google Sheets-synced system. Starting with urgent security fixes (exposed credentials) and anti-detection improvements, we build toward full Sheets integration, proxy health monitoring, and scheduled automation. The goal: see the health of your entire Reddit account farm in one Sheet without running scripts manually.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Security** - Fix credential exposure, add anti-detection, build core tracking
- [x] **Phase 2: Google Sheets Sync** - Automatic sync with karma tracking and proxy columns
- [x] **Phase 3: Enhanced Detection** - Shadowban detection and proxy health monitoring
- [x] **Phase 4: Automation** - Scheduled jobs for hands-off operation
- [ ] **Phase 5: Alerts & Reporting** - Notifications on bans/issues, weekly karma summaries

## Phase Details

### Phase 1: Foundation & Security
**Goal**: Core tracking works safely with no exposed credentials and smart request patterns
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, CORE-01, CORE-02, CORE-03, CORE-05
**Success Criteria** (what must be TRUE):
  1. Running the script produces account data (username, karma, status, freelancer) without hardcoded credentials
  2. Request delays are randomized (not predictable 3-second intervals)
  3. Script backs off gracefully when Reddit rate-limits (no crashes, no bans)
  4. All credentials live in .env file (JWT token, API keys removed from code)
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md - Security hardening (credentials to .env, pydantic-settings config)
- [x] 01-02-PLAN.md - Core modules (DolphinClient, RedditChecker with anti-detection)
- [x] 01-03-PLAN.md - Integration (refactor tracker.py to use async modules)

### Phase 2: Google Sheets Sync
**Goal**: Account data syncs to Google Sheets automatically with proxy and karma tracking
**Depends on**: Phase 1
**Requirements**: CORE-04, INFRA-04, STATUS-02, STATUS-03, PROXY-01, PROXY-04
**Success Criteria** (what must be TRUE):
  1. Running the script updates a Google Sheet with all account data (no manual copy-paste)
  2. Each row shows: Username, Status, Karma (total/comment/link), Account Age, Freelancer, Proxy
  3. Karma delta column shows daily change from previous run
  4. Sheet updates are batched (no API quota errors on large farms)
  5. Proxy associated with each account appears in its own column
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Google Sheets integration (gspread setup, authentication, batch upsert)
- [x] 02-02-PLAN.md — Proxy column (extract proxy from Dolphin API, display in sheet)
- [x] 02-03-PLAN.md — Account age and karma delta (calculate age, format delta with +/-)

### Phase 3: Enhanced Detection
**Goal**: Detect shadowbans and verify proxy health across multiple providers
**Depends on**: Phase 2
**Requirements**: STATUS-01, PROXY-02, PROXY-03
**Success Criteria** (what must be TRUE):
  1. Shadowbanned accounts show "shadowbanned" status (not falsely marked as "active")
  2. Proxy health column shows whether proxy can reach Reddit (pass/fail)
  3. Script works with multiple proxy providers (Decodo + at least one other)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — Shadowban detection (check if posts/comments are visible to others)
- [x] 03-02-PLAN.md — Proxy health testing (verify Reddit reachability per proxy)
- [x] 03-03-PLAN.md — Multi-provider support (abstract proxy interface, add providers)

### Phase 4: Automation
**Goal**: Script runs on schedule without manual intervention
**Depends on**: Phase 3
**Requirements**: INFRA-05
**Success Criteria** (what must be TRUE):
  1. Script runs automatically on a schedule (cron or similar)
  2. Google Sheet updates daily without human action
  3. Failures are logged (not silent)
**Plans**: 1 plan in 1 wave

Plans:
- [x] 04-01-PLAN.md — Scheduled execution (launchd setup, logging, error handling)

### Phase 5: Alerts & Reporting
**Goal**: Get notified when accounts have problems and track karma trends over time
**Depends on**: Phase 4
**Requirements**: ALERT-01, ALERT-02, ANALYTICS-01
**Success Criteria** (what must be TRUE):
  1. Receive notification when new bans/suspensions are detected
  2. Receive notification when proxy health fails
  3. Weekly karma summary shows top/bottom performers
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 05-01-PLAN.md — Notification infrastructure (state tracking, macOS/Slack alerts)
- [ ] 05-02-PLAN.md — Integrate alerts into tracker (detect and notify on problems)
- [ ] 05-03-PLAN.md — Weekly karma report (velocity tracking, top/bottom performers)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Security | 3/3 | Complete | 2026-01-18 |
| 2. Google Sheets Sync | 3/3 | Complete | 2026-01-18 |
| 3. Enhanced Detection | 3/3 | Complete | 2026-01-18 |
| 4. Automation | 1/1 | Complete | 2026-01-18 |
| 5. Alerts & Reporting | 0/3 | Planned | - |

---
*Roadmap created: 2026-01-18*
*Phase 1 planned: 2026-01-18*
*Phase 2 planned: 2026-01-18*
*Phase 3 planned: 2026-01-18*
*Phase 4 planned: 2026-01-18*
*Phase 5 planned: 2026-01-18*
