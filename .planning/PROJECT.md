# Dolphin v2

## What This Is

A Python automation tool that tracks Reddit account farm operations and syncs to Google Sheets. Replaces manual spreadsheet updates with automated pulls from Dolphin Anty API, Reddit karma checks, and proxy health monitoring — giving you and your freelancers a real-time view of account status at a glance.

## Core Value

See the health of your entire Reddit account farm in one Google Sheet — accounts, karma, bans, proxies — without running scripts or manually updating cells.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Pull all browser profiles from Dolphin Anty API
- [ ] Check Reddit karma for each account (total, comment, link)
- [ ] Detect account status (active, banned, suspended, shadowbanned)
- [ ] Test proxy health across multiple providers
- [ ] Sync all data to Google Sheets automatically
- [ ] Show clear columns: Username, Status, Niche, Freelancer, Karma, Proxy
- [ ] Track karma change over time (daily delta)
- [ ] Support multiple freelancers (each sees their rows)

### Out of Scope

- Web dashboard — using Google Sheets for now, validate process first
- Dolphin Anty profile name cleanup — skip for now, focus on tracker
- Task management for freelancers — handle separately
- Integration with Reachh client app — different project
- Integration with task server — different project

## Context

**Current state:**
- `dolphin/tracker.py` — Python script that pulls from Dolphin Anty, checks Reddit karma, outputs CSV
- `dolphin/karma_history.json` — Historical karma data
- Manual spreadsheets for account/proxy/freelancer tracking (incomplete, tedious)

**Existing infrastructure:**
- Dolphin Anty API access (credentials in `dolphin/config.py`)
- Reddit accounts managed through Dolphin Anty browser profiles
- Multiple proxy providers (Decodo and others)
- Freelancer team managing accounts

**Pain points being solved:**
- Manual spreadsheet updates are tedious and fall behind
- Can't see at a glance which accounts are banned/healthy
- No automated proxy health checks
- Karma tracking requires running scripts manually

## Constraints

- **Tech stack**: Python (extend existing `tracker.py`)
- **Output**: Google Sheets (not a web app — validate process first)
- **Scope**: MVP — keep it simple, don't over-engineer
- **Proxy providers**: Must support multiple providers, not just Decodo

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google Sheets over web app | Validate the process before building software | — Pending |
| Extend existing tracker.py | Don't rewrite, improve what works | — Pending |
| Skip profile name cleanup | Focus on tracking first, clean data later | — Pending |

---
*Last updated: 2026-01-18 after initialization*
