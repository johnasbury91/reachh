---
phase: 05-alerts-reporting
plan: 03
subsystem: reporting
tags: [karma-velocity, weekly-report, launchd, notifications, macos]

# Dependency graph
requires:
  - phase: 04-automation
    provides: Logging infrastructure and launchd patterns
  - phase: 02-sheets-sync
    provides: karma_history.json tracking
provides:
  - Weekly karma velocity calculation (karma/day over 7-day periods)
  - Automated weekly report generation (top/bottom 5 performers)
  - macOS/Slack notification for report summaries
  - launchd job running Sundays at 10 AM
affects: [monitoring, account-management]

# Tech tracking
tech-stack:
  added: [pync (optional)]
  patterns: [velocity calculation, scheduled reporting]

key-files:
  created:
    - dolphin/reporting.py
    - dolphin/alerts.py
    - dolphin/launchd/com.dolphin.weekly-report.plist

key-decisions:
  - "Created alerts.py dependency for Plan 05-03 (was missing from 05-01)"
  - "Velocity = 0 when < 2 data points (correct edge case handling)"
  - "Weekday 0 in launchd = Sunday"

patterns-established:
  - "Karma velocity: (last_karma - first_karma) / days_between"
  - "Report structure: Top 5 performers + Bottom 5 needing attention"

# Metrics
duration: 2min
completed: 2026-01-18
---

# Phase 5 Plan 3: Weekly Karma Report Summary

**Karma velocity tracking with weekly automated reports showing top/bottom 5 performers via macOS notifications**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-18T14:05:26Z
- **Completed:** 2026-01-18T14:07:18Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Created reporting.py with karma velocity calculation (karma/day over 7 days)
- Weekly report generation showing top 5 and bottom 5 performers
- launchd job scheduled for Sundays at 10 AM
- Notification support via macOS and optional Slack

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reporting module** - `9ec3c94` (feat)
2. **Task 2: Create weekly launchd job** - `0927c43` (feat)

## Files Created/Modified
- `dolphin/reporting.py` - Karma velocity calculation and weekly report generation
- `dolphin/alerts.py` - Multi-channel notification support (macOS, Slack)
- `dolphin/launchd/com.dolphin.weekly-report.plist` - Weekly schedule for Sundays 10 AM

## Decisions Made
- Created alerts.py as part of this plan (dependency for Plan 05-01, but needed now)
- Velocity calculation returns 0.0 when < 2 data points (correct handling)
- Weekday 0 = Sunday in launchd StartCalendarInterval
- Best-effort notifications (failures logged but don't crash report)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created alerts.py dependency**
- **Found during:** Task 1 (Create reporting module)
- **Issue:** Plan 05-03 imports from alerts.py, but alerts.py was not created (planned for 05-01 which hasn't executed)
- **Fix:** Created complete alerts.py with send_alert(), notify_bans(), notify_proxy_failures()
- **Files created:** dolphin/alerts.py
- **Verification:** reporting.py imports and uses send_alert() successfully
- **Committed in:** 9ec3c94 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking dependency)
**Impact on plan:** Necessary to unblock execution. alerts.py created with full functionality matching 05-01 spec.

## Issues Encountered
- All accounts show 0.0 karma/day velocity because karma_history.json only has one snapshot (today). This is expected behavior - velocity requires at least 2 data points on different days.

## User Setup Required

For macOS notifications to work:
```bash
brew install terminal-notifier
pip install pync
```

For optional Slack notifications, add to .env:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Next Phase Readiness
- Weekly reporting infrastructure complete
- Reports will be meaningful once tracker has run for multiple days
- Consider executing 05-01 (state tracking) and 05-02 (tracker integration) to complete alerting system

---
*Phase: 05-alerts-reporting*
*Completed: 2026-01-18*
