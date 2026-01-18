# Technology Stack - Dolphin v2

**Researched:** 2026-01-18

## Recommended Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.13+ | Runtime | Already using 3.13.5 |
| httpx | 0.27+ | HTTP client | Already in task-server, async-native, proxy support |
| gspread | 6.x | Sheets API | De facto standard, clean API, batch operations |
| google-auth | 2.x | Authentication | Required by gspread |
| pydantic | 2.x | Data models | Already in task-server |
| pydantic-settings | 2.x | Config | Type-safe config from env vars |
| python-dotenv | 1.x | Env loading | Standard approach |

## Google Sheets Integration

**Why gspread:**
- Established Python library (10k+ GitHub stars)
- Cleaner than raw `google-api-python-client`
- Supports batch operations (critical for rate limits)

**Authentication:** Service Account (no user interaction)
1. Create project in Google Cloud Console
2. Enable Google Sheets API
3. Create Service Account, download JSON credentials
4. Share sheet with service account email

## Reddit Status Checking

**Keep direct HTTP** (current approach is correct):
- No API key needed for public user data
- Simple and fast
- No OAuth complexity

**Enhancements needed:**
- Shadowban detection (check about.json + submitted.json)
- Rate limit handling (read X-Ratelimit headers)
- Proxy rotation for high-volume checks

**NOT recommended:** PRAW/AsyncPRAW (overkill, requires OAuth)

## Proxy Testing

```python
async def check_proxy(proxy_url: str) -> dict:
    async with httpx.AsyncClient(proxy=proxy_url, timeout=10) as client:
        response = await client.get("https://httpbin.org/ip")
        return {"healthy": response.status_code == 200}
```

## Configuration

**Move from hardcoded to .env:**
```bash
DOLPHIN_API_KEY=your_key
GOOGLE_SHEETS_ID=spreadsheet_id
GOOGLE_CREDENTIALS_FILE=credentials.json
```

## Installation

```bash
pip install httpx gspread google-auth pydantic pydantic-settings python-dotenv
```
