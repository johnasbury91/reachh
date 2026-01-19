# Milestone v3: Account Survival

**Status:** ✅ SHIPPED 2026-01-19
**Phases:** 01-02
**Total Plans:** 6

## Overview

Dolphin v3 focuses on account survival — stopping the loss of new accounts in the first 2 weeks. This required auditing and fixing proxy configuration, implementing proper warmup management, and documenting best practices. The goal: accounts that survive their warmup period and become productive.

## Phases

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
**Plans**: 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Add DataImpulse provider & fix health checks (wave 1)
- [x] 01-02-PLAN.md — Audit Dolphin profile configuration (wave 1)
- [x] 01-03-PLAN.md — Create proxy setup documentation (wave 2)

### Phase 2: Warmup Management

**Goal**: New accounts follow safe activity patterns and get flagged if they exceed limits
**Depends on**: Phase 1
**Requirements**: WARMUP-01, WARMUP-02, WARMUP-03, WARMUP-04, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. Safe activity limits defined for each account age bracket
  2. Tracker shows activity counts in Google Sheet
  3. Alerts fire when accounts exceed safe thresholds
  4. Warmup playbook documented with daily/weekly schedule
**Plans**: 3 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — Warmup limits module & activity counting (wave 1)
- [x] 02-02-PLAN.md — Tracker integration, sheets columns, alerts (wave 2)
- [x] 02-03-PLAN.md — Warmup playbook & troubleshooting docs (wave 3)

---

## Milestone Summary

**Key Decisions:**
- DataImpulse provider matches gw.dataimpulse.com and dataimpulse.com domains
- Session type detection: port 823 = rotating, 10000+ = sticky
- 30s timeout for residential proxies (up from 10s)
- Tier boundaries: new (<7d), warming (7-14d), ready (14-30d), established (30d+)
- Alert threshold: 80% of limit triggers WARNING, 100% triggers EXCEEDED
- Activity counts return 0 on errors (graceful degradation)

**Issues Resolved:**
- Proxy health checks all failing (credentials not extracted from Dolphin API)
- 102 profiles sharing 32 proxy sessions (identified by audit)
- No activity tracking for warmup enforcement (now in sheets)

**Issues Deferred:**
- Remediation of the 102 shared-session profiles (manual work, not automated)

**Technical Debt Incurred:**
- None

---
*For current project status, see .planning/ROADMAP.md*
