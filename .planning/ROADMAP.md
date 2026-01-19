# v4 Roadmap — Reliability & Insights

## Overview

Make the Reddit account tracker self-maintaining and surface account health at a glance. Phase 7 fixes the rate limiting issues that caused false positive deletions and adds scheduled maintenance jobs. Phase 8 adds visibility features including health scores and trend sparklines.

## Phases

### Phase 7: Reliable Operations

**Goal:** Reddit checker produces accurate results under rate limiting and maintenance runs automatically.

**Dependencies:** None (builds on existing tracker)

**Requirements:** REL-01, REL-02, REL-03, AUTO-01, AUTO-02, AUTO-03

**Success Criteria:**
1. Full tracker run completes without rate-limit-induced false `not_found` results
2. User sees confidence indicator when rate limits may have affected results
3. Dead profiles (not_found 7+ days) are automatically removed weekly without manual intervention
4. Proxy misconfigurations are detected and alerted weekly without manual audit runs
5. Cleanup and audit results appear in macOS notifications and Slack

---

### Phase 8: Health Visibility

**Goal:** Account health is visible at a glance with scores and trends in Google Sheets.

**Dependencies:** Phase 7 (accurate data needed for meaningful health scores)

**Requirements:** VIS-01, VIS-02, VIS-03, VIS-04

**Success Criteria:**
1. User sees a 0-100 Health Score column for every account in the Google Sheet
2. Health score formula is documented and user can adjust weights via config file
3. 7-day karma history is stored and persists across tracker runs
4. Google Sheet displays sparkline visualizations showing 7-day karma trends

---

## Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 7 - Reliable Operations | Not Started | 0/? |
| 8 - Health Visibility | Not Started | 0/? |

---

*Created: 2026-01-20*
