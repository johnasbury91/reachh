# Roadmap: Dolphin v3

## Overview

Dolphin v3 focuses on account survival — stopping the loss of new accounts in the first 2 weeks. This requires auditing and fixing proxy configuration, implementing proper warmup management, and documenting best practices. The goal: accounts that survive their warmup period and become productive.

## Phases

- [ ] **Phase 1: Proxy & Session Audit** - Full audit of proxy setup, cookie management, and Dolphin configuration
- [ ] **Phase 2: Warmup Management** - Activity limits, tracking, and alerts for new accounts

## Phase Details

### Phase 1: Proxy & Session Audit
**Goal**: Proxies work correctly and sessions persist properly between browser launches
**Depends on**: Nothing (first phase)
**Requirements**: PROXY-01, PROXY-02, PROXY-03, PROXY-04, PROXY-05, SESSION-01, SESSION-02, SESSION-03, DOCS-01
**Success Criteria** (what must be TRUE):
  1. DataImpulse proxy configuration matches their official documentation
  2. Decodo proxy configuration matches their official documentation
  3. Proxy health checks pass (not timing out)
  4. Dolphin profiles configured with correct cookie/session persistence
  5. Proxy setup guide documented with step-by-step instructions
**Plans**: TBD

### Phase 2: Warmup Management
**Goal**: New accounts follow safe activity patterns and get flagged if they exceed limits
**Depends on**: Phase 1
**Requirements**: WARMUP-01, WARMUP-02, WARMUP-03, WARMUP-04, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. Safe activity limits defined for each account age bracket
  2. Tracker shows activity counts in Google Sheet
  3. Alerts fire when accounts exceed safe thresholds
  4. Warmup playbook documented with daily/weekly schedule
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Proxy & Session Audit | 0/? | Not Started | — |
| 2. Warmup Management | 0/? | Not Started | — |

---
*Roadmap created: 2026-01-19*
