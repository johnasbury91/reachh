# Dolphin

## What This Is

A Python automation tool that tracks Reddit account farm operations and syncs to Google Sheets. Pulls from Dolphin Anty API, checks Reddit karma, monitors proxy health, detects bans/shadowbans, and archives stale accounts — giving you and your freelancers a real-time view of account status at a glance.

## Core Value

See the health of your entire Reddit account farm in one Google Sheet — accounts, karma, bans, proxies — updated automatically every day.

## Current State

**Milestone v2 Complete** (2026-01-19)

The system is production-ready and runs automatically:
- Daily tracker runs at 9 AM via launchd
- Weekly karma reports on Sundays at 10 AM
- Notifications on bans and proxy failures
- Archive tab for stale/dead accounts

### What's Running

| Component | Schedule | Purpose |
|-----------|----------|---------|
| tracker.py | Daily 9 AM | Sync all accounts to Google Sheet |
| reporting.py | Sunday 10 AM | Weekly karma velocity report |

### Google Sheet Columns (13)

Username, Status, Niche, Freelancer, Karma, Comment Karma, Link Karma, Warmup Status, Account Age, Karma Delta, Proxy, Proxy Health, Last Checked

### Key Files

- `dolphin/tracker.py` — Main orchestrator
- `dolphin/sheets_sync.py` — Google Sheets sync
- `dolphin/state.py` — State tracking for alerts
- `dolphin/alerts.py` — macOS/Slack notifications
- `dolphin/reporting.py` — Weekly reports

## Validated Learnings

| Learning | Source | Impact |
|----------|--------|--------|
| Google Sheets works well for this use case | v2 usage | Continue with Sheets, no web dashboard needed yet |
| Daily runs are sufficient frequency | v2 usage | No need for more frequent runs |
| Freelancers can filter by their name in Sheets | v2 usage | No need for per-user views in code |

## Ideas for Future

- Web dashboard (if Sheets becomes limiting)
- Historical trend charts in Sheets (ANALYTICS-02)
- Integration with task server
- Account health scoring

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
*Last updated: 2026-01-19 after v2 milestone completion*
