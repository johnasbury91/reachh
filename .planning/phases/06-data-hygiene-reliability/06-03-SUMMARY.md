---
phase: 06-data-hygiene-reliability
plan: 03
subsystem: sync
tags: [gspread, google-sheets, archive, data-hygiene]

# Dependency graph
requires:
  - phase: 02-sheets-sync
    provides: Google Sheets sync infrastructure (sync_to_sheet, HEADERS, gspread connection)
  - phase: 06-02
    provides: 13-column sheet structure with warmup_status
provides:
  - Archive tab for deleted profiles (15 columns: main + archive_reason + archived_at)
  - archive_stale_profiles function for detecting and archiving stale profiles
  - Automatic stale profile cleanup during tracker runs
affects: [06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Archive pattern: move deleted records to Archive tab instead of hard delete"
    - "Stale detection: compare sheet profile_ids vs Dolphin profile_ids"

key-files:
  created: []
  modified:
    - dolphin/sheets_sync.py
    - dolphin/tracker.py

key-decisions:
  - "Archive tab has 15 columns (13 main + archive_reason + archived_at)"
  - "Stale detection compares sheet IDs vs Dolphin IDs each run"
  - "Delete rows in reverse order to preserve indices"
  - "Archive reason is 'deleted_from_dolphin'"

patterns-established:
  - "Archive pattern: preserve data history by moving to Archive tab"
  - "Batch operations: append_rows for Archive, delete_rows in reverse for main sheet"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 6 Plan 3: Stale Profile Archival Summary

**Archive tab for deleted profiles with automatic stale detection during tracker sync**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T05:13:43Z
- **Completed:** 2026-01-19T05:15:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added ARCHIVE_HEADERS constant (15 columns: 13 main + archive_reason + archived_at)
- Implemented _get_or_create_archive_sheet helper function
- Implemented archive_stale_profiles function for stale detection and archival
- Integrated archival into tracker run after sync_to_sheet

## Task Commits

Each task was committed atomically:

1. **Task 1: Add archive functions to sheets_sync.py** - `35abc5d` (feat)
2. **Task 2: Integrate stale detection into tracker** - `b90203f` (feat)

## Files Created/Modified
- `dolphin/sheets_sync.py` - Added ARCHIVE_HEADERS, _get_or_create_archive_sheet, archive_stale_profiles
- `dolphin/tracker.py` - Import archive_stale_profiles, extract dolphin_profile_ids, call after sync

## Decisions Made
- Archive tab has 15 columns (main 13 + archive_reason + archived_at)
- Delete stale rows in reverse order to preserve indices during iteration
- Archive reason is "deleted_from_dolphin" with ISO timestamp

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Archive tab will be created automatically on first stale profile detection.

## Next Phase Readiness
- Archive infrastructure complete
- Ready for 06-04: Error Recovery & Retry Logic
- Main sheet stays clean with stale profiles moved to Archive

---
*Phase: 06-data-hygiene-reliability*
*Completed: 2026-01-19*
