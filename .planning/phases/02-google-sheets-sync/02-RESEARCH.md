# Phase 2: Google Sheets Sync - Research

**Researched:** 2026-01-18
**Domain:** Google Sheets API integration, data synchronization
**Confidence:** HIGH

## Summary

This phase implements automatic synchronization of Reddit account data to Google Sheets using the gspread library. The research confirms gspread 6.2.1 as the de facto standard Python library for Google Sheets with excellent batch operation support critical for avoiding API quota issues.

Key findings:
- gspread 6.x provides `batch_update()` and `batch_get()` methods that consolidate multiple operations into single API calls
- Google Sheets API has 300 requests/minute per project and 60 requests/minute per user limits - batch operations are essential
- Service account authentication is straightforward and works well with environment variables via `service_account_from_dict()`
- Dolphin Anty profiles contain proxy data in a `proxy` object with `host`, `port`, `type`, `login`, `password` fields

**Primary recommendation:** Use gspread 6.x with service account auth, batch all reads/writes, implement upsert pattern keyed on profile_id.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gspread | 6.2.1 | Google Sheets API | De facto Python standard, 10k+ GitHub stars, clean batch API |
| google-auth | 2.x | Service account auth | Required by gspread, official Google library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dateutil | 2.x | Date calculations | Account age calculation (optional, stdlib sufficient) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gspread | google-api-python-client | Lower level, more verbose, same quotas |
| Service account | OAuth2 flow | Requires user interaction, more complex |

**Installation:**
```bash
pip install gspread google-auth
```

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
  sheets_sync.py       # New - Google Sheets sync module
  config.py            # Extended with Sheets config
  models.py            # Extended with SheetRow dataclass
  tracker.py           # Extended to call sheets_sync
```

### Pattern 1: Service Account Authentication
**What:** Non-interactive authentication using service account JSON credentials
**When to use:** Automated scripts, no user interaction required
**Example:**
```python
# Source: https://docs.gspread.org/en/latest/oauth2.html
import json
import os
import gspread

# Load from environment variable (JSON string)
credentials = json.loads(os.environ['GOOGLE_CREDENTIALS_JSON'])
gc = gspread.service_account_from_dict(credentials)
sheet = gc.open_by_key(os.environ['GOOGLE_SHEETS_ID'])
worksheet = sheet.sheet1
```

### Pattern 2: Batch Read/Write Operations
**What:** Consolidate multiple cell operations into single API call
**When to use:** Always - never update cells one-by-one
**Example:**
```python
# Source: https://docs.gspread.org/en/latest/user-guide.html

# Batch read - single API call for multiple ranges
data = worksheet.batch_get(['A1:G100', 'H1:H100'])

# Batch write - single API call for entire data set
worksheet.batch_update([{
    'range': 'A2:G100',
    'values': [[row.username, row.status, row.karma, ...] for row in results],
}])
```

### Pattern 3: Upsert by Unique Key (profile_id)
**What:** Update existing rows or insert new ones based on unique identifier
**When to use:** Idempotent sync operations
**Example:**
```python
# Source: Architectural pattern from prior research

def sync_to_sheet(results: list[AccountResult], worksheet) -> None:
    """Upsert pattern: update existing, append new."""
    # 1. Read existing data (single API call)
    existing = worksheet.get_all_records()
    existing_ids = {row['profile_id']: idx + 2 for idx, row in enumerate(existing)}

    # 2. Partition into updates vs inserts
    updates = []
    inserts = []
    for result in results:
        if result.profile.id in existing_ids:
            row_num = existing_ids[result.profile.id]
            updates.append({'range': f'A{row_num}:K{row_num}', 'values': [to_row(result)]})
        else:
            inserts.append(to_row(result))

    # 3. Batch update existing rows (single API call)
    if updates:
        worksheet.batch_update(updates)

    # 4. Batch append new rows (single API call)
    if inserts:
        worksheet.append_rows(inserts)
```

### Pattern 4: Two-Way Sync (Preserve Manual Edits)
**What:** Read existing data, merge with new data, write back
**When to use:** When spreadsheet has manual columns (notes, niche) that should not be overwritten
**Example:**
```python
# Read existing (preserves manual columns like Notes, Niche)
existing = {row['profile_id']: row for row in worksheet.get_all_records()}

# Merge: automated data wins for karma/status, manual data preserved
for result in results:
    pid = result.profile.id
    if pid in existing:
        # Keep manual columns from existing row
        result.notes = existing[pid].get('Notes', '')
        result.niche = existing[pid].get('Niche', '')
```

### Anti-Patterns to Avoid
- **Cell-by-cell updates:** Each `update_acell()` is one API request - use `batch_update()` instead
- **Unbatched reads:** Each `cell()` call is one request - use `get_all_values()` or `batch_get()`
- **No idempotency:** Without profile_id as key, reruns create duplicates
- **Ignoring rate limits:** 60 req/min/user is easy to hit with cell-by-cell ops

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google auth | Custom OAuth flow | `gspread.service_account_from_dict()` | Handles token refresh, scopes |
| Rate limit handling | Sleep/retry loops | `BackOffHTTPClient` (experimental) or batch ops | Built-in exponential backoff |
| Cell range notation | String manipulation | `gspread.utils.rowcol_to_a1()` | Handles edge cases |
| Sheet structure | Manual column indices | `get_all_records()` returns dicts | Header-based access |

**Key insight:** gspread abstracts the entire Sheets API v4 complexity. The raw API requires understanding of `spreadsheetId`, `sheetId`, value ranges, and update modes. gspread handles all of this.

## Common Pitfalls

### Pitfall 1: API Quota Exhaustion (429 Errors)
**What goes wrong:** Too many requests cause `429: Too many requests` errors
**Why it happens:** Cell-by-cell updates, unbatched reads, tight loops
**How to avoid:**
- Always use `batch_update()` and `batch_get()`
- Maximum ~5 API calls per sync operation (read all, partition, update batch, insert batch, verify)
- For 500+ accounts, stay well under 60 req/min limit
**Warning signs:** `gspread.exceptions.APIError` with code 429

### Pitfall 2: Empty Cell Truncation
**What goes wrong:** Rows with trailing empty cells get truncated in responses
**Why it happens:** Google Sheets API optimizes by not returning trailing empty cells
**How to avoid:**
- Define explicit column count in sheet structure
- Use `get_all_records()` which returns dicts (handles missing keys gracefully)
- Set `default_blank=''` parameter
**Warning signs:** Shorter rows than expected, KeyError on dict access

### Pitfall 3: Service Account Not Shared
**What goes wrong:** `SpreadsheetNotFound` error when opening sheet
**Why it happens:** Service account email not added as sheet editor
**How to avoid:**
- Share sheet with service account `client_email` from credentials JSON
- Grant Editor access (not Viewer) for write operations
**Warning signs:** `gspread.exceptions.SpreadsheetNotFound`

### Pitfall 4: Credential Exposure
**What goes wrong:** Service account JSON committed to git
**Why it happens:** Storing credentials file in project directory
**How to avoid:**
- Store credentials as JSON string in environment variable
- Use `service_account_from_dict()` to load from env
- Add `*.json` credential files to `.gitignore`
**Warning signs:** Secrets detected in git diff

### Pitfall 5: Timezone Issues in Account Age
**What goes wrong:** Account age off by hours/days
**Why it happens:** Reddit's `created_utc` is UTC, naive datetime comparisons
**How to avoid:**
- Always use UTC: `datetime.utcfromtimestamp()` or `datetime.fromtimestamp(ts, tz=timezone.utc)`
- Display age in days (integer) to avoid timezone precision issues
**Warning signs:** Age differs from Reddit profile page

### Pitfall 6: Karma Delta Calculation Errors
**What goes wrong:** Incorrect or missing karma deltas
**Why it happens:** First run has no history, account status changes (suspended -> active)
**How to avoid:**
- Handle first run: delta = 0 when no prior record exists
- Only calculate delta for "active" accounts with prior "active" record
- Store history keyed by username, dated by check date
**Warning signs:** Negative deltas that don't match reality, None values in delta column

## Code Examples

Verified patterns from official sources:

### Opening Spreadsheet by ID
```python
# Source: https://docs.gspread.org/en/latest/oauth2.html
import gspread
import json
import os

credentials = json.loads(os.environ['GOOGLE_CREDENTIALS_JSON'])
gc = gspread.service_account_from_dict(credentials)

# Open by spreadsheet ID (from URL: https://docs.google.com/spreadsheets/d/{ID}/...)
spreadsheet = gc.open_by_key(os.environ['GOOGLE_SHEETS_ID'])
worksheet = spreadsheet.sheet1  # or spreadsheet.worksheet("Sheet Name")
```

### Reading All Data as Records
```python
# Source: https://docs.gspread.org/en/latest/user-guide.html
# Returns list of dicts using header row as keys
records = worksheet.get_all_records(default_blank='')

# Example: [{'profile_id': '123', 'username': 'foo', 'karma': 100}, ...]
for record in records:
    print(f"{record['username']}: {record['karma']}")
```

### Batch Update Multiple Ranges
```python
# Source: https://docs.gspread.org/en/latest/user-guide.html
# Important: In gspread 6.x, argument order is (range_name, values)
worksheet.batch_update([
    {
        'range': 'A2:K2',
        'values': [['id1', 'user1', 'active', 100, 50, 50, '2y 3m', 'Owner1', 'proxy1', '+5', '2026-01-18']],
    },
    {
        'range': 'A3:K3',
        'values': [['id2', 'user2', 'active', 200, 150, 50, '1y 0m', 'Owner2', 'proxy2', '+10', '2026-01-18']],
    },
])
```

### Append Multiple Rows
```python
# Source: https://docs.gspread.org/en/latest/api/models/worksheet.html
# Appends at the end of existing data
new_rows = [
    ['id3', 'user3', 'active', 50, 30, 20, '6m', 'Owner1', 'proxy3', '+2', '2026-01-18'],
    ['id4', 'user4', 'suspended', 0, 0, 0, 'N/A', 'Owner2', 'N/A', 'N/A', '2026-01-18'],
]
worksheet.append_rows(new_rows)
```

### Account Age Calculation
```python
# Source: Standard Python datetime
from datetime import datetime, timezone

def calculate_account_age(created_utc: float) -> str:
    """Convert Reddit created_utc to human-readable age."""
    if created_utc <= 0:
        return "N/A"

    created = datetime.fromtimestamp(created_utc, tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    delta = now - created

    days = delta.days
    years = days // 365
    months = (days % 365) // 30

    if years > 0:
        return f"{years}y {months}m"
    elif months > 0:
        return f"{months}m"
    else:
        return f"{days}d"
```

### Extracting Proxy from Dolphin Profile
```python
# Source: Dolphin Anty API (inferred from pyanty and help docs)
# Proxy object structure in profile response

def format_proxy(proxy_data: dict | None) -> str:
    """Format proxy for display in sheet."""
    if not proxy_data:
        return "None"

    # Proxy object has: name, host, port, type, login, password (optional)
    host = proxy_data.get('host', '')
    port = proxy_data.get('port', '')
    proxy_type = proxy_data.get('type', 'http')

    if not host:
        return "None"

    return f"{proxy_type}://{host}:{port}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gspread 5.x arg order | gspread 6.x swapped args in batch_update | gspread 6.0 (2024) | Use named arguments for compatibility |
| Cell-by-cell updates | Batch operations | Always was better | 10-100x fewer API calls |
| File-based credentials | Environment variables | Security best practice | No credentials in git |
| `BackOffHTTPClient` | Use batch ops + manual retry | BackOff still experimental | More predictable behavior |

**Deprecated/outdated:**
- gspread 5.x positional arguments in `batch_update()` - use named args or swap order for 6.x
- `BackOffHTTPClient` - marked "not production ready", may retry on permission errors

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Dolphin Anty proxy response structure**
   - What we know: Proxy has `host`, `port`, `type`, `login`, `password`, `changeIpUrl` fields
   - What's unclear: Whether proxy is returned in `/browser_profiles` GET response or requires separate call
   - Recommendation: Test with actual API; extend DolphinClient to capture proxy field if present

2. **BackOffHTTPClient production readiness**
   - What we know: Marked experimental, retries on 403 permission errors incorrectly
   - What's unclear: Whether it's safe for this use case with batch operations
   - Recommendation: Don't use; implement manual exponential backoff only if batch operations still hit limits

## Sources

### Primary (HIGH confidence)
- [gspread Official Documentation](https://docs.gspread.org/en/latest/) - Authentication, batch operations, worksheet methods
- [gspread User Guide](https://docs.gspread.org/en/latest/user-guide.html) - Code examples, best practices
- [Google Sheets API Limits](https://developers.google.com/workspace/sheets/api/limits) - Quota details (300/min project, 60/min user)
- [gspread PyPI](https://pypi.org/project/gspread/) - Version 6.2.1, Python 3.8+ requirement

### Secondary (MEDIUM confidence)
- [gspread Worksheet API](https://docs.gspread.org/en/latest/api/models/worksheet.html) - Method signatures verified
- [gspread GitHub](https://github.com/burnash/gspread) - Project status, issues
- [pyanty GitHub](https://github.com/DedInc/pyanty) - Dolphin Anty Python wrapper patterns

### Tertiary (LOW confidence)
- [Dolphin Anty Help Center](https://help.dolphin-anty.com/en/articles/8570388-proxy) - Proxy format info, not API schema
- WebSearch results for proxy structure - Multiple sources agree on field names

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gspread 6.x is clearly the standard, well documented
- Architecture: HIGH - Batch operations and upsert pattern well established
- Pitfalls: HIGH - API quota limits documented officially, common issues in GitHub issues
- Proxy extraction: MEDIUM - Field names confirmed, exact API response needs testing

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - gspread is stable)
