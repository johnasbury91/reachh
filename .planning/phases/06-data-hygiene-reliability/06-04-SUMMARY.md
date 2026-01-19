---
phase: 06-data-hygiene-reliability
plan: 04
subsystem: sync
tags: [gspread, google-sheets, archive, state-tracking, dead-accounts]

# Dependency graph
requires:
  - phase: 06-03
    provides: Archive tab infrastructure (_get_or_create_archive_sheet, ARCHIVE_HEADERS)
  - phase: 05-01
    provides: State tracking infrastructure (load_state, save_state)
provides:
  - account_history tracking for not_found duration
  - update_not_found_tracking function for dead account detection
  - archive_dead_accounts function for moving dead accounts to Archive
  - 7-day threshold before archiving dead accounts
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State-based tracking: track first_seen and duration for status changes"
    - "Threshold-based archival: wait N days before archiving transient states"

key-files:
  created: []
  modified:
    - dolphin/state.py
    - dolphin/sheets_sync.py
    - dolphin/tracker.py

key-decisions:
  - "Track not_found duration via account_history in state file"
  - "7-day threshold before archiving dead accounts (not_found for week)"
  - "Archive reason is 'dead_account_7d' to distinguish from 'deleted_from_dolphin'"
  - "Recovered accounts (back to active) clear their not_found tracking"

patterns-established:
  - "Duration tracking: store first_seen timestamp and calculate days on each run"
  - "Account history persistence: include account_history in state file"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 6 Plan 4: Dead Account Archival Summary

**Track not_found accounts for 7 days then archive to keep main sheet focused on active accounts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T05:16:39Z
- **Completed:** 2026-01-19T05:18:43Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended state.py with account_history field for tracking not_found duration
- Implemented update_not_found_tracking to detect accounts dead for 7+ days
- Added archive_dead_accounts function with "dead_account_7d" archive reason
- Integrated dead account tracking into tracker run flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend state.py for not_found duration tracking** - `302a3b1` (feat)
2. **Task 2: Add archive_dead_accounts to sheets_sync.py** - `1bd16c5` (feat)
3. **Task 3: Integrate dead account archival into tracker** - `92ff334` (feat)

## Files Created/Modified
- `dolphin/state.py` - Added account_history to load/save, added update_not_found_tracking function
- `dolphin/sheets_sync.py` - Added archive_dead_accounts function
- `dolphin/tracker.py` - Integrated not_found tracking and dead account archival

## Decisions Made
- 7-day threshold for dead account archival (consistent with typical account recovery window)
- Archive reason "dead_account_7d" distinguishes from "deleted_from_dolphin" stale profiles
- Account recovery (not_found -> active) clears tracking history
- Days calculation includes first day (days since first_seen + 1)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Dead account archival happens automatically after 7 days of not_found status.

## Next Phase Readiness
- Phase 6 complete! All 4 plans executed.
- Full data hygiene pipeline operational:
  - Retry logic for transient failures (06-01)
  - Warmup status tracking (06-02)
  - Stale profile archival (06-03)
  - Dead account archival (06-04)
- Project is feature-complete per ROADMAP.md

---
*Phase: 06-data-hygiene-reliability*
*Completed: 2026-01-19*
