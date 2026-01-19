# Dolphin

## What This Is

A Python automation tool that tracks Reddit account farm operations and syncs to Google Sheets. Pulls from Dolphin Anty API, checks Reddit karma, monitors proxy health, detects bans/shadowbans, and archives stale accounts — giving you and your freelancers a real-time view of account status at a glance.

## Core Value

See the health of your entire Reddit account farm in one Google Sheet — accounts, karma, bans, proxies — updated automatically every day.

## Current Milestone: v4 — Reliability & Insights

**Goal:** Make the tracker self-maintaining and surface account health at a glance.

**Target features:**
- Fix Reddit checker rate limiting (prevent false positives that caused 21 deleted active profiles)
- Scheduled weekly profile cleanup (automate dead account removal)
- Scheduled weekly proxy audits (catch misconfigurations early)
- Account health score column (composite indicator combining warmup, karma velocity, proxy health, age)
- Sparkline trends in Google Sheets (7-day karma/activity visualization)

## Previous State (v3 Complete)

**Milestone v3** (2026-01-19) delivered account survival features:
- Daily tracker runs at 9 AM via launchd
- Weekly karma reports on Sundays at 10 AM
- Notifications on bans, proxy failures, and warmup threshold violations
- Archive tab for stale/dead accounts
- Warmup tracking with activity limits by account age
- Profile audit tool to detect proxy misconfigurations

### What's Running

| Component | Schedule | Purpose |
|-----------|----------|---------|
| tracker.py | Daily 9 AM | Sync all accounts to Google Sheet (now with warmup data) |
| reporting.py | Sunday 10 AM | Weekly karma velocity report |
| audit_profiles.py | Manual | Detect proxy misconfigurations |

### Google Sheet Columns (17)

Username, Status, Niche, Freelancer, Karma, Comment Karma, Link Karma, Warmup Status, Account Age, Karma Delta, Proxy, Proxy Health, Comments Today, Posts Today, Warmup Tier, Limit Status, Last Checked

### Key Files

- `dolphin/tracker.py` — Main orchestrator
- `dolphin/sheets_sync.py` — Google Sheets sync (17 columns)
- `dolphin/warmup.py` — Warmup tier limits and threshold checking
- `dolphin/audit_profiles.py` — Profile audit with issue detection
- `dolphin/state.py` — State tracking for alerts
- `dolphin/alerts.py` — macOS/Slack notifications (incl. warmup warnings)
- `dolphin/reporting.py` — Weekly reports

### Documentation

- `dolphin/docs/PROXY_SETUP.md` — DataImpulse/Decodo proxy configuration
- `dolphin/docs/DOLPHIN_CONFIG.md` — Profile setup and verification
- `dolphin/docs/WARMUP_PLAYBOOK.md` — Day-by-day warmup schedule
- `dolphin/docs/TROUBLESHOOTING.md` — Ban diagnosis and recovery

## Validated Learnings

| Learning | Source | Impact |
|----------|--------|--------|
| Google Sheets works well for this use case | v2 usage | Continue with Sheets, no web dashboard needed yet |
| Daily runs are sufficient frequency | v2 usage | No need for more frequent runs |
| Freelancers can filter by their name in Sheets | v2 usage | No need for per-user views in code |
| Proxy credentials stored in Dolphin "name" field | v3 audit | Must parse full URL from name, not just host |
| 102 profiles sharing 32 sessions is a major issue | v3 audit | Each account needs unique sticky session |
| Residential proxies need 30s+ timeout | v3 testing | 10s timeout causes false failures |
| 4-tier warmup (3/5/8/15 comments/day) | v3 research | Safe limits based on Reddit anti-spam research |

## Ideas for Future

- Web dashboard (if Sheets becomes limiting)
- Integration with task server
- Proxy failover (secondary provider if DataImpulse fails)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web dashboard | Sheets works, validate need first |
| Reddit automation/posting | Different product |
| Account creation | High risk, different tool |
| Task assignment | Separate system |

## Constraints

- **Tech stack**: Python (existing codebase)
- **Output**: Google Sheets
- **Automation**: macOS launchd

---
*Last updated: 2026-01-20 — v4 milestone started*
