# Features - Dolphin v2

**Researched:** 2026-01-18

## Table Stakes (Must Have)

| Feature | Status | Notes |
|---------|--------|-------|
| Account inventory listing | Built | In tracker.py |
| Account status detection | Built | Checks 404/403 |
| Basic karma tracking | Built | Total/comment/link |
| Owner/freelancer assignment | Built | Via Dolphin Anty |
| Account categorization | Built | categorize_account() |
| **Google Sheets sync** | NOT BUILT | Core requirement |
| Automated/scheduled runs | NOT BUILT | Cron job |
| Proxy association | Partial | Data exists, not integrated |

## Differentiators (Should Have)

| Feature | Value | Complexity |
|---------|-------|------------|
| Karma delta tracking | Spot stagnant accounts | Low |
| Account age | Older = more valuable | Low |
| Karma velocity | Karma/day rate | Low |
| Filtered views per freelancer | Each sees their own | Low |
| Proxy health monitoring | Know before bans | Medium |
| Shadowban detection | Catch subtle bans | Medium |
| Freelancer performance metrics | Compare farming | Medium |
| Alert system | Proactive notifications | Medium |

## Anti-Features (Don't Build)

| Feature | Why Not |
|---------|---------|
| Web dashboard | Validate with Sheets first |
| Reddit automation/posting | Different product |
| Account creation | High risk, different tool |
| Proxy purchasing/rotation | Track health only |
| Task assignment | Out of scope per PROJECT.md |
| Real-time updates | Sheets doesn't support well |

## MVP Priority

**Phase 1:** Core tracking + Google Sheets sync
**Phase 2:** Karma deltas + scheduling + filtered views
**Phase 3:** Proxy health + shadowban detection + alerts
