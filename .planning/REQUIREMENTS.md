# v4 Requirements — Reliability & Insights

## v1 Requirements

### Reliability

- [ ] **REL-01**: Reddit checker handles rate limits gracefully with longer delays between batches (prevent false not_found results)
- [ ] **REL-02**: Reddit checker retries rate-limited requests with exponential backoff before giving up
- [ ] **REL-03**: Profile scan reports confidence level when rate limits affected results

### Automation

- [ ] **AUTO-01**: Weekly scheduled cleanup removes dead profiles (not_found for 7+ days)
- [ ] **AUTO-02**: Weekly scheduled proxy audit detects misconfigurations
- [ ] **AUTO-03**: Cleanup and audit results sent via existing alert system (macOS/Slack)

### Visibility

- [ ] **VIS-01**: Health Score column (0-100) combining warmup status, karma velocity, proxy health, account age
- [ ] **VIS-02**: Health score formula is documented and tunable via config
- [ ] **VIS-03**: 7-day karma trend stored for each account (historical data)
- [ ] **VIS-04**: Sparkline visualization in Google Sheet showing karma trend

## v2 Requirements (Deferred)

- [ ] **VIS-05**: 30-day historical trends (longer history)
- [ ] **AUTO-04**: Auto-remediate proxy issues when detected
- [ ] **REL-04**: Proxy failover to secondary provider

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web dashboard | Google Sheets is sufficient |
| Real-time monitoring | Daily runs are sufficient |
| Task server integration | Separate system, deferred |

## Traceability

| Requirement | Phase | Plan |
|-------------|-------|------|
| REL-01 | TBD | TBD |
| REL-02 | TBD | TBD |
| REL-03 | TBD | TBD |
| AUTO-01 | TBD | TBD |
| AUTO-02 | TBD | TBD |
| AUTO-03 | TBD | TBD |
| VIS-01 | TBD | TBD |
| VIS-02 | TBD | TBD |
| VIS-03 | TBD | TBD |
| VIS-04 | TBD | TBD |
