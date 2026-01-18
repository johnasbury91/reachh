# Research Summary - Dolphin v2

**Project:** Reddit account farm tracker syncing to Google Sheets
**Researched:** 2026-01-18

## Key Findings

### Stack
- **gspread** for Google Sheets (de facto standard, batch support)
- **httpx** for HTTP (already in task-server, proxy support)
- **pydantic** for data models (type-safe)
- Move credentials to **.env** (current config.py has exposed JWT - URGENT)

### Features
- **Already built:** Account tracking, karma, status, categorization
- **Core gap:** Google Sheets sync (entire value prop)
- **Defer:** Web dashboard, automation, task management

### Architecture
- **ETL pattern:** Extract (Dolphin/Reddit) → Transform (enrich) → Load (Sheets)
- **Adapter pattern:** Isolate each API into module
- **Two-way sync:** Pull manual edits from Sheets, merge, push back

### Critical Pitfalls
1. **Credential exposure** - JWT in plain text (URGENT)
2. **Predictable patterns** - Fixed delays trigger detection
3. **Single-IP checking** - Correlates accounts
4. **Missing shadowbans** - Accounts look active but are hidden

## Recommended Phases

| Phase | Focus | Key Work |
|-------|-------|----------|
| 1 | Foundation | Move creds to .env, randomize delays, models/config |
| 2 | Core Features | Google Sheets sync, proxy integration |
| 3 | Enhanced Detection | Shadowban detection, proxy health |
| 4 | Polish | Filtered views, karma trends, alerts |

## Success Criteria

- [ ] See all accounts in Google Sheets automatically
- [ ] Karma + status updated daily without manual work
- [ ] Proxy health visible per account
- [ ] Freelancers see their accounts, admin sees all
