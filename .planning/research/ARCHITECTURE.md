# Architecture - Dolphin v2

**Researched:** 2026-01-18

## Overview

```
Data Sources          Orchestrator          Data Sink
+-------------+       +-----------+         +---------------+
| Dolphin API |------>|           |-------->| Google Sheets |
| Reddit API  |------>| tracker.py|-------->| karma_history |
| Proxies     |------>|           |         +---------------+
+-------------+       +-----------+
```

## Component Structure

```
dolphin/
  tracker.py          # Main orchestrator
  config.py           # Config from .env
  models.py           # Data classes
  sheets_sync.py      # Google Sheets integration

  sources/
    dolphin.py        # Dolphin Anty adapter
    reddit.py         # Reddit API adapter
    proxy_testers/    # Proxy health checkers
```

## Data Flow (ETL Pattern)

1. **EXTRACT:** Pull profiles from Dolphin Anty
2. **TRANSFORM:** Enrich with Reddit karma/status
3. **LOAD:** Sync to Google Sheets + save history

## Key Patterns

**Adapter Pattern:** Each external API (Dolphin, Reddit, Sheets) has its own module

**Rate Limiter:** Centralized, shared across Reddit calls (3s delay, 60s backoff)

**Two-Way Sheets Sync:**
1. Pull existing rows (get manual edits like niche, notes)
2. Merge with new data (new data wins for karma, status)
3. Push updated rows back

**Idempotent Operations:** Running twice = same result as once

## Build Order

1. **Foundation:** models.py, config.py (move to env vars)
2. **Adapters:** dolphin.py, reddit.py
3. **Sheets:** sheets_sync.py (core new feature)
4. **Proxy:** proxy_testers/ (can defer)
5. **Integration:** Refactor tracker.py to use new modules

## Anti-Patterns to Avoid

- **Monolithic script:** Separate into modules
- **Cell-by-cell updates:** Batch operations only
- **Silent failures:** Log errors, mark affected rows
- **Hardcoded credentials:** Use .env (URGENT - current code has exposed JWT)
