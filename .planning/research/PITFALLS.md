# Pitfalls - Dolphin v2

**Researched:** 2026-01-18

## Critical Pitfalls

### 1. Predictable Request Patterns (Fingerprinting)

**Problem:** Fixed 3-second delays + sequential checking = detectable automation

**Current code issue (tracker.py):**
```python
time.sleep(REDDIT_DELAY)  # Fixed 3-second delay
```

**Fix:**
- Randomize delays: `random.uniform(2.0, 5.0)`
- Shuffle check order each run
- Add jitter to schedule

**Phase:** 1 (core refactoring)

### 2. Single-IP Bulk Checking

**Problem:** All Reddit checks from one IP correlates accounts in Reddit's systems

**Fix:** Route checks through account's assigned proxy

**Phase:** 2 (proxy integration)

### 3. Missing Shadowban Detection

**Problem:** Code only detects suspended (403) and not_found (404), not shadowbans. Shadowbanned accounts appear "active" but content is hidden.

**Fix:** Check about.json + submitted.json. If posts exist but don't appear in subreddit /new, account is shadowbanned.

**Phase:** 3 (enhanced detection)

### 4. Credentials in Code (URGENT)

**Current issue (config.py):**
```python
DOLPHIN_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJS..."  # JWT exposed
```

**Fix:** Move to .env immediately, add config.py to .gitignore

**Phase:** 1 (URGENT)

## Moderate Pitfalls

### 5. Google Sheets API Quota

**Limit:** ~300 requests/minute/project

**Fix:** Batch all updates, write entire range at once

### 6. No Idempotency

**Problem:** Failed sync + retry = duplicate rows

**Fix:** Use profile_id as unique key, upsert pattern

### 7. Proxy Health False Positives

**Problem:** Proxy works for httpbin but blocked on Reddit

**Fix:** Test against actual Reddit endpoints

## Phase Mapping

| Phase | Pitfalls to Address |
|-------|---------------------|
| 1 - Core | Credentials, patterns, rate limits |
| 2 - Integration | Proxy routing, Sheets batching |
| 3 - Detection | Shadowbans, alerts |
