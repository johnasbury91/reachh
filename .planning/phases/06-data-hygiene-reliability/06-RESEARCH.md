# Phase 6: Data Hygiene & Reliability - Research

**Researched:** 2026-01-19
**Domain:** Data lifecycle management, retry patterns, state tracking
**Confidence:** HIGH

## Summary

This phase focuses on keeping the Google Sheets data clean (archiving stale/dead accounts) and improving proxy health checking with retry logic. The existing codebase has a solid foundation with gspread for Sheets sync, httpx for async HTTP, and a state tracking system for change detection.

The standard approach is:
1. **Stale profile detection:** Compare Dolphin profile IDs against sheet rows to identify profiles deleted from Dolphin
2. **Dead account tracking:** Extend `last_run_state.json` to track "first_seen_not_found" dates for duration-based archival
3. **Archive workflow:** Use gspread to move rows to a separate "Archive" worksheet/tab
4. **Proxy retry logic:** Add tenacity library for exponential backoff with jitter on proxy health checks
5. **Warmup tracking:** Add "warmup_status" field based on account age and karma thresholds

**Primary recommendation:** Extend the existing state.py module to track not_found durations and add archive operations to sheets_sync.py using gspread's multi-worksheet support.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gspread | 6.1.2 | Google Sheets API | Already used in sheets_sync.py, supports multi-worksheet operations |
| httpx | 0.27+ | Async HTTP client | Already used for Dolphin/Reddit/proxy checks |
| pydantic-settings | 2.0+ | Config management | Already in config.py |

### New Addition
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tenacity | 9.0.0 | Retry with backoff | For proxy health check retries with exponential backoff + jitter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tenacity | manual retry loop | tenacity handles edge cases (async, jitter, combining conditions) that manual loops often miss |
| gspread multi-tab | separate sheets | single spreadsheet with tabs keeps all data together, easier to manage |

**Installation:**
```bash
pip install tenacity
# gspread already installed
```

## Architecture Patterns

### State File Extension for Duration Tracking

Current `last_run_state.json` structure:
```json
{
  "accounts": {"username": "status"},
  "proxies": {"proxy_url": "status"},
  "run_at": "2026-01-19T04:06:55+00:00"
}
```

Extended structure for tracking not_found duration:
```json
{
  "accounts": {"username": "status"},
  "account_history": {
    "username": {
      "first_seen_not_found": "2026-01-12T00:00:00+00:00",
      "consecutive_not_found_days": 7
    }
  },
  "proxies": {"proxy_url": "status"},
  "proxy_retries": {
    "proxy_url": {
      "last_fail": "2026-01-19T04:00:00+00:00",
      "consecutive_failures": 3
    }
  },
  "run_at": "2026-01-19T04:06:55+00:00"
}
```

### Warmup Status Categories

Based on Reddit's known thresholds:

| Status | Criteria | Recommended Activity |
|--------|----------|---------------------|
| `new` | Account age < 7 days OR karma < 10 | Minimal activity, lurking only |
| `warming` | Account age 7-30 days OR karma 10-100 | Light commenting, no promotional |
| `ready` | Account age 30+ days AND karma 100+ | Normal activity |
| `established` | Account age 90+ days AND karma 500+ | Full activity, low scrutiny |

### Pattern 1: Multi-Worksheet Archive Operation

**What:** Move rows from main sheet to Archive tab instead of deleting
**When to use:** When archiving stale/dead accounts

```python
# Source: gspread documentation
def archive_rows(spreadsheet, rows_to_archive: list[dict]) -> int:
    """Move rows from Sheet1 to Archive tab."""
    main_sheet = spreadsheet.sheet1

    # Get or create Archive worksheet
    try:
        archive_sheet = spreadsheet.worksheet("Archive")
    except gspread.WorksheetNotFound:
        archive_sheet = spreadsheet.add_worksheet(
            title="Archive",
            rows=1000,
            cols=len(HEADERS) + 2  # +2 for archive_reason, archived_at
        )
        # Write headers
        archive_headers = HEADERS + ["archive_reason", "archived_at"]
        archive_sheet.update("A1:N1", [archive_headers])

    # Append archived rows with metadata
    if rows_to_archive:
        archive_data = []
        for row in rows_to_archive:
            archive_data.append(
                row["values"] + [row["reason"], datetime.now().isoformat()]
            )
        archive_sheet.append_rows(archive_data)

    return len(rows_to_archive)
```

### Pattern 2: Tenacity Retry with Exponential Backoff + Jitter

**What:** Retry proxy health checks with increasing delays
**When to use:** Before marking proxy as failed

```python
# Source: Tenacity documentation
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=30, jitter=5),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.ConnectTimeout)),
)
async def check_proxy_with_retry(proxy_url: str, timeout: float = 10.0) -> ProxyHealth:
    """Check proxy health with automatic retry on transient failures."""
    # ... existing proxy check logic ...
```

### Pattern 3: Duration-Based State Tracking

**What:** Track how long accounts have been in not_found state
**When to use:** For 7+ day archival rule

```python
# Source: Python datetime documentation
from datetime import datetime, timezone, timedelta

def update_not_found_tracking(
    current_accounts: dict[str, str],
    history: dict[str, dict],
    threshold_days: int = 7
) -> tuple[dict, list[str]]:
    """
    Track not_found duration and identify accounts for archival.

    Returns:
        (updated_history, accounts_to_archive)
    """
    now = datetime.now(tz=timezone.utc)
    accounts_to_archive = []

    for username, status in current_accounts.items():
        if status == "not_found":
            if username not in history:
                # First time seeing not_found
                history[username] = {
                    "first_seen_not_found": now.isoformat(),
                    "consecutive_not_found_days": 1,
                }
            else:
                # Calculate days since first seen
                first_seen = datetime.fromisoformat(history[username]["first_seen_not_found"])
                days = (now - first_seen).days
                history[username]["consecutive_not_found_days"] = days

                if days >= threshold_days:
                    accounts_to_archive.append(username)
        else:
            # Account recovered - clear history
            if username in history:
                del history[username]

    return history, accounts_to_archive
```

### Anti-Patterns to Avoid
- **Deleting rows instead of archiving:** Loses historical data, makes auditing impossible
- **Immediate proxy failure marking:** Transient network issues cause false positives
- **Fixed retry delays:** Creates thundering herd on service recovery
- **Checking warmup on every run:** Warmup status should be set once based on account creation date

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry with backoff | Manual for-loop with sleep | tenacity | Handles async, jitter, combining conditions, edge cases |
| Duration calculation | Manual day counting | datetime.timedelta | Handles timezone, leap seconds, edge cases |
| Atomic state file writes | Direct file.write() | tempfile + os.rename | Already implemented in state.py, prevents corruption |
| Multi-worksheet access | Multiple API calls | gspread worksheet methods | Handles caching, API quota management |

**Key insight:** The existing codebase already uses atomic state writes in state.py - this pattern should be extended, not replaced.

## Common Pitfalls

### Pitfall 1: Stale Row Detection Without Profile ID Matching
**What goes wrong:** Comparing usernames instead of profile IDs misses renamed profiles
**Why it happens:** Username seems like the natural key, but Dolphin uses profile_id as the stable identifier
**How to avoid:** Always match on profile_id (column A in sheet, id field in Dolphin API)
**Warning signs:** Duplicate rows appearing, or renamed profiles creating new rows

### Pitfall 2: Archive Tab API Quota Exhaustion
**What goes wrong:** Creating many individual archive operations exceeds Google Sheets 100 req/100s limit
**Why it happens:** Moving rows one-by-one instead of batching
**How to avoid:** Batch all archive operations into single append_rows call
**Warning signs:** gspread.exceptions.APIError with 429 status

### Pitfall 3: Timezone Confusion in Duration Tracking
**What goes wrong:** Comparing naive and aware datetimes gives wrong day counts
**Why it happens:** Mixing datetime.now() (naive) with datetime.now(tz=timezone.utc) (aware)
**How to avoid:** Always use timezone.utc for all timestamps, matching existing state.py pattern
**Warning signs:** Accounts archived too early/late, inconsistent day counts

### Pitfall 4: Proxy Retry Hiding Permanent Failures
**What goes wrong:** Retrying forever on bad credentials or permanently blocked IPs
**Why it happens:** Not distinguishing transient (timeout) from permanent (403/blocked) failures
**How to avoid:** Only retry on ConnectError/ConnectTimeout, not on 403/blocked responses
**Warning signs:** Same proxies constantly in retry loop, never reaching "fail" state

### Pitfall 5: Warmup Status Overwriting
**What goes wrong:** Recalculating warmup status every run, losing "established" accounts
**Why it happens:** Not persisting warmup graduation
**How to avoid:** Warmup status should be one-way progression (new -> warming -> ready -> established)
**Warning signs:** Accounts bouncing between warmup states

## Code Examples

### Example 1: Stale Profile Detection

```python
def detect_stale_profiles(
    dolphin_profile_ids: set[str],
    sheet_profile_ids: set[str]
) -> set[str]:
    """
    Find profile IDs in sheet but not in Dolphin (deleted profiles).

    Args:
        dolphin_profile_ids: Set of profile IDs currently in Dolphin
        sheet_profile_ids: Set of profile IDs currently in Google Sheet

    Returns:
        Set of profile IDs that exist in sheet but not in Dolphin
    """
    return sheet_profile_ids - dolphin_profile_ids
```

### Example 2: Calculating Account Warmup Status

```python
def calculate_warmup_status(
    created_utc: float,
    total_karma: int
) -> str:
    """
    Determine warmup status based on Reddit account age and karma.

    Thresholds based on common Reddit subreddit requirements.
    """
    if created_utc <= 0:
        return "unknown"

    created = datetime.fromtimestamp(created_utc, tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    age_days = (now - created).days

    # One-way progression: once established, always established
    if age_days >= 90 and total_karma >= 500:
        return "established"
    elif age_days >= 30 and total_karma >= 100:
        return "ready"
    elif age_days >= 7 or total_karma >= 10:
        return "warming"
    else:
        return "new"
```

### Example 3: Proxy Health Check with Tenacity

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    before_sleep_log,
)
import logging

logger = logging.getLogger("tracker")

class ProxyHealthChecker:
    """Test proxy connectivity to Reddit with retry logic."""

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=30, jitter=5),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.ConnectTimeout)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def _check_with_retry(
        self,
        client: httpx.AsyncClient,
        proxy_url: str
    ) -> httpx.Response:
        """Inner retry-wrapped request."""
        return await client.get(
            "https://www.reddit.com/robots.txt",
            headers={"User-Agent": self.USER_AGENT},
        )

    async def check(self, proxy_url: str, timeout: float = 10.0) -> ProxyHealth:
        """Check proxy with automatic retry on transient failures."""
        if not proxy_url or proxy_url == "None":
            return ProxyHealth(status="N/A")

        config = normalize_proxy(proxy_url)
        normalized_url = config.url if config else proxy_url

        try:
            async with httpx.AsyncClient(
                proxy=normalized_url,
                timeout=httpx.Timeout(timeout),
            ) as client:
                response = await self._check_with_retry(client, normalized_url)

                if response.status_code == 200:
                    return ProxyHealth(status="pass")
                elif response.status_code in (403, 429):
                    # Don't retry on blocking - it's permanent for this IP
                    return ProxyHealth(
                        status="blocked",
                        error=f"HTTP {response.status_code}",
                    )
                else:
                    return ProxyHealth(
                        status="fail",
                        error=f"HTTP {response.status_code}",
                    )
        except Exception as e:
            # Exhausted retries
            return ProxyHealth(status="fail", error=str(e))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Delete stale rows | Archive to separate tab | Best practice | Preserves history, enables auditing |
| Single retry attempts | Exponential backoff + jitter | tenacity 9.0 | Better distributed systems resilience |
| Naive datetime | Timezone-aware UTC | Python 3.11+ | Consistent cross-timezone behavior |
| gspread 5.x colors | gspread 6.x hex colors | 2024 | Tab colors now use hex strings |

**Deprecated/outdated:**
- gspread 5.x color format (use hex strings in 6.x)
- Manual retry loops (use tenacity)

## Open Questions

Things that couldn't be fully resolved:

1. **Dolphin API for deleted profiles**
   - What we know: Dolphin has a 48-hour trash bin for paid plans
   - What's unclear: No documented API endpoint for listing deleted/trash profiles
   - Recommendation: Detect stale by comparing sheet profile_ids against current Dolphin profile_ids; don't rely on Dolphin trash API

2. **Archive tab column structure**
   - What we know: Should include archive_reason and archived_at metadata
   - What's unclear: Whether to preserve exact main sheet structure or denormalize
   - Recommendation: Keep same columns + 2 extra (archive_reason, archived_at) for easy reference

## Sources

### Primary (HIGH confidence)
- gspread 6.1.2 documentation - worksheet management, batch operations, delete_rows, append_rows
- tenacity documentation - wait_exponential_jitter, stop_after_attempt, async support
- Python datetime documentation - timedelta, timezone handling

### Secondary (MEDIUM confidence)
- [Reddit Warmup Guide](https://multilogin.com/blog/how-to-warm-up-a-reddit-account/) - karma/age thresholds
- [Reddit Poster Eligibility](https://support.reddithelp.com/hc/en-us/articles/33702751586836-Poster-Eligibility-Guide) - official Reddit restrictions
- [pyanty GitHub](https://github.com/DedInc/pyanty) - Dolphin API patterns

### Tertiary (LOW confidence)
- Dolphin Anty help center - trash bin behavior (limited API docs available)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing libraries already in use, tenacity is well-documented
- Architecture: HIGH - extending existing patterns in state.py and sheets_sync.py
- Pitfalls: HIGH - derived from codebase analysis and common gspread/async patterns
- Warmup thresholds: MEDIUM - based on community knowledge, Reddit doesn't publish exact numbers

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain, libraries mature)
