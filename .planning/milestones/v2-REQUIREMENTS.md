# Requirements: Dolphin v2

**Defined:** 2026-01-18
**Core Value:** See the health of your entire Reddit account farm in one Google Sheet automatically

## v1 Requirements

### Core Tracking

- [ ] **CORE-01**: Pull all browser profiles from Dolphin Anty API
- [ ] **CORE-02**: Check Reddit karma for each account (total, comment, link)
- [ ] **CORE-03**: Detect account status (active, banned, suspended, not_found)
- [ ] **CORE-04**: Sync all account data to Google Sheets automatically
- [ ] **CORE-05**: Show freelancer owner for each account

### Enhanced Status

- [ ] **STATUS-01**: Detect shadowbanned accounts (visible profile but hidden content)
- [ ] **STATUS-02**: Track account age (Reddit creation date)
- [ ] **STATUS-03**: Calculate karma delta (daily change from previous check)

### Proxy Management

- [ ] **PROXY-01**: Associate proxy with each account in output
- [ ] **PROXY-02**: Test proxy health (can reach Reddit)
- [ ] **PROXY-03**: Support multiple proxy providers (Decodo + others)
- [ ] **PROXY-04**: Show proxy status column in Google Sheet

### Infrastructure

- [ ] **INFRA-01**: Move credentials from code to environment variables
- [ ] **INFRA-02**: Randomize request delays (avoid detection patterns)
- [ ] **INFRA-03**: Handle Reddit rate limits gracefully (read headers, backoff)
- [ ] **INFRA-04**: Batch Google Sheets updates (avoid API quota issues)
- [ ] **INFRA-05**: Run as scheduled job (cron/automated)

## v2 Requirements

### Multi-User

- **USER-01**: Filtered views per freelancer (each sees only their accounts)
- **USER-02**: Performance metrics per freelancer (karma growth comparison)

### Alerts

- **ALERT-01**: Notify on new bans/suspensions
- **ALERT-02**: Notify on proxy failures

### Analytics

- **ANALYTICS-01**: Karma velocity tracking (karma/day rate)
- **ANALYTICS-02**: Historical trend charts in Sheets

### Data Hygiene

- **HYGIENE-01**: Archive profiles deleted from Dolphin (move to Archive tab, not stale in main sheet)
- **HYGIENE-02**: Archive dead Reddit accounts (not_found for 7+ days)

### Reliability

- **RELIABILITY-01**: Retry proxy failures with exponential backoff before marking failed
- **RELIABILITY-02**: Track account warmup status (new accounts flagged for gradual activity)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web dashboard | Validate with Sheets first, build UI later |
| Reddit automation/posting | Different product, tracker is read-only |
| Account creation | High risk, different tool |
| Task assignment system | Handle separately per PROJECT.md |
| Dolphin profile name cleanup | Focus on tracking first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 2 | Complete |
| CORE-05 | Phase 1 | Complete |
| STATUS-01 | Phase 3 | Complete |
| STATUS-02 | Phase 2 | Complete |
| STATUS-03 | Phase 2 | Complete |
| PROXY-01 | Phase 2 | Complete |
| PROXY-02 | Phase 3 | Complete |
| PROXY-03 | Phase 3 | Complete |
| PROXY-04 | Phase 2 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 2 | Complete |
| INFRA-05 | Phase 4 | Complete |
| ALERT-01 | Phase 5 | Complete |
| ALERT-02 | Phase 5 | Complete |
| ANALYTICS-01 | Phase 5 | Complete |
| HYGIENE-01 | Phase 6 | Complete |
| HYGIENE-02 | Phase 6 | Complete |
| RELIABILITY-01 | Phase 6 | Complete |
| RELIABILITY-02 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 17 total (all complete)
- v2 requirements: 7 total (all complete)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-18*
