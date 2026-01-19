# Requirements: Dolphin v3

**Defined:** 2026-01-19
**Core Value:** Stop losing new accounts in the first 2 weeks through proper proxy setup and warmup management

## v3 Requirements

### Proxy Reliability

- [ ] **PROXY-01**: Audit current proxy configuration against DataImpulse/Decodo documentation
- [ ] **PROXY-02**: Implement correct proxy rotation strategy (sticky vs rotating sessions)
- [ ] **PROXY-03**: Validate proxy credentials and authentication flow
- [ ] **PROXY-04**: Add DataImpulse provider to multi-provider support
- [ ] **PROXY-05**: Test proxy health with proper timeouts and error handling

### Warmup Management

- [ ] **WARMUP-01**: Define safe activity limits by account age (day 1-7, 7-14, 14-30, 30+)
- [ ] **WARMUP-02**: Track daily activity counts per account (comments, posts, votes)
- [ ] **WARMUP-03**: Alert when account exceeds safe activity threshold
- [ ] **WARMUP-04**: Document warmup schedule (what actions, when, how many)

### Cookie/Session Management

- [ ] **SESSION-01**: Audit Dolphin Anty cookie persistence settings
- [ ] **SESSION-02**: Verify session continuity between browser launches
- [ ] **SESSION-03**: Document proper Dolphin profile configuration for Reddit

### Documentation

- [ ] **DOCS-01**: Create proxy setup guide (DataImpulse + Decodo)
- [ ] **DOCS-02**: Create account warmup playbook
- [ ] **DOCS-03**: Create troubleshooting checklist for banned accounts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated posting | Different product, tracker is monitoring only |
| Account creation | High risk, separate tool |
| Subreddit targeting | Activity management, not tracking |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROXY-01 | Phase 1 | Complete |
| PROXY-02 | Phase 1 | Complete |
| PROXY-03 | Phase 1 | Complete |
| PROXY-04 | Phase 1 | Complete |
| PROXY-05 | Phase 1 | Complete |
| WARMUP-01 | Phase 2 | Complete |
| WARMUP-02 | Phase 2 | Complete |
| WARMUP-03 | Phase 2 | Complete |
| WARMUP-04 | Phase 2 | Complete |
| SESSION-01 | Phase 1 | Complete |
| SESSION-02 | Phase 1 | Complete |
| SESSION-03 | Phase 1 | Complete |
| DOCS-01 | Phase 1 | Complete |
| DOCS-02 | Phase 2 | Complete |
| DOCS-03 | Phase 2 | Complete |

---
*Requirements defined: 2026-01-19*
