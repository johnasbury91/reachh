# Phase 1: Foundation & Security - Research

**Researched:** 2026-01-18
**Domain:** Credential security, HTTP clients, rate limiting, anti-detection patterns
**Confidence:** HIGH

## Summary

This phase addresses three critical areas: (1) removing hardcoded credentials from `config.py` which currently exposes a JWT token in plain text, (2) implementing randomized request delays to avoid detection patterns, and (3) adding proper rate limit handling for Reddit's public JSON endpoints.

The existing codebase uses `requests` library with fixed 3-second delays, hardcoded credentials, and basic retry logic. The recommended approach uses `pydantic-settings` for type-safe configuration from `.env` files, `httpx` for modern async HTTP with connection pooling, and exponential backoff with jitter for rate limit handling.

**Primary recommendation:** Use pydantic-settings (not raw python-dotenv) for configuration, httpx AsyncClient for HTTP requests, and implement exponential backoff with random jitter (2-5 second base delays) for all Reddit requests.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pydantic-settings | 2.x | Configuration from env | Type-safe validation, .env support, integrates with pydantic models |
| httpx | 0.28+ | HTTP client | Async-native, connection pooling, proxy support, already in task-server |
| pydantic | 2.x | Data models | Type validation, already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dotenv | 1.x | .env file loading | Only if pydantic-settings not used (NOT recommended) |
| tenacity | 8.x | Retry logic | Complex retry scenarios (optional - can hand-roll simpler version) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pydantic-settings | python-dotenv + os.getenv | No validation, no type safety, more boilerplate |
| httpx | requests | No async, worse connection pooling, but simpler for sync-only code |
| Custom backoff | tenacity | Tenacity adds dependency; custom is simpler for our use case |

**Installation:**
```bash
pip install httpx pydantic pydantic-settings python-dotenv
```

Note: `python-dotenv` is a dependency of `pydantic-settings` for .env file support.

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
  config.py           # Settings class loading from .env
  models.py           # Pydantic data models
  tracker.py          # Main orchestrator
  sources/
    dolphin.py        # Dolphin Anty API adapter
    reddit.py         # Reddit API adapter with rate limiting
```

### Pattern 1: Settings with pydantic-settings
**What:** Type-safe configuration loaded from environment variables and .env files
**When to use:** Any configuration that varies by environment or contains secrets

```python
# config.py
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Dolphin Anty
    dolphin_api_key: SecretStr  # SecretStr hides value in logs
    dolphin_api_url: str = "https://dolphin-anty-api.com"

    # Rate limiting
    reddit_min_delay: float = 2.0
    reddit_max_delay: float = 5.0
    reddit_backoff_base: float = 2.0
    reddit_max_retries: int = 5

# Singleton instance
settings = Settings()
```

Source: [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)

### Pattern 2: Random Delay with Jitter
**What:** Randomized delays between requests to avoid detection patterns
**When to use:** Any repeated HTTP requests to the same service

```python
import random
import asyncio

async def random_delay(min_seconds: float = 2.0, max_seconds: float = 5.0) -> None:
    """Sleep for a random duration to avoid detection patterns."""
    delay = random.uniform(min_seconds, max_seconds)
    await asyncio.sleep(delay)
```

Source: [Python Web Scraping Best Practices](https://www.shellhacks.com/python-sleep-random-time-web-scraping/)

### Pattern 3: Exponential Backoff with Jitter
**What:** Progressively longer delays after failures, with random variation
**When to use:** Rate limit (429) or server error (5xx) responses

```python
import random
import asyncio
import httpx

async def fetch_with_backoff(
    client: httpx.AsyncClient,
    url: str,
    max_retries: int = 5,
    base_delay: float = 2.0,
) -> httpx.Response:
    """Fetch URL with exponential backoff on rate limits."""
    for attempt in range(max_retries):
        response = await client.get(url)

        if response.status_code == 429:
            # Check Retry-After header first
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                delay = float(retry_after)
            else:
                # Exponential backoff with jitter
                delay = (base_delay * (2 ** attempt)) + random.uniform(0, 1)

            await asyncio.sleep(delay)
            continue

        return response

    raise RuntimeError(f"Max retries exceeded for {url}")
```

Source: [Web Scraping Club - Exponential Backoff](https://substack.thewebscraping.club/p/rate-limit-scraping-exponential-backoff)

### Pattern 4: httpx AsyncClient with Connection Pooling
**What:** Reuse HTTP connections across multiple requests
**When to use:** Multiple requests to the same host (Reddit, Dolphin API)

```python
import httpx

async def check_accounts(usernames: list[str]) -> list[dict]:
    """Check multiple Reddit accounts reusing connections."""
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(10.0),
        headers={"User-Agent": "DolphinTracker/2.0 (contact@example.com)"},
    ) as client:
        results = []
        for username in usernames:
            await random_delay()  # Anti-detection
            result = await fetch_with_backoff(
                client,
                f"https://www.reddit.com/user/{username}/about.json"
            )
            results.append(result)
        return results
```

Source: [HTTPX Documentation](https://www.python-httpx.org/advanced/clients/)

### Anti-Patterns to Avoid
- **Fixed delays:** `time.sleep(3)` creates detectable patterns. Use `random.uniform(2, 5)`.
- **Hardcoded credentials:** Never store API keys in source code.
- **New client per request:** Wastes connections. Use single AsyncClient with context manager.
- **Ignoring rate limit headers:** Always check `X-Ratelimit-*` and `Retry-After` headers.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config from env vars | Manual `os.getenv()` with validation | pydantic-settings | Type validation, .env support, SecretStr for hiding secrets |
| HTTP client with retries | `requests` + custom retry loop | httpx + custom backoff | Connection pooling, async support, cleaner API |
| .env file parsing | Manual file reading | pydantic-settings (uses python-dotenv internally) | Handles edge cases, encoding, interpolation |

**Key insight:** pydantic-settings combines python-dotenv's .env loading with pydantic's validation. Using both separately is redundant and error-prone.

## Common Pitfalls

### Pitfall 1: Exposed Credentials in Git History
**What goes wrong:** JWT token committed to repo, even after removal it exists in git history
**Why it happens:** `config.py` was committed before `.gitignore` was set up
**How to avoid:**
1. Add `.env` and `config.py` (if it ever contains secrets) to `.gitignore` FIRST
2. Use `git filter-repo` or BFG Repo-Cleaner to remove from history
3. Rotate the compromised token immediately
**Warning signs:** Any hardcoded string that looks like a JWT or API key

### Pitfall 2: Fixed Request Intervals
**What goes wrong:** Sending requests every exactly 3 seconds creates a detectable automation signature
**Why it happens:** Developers use simple `time.sleep(N)` for rate limiting
**How to avoid:** Always use `random.uniform(min, max)` for delays
**Warning signs:** Any `time.sleep()` call with a constant value

### Pitfall 3: Ignoring Reddit Rate Limit Headers
**What goes wrong:** Hitting rate limits repeatedly, potential IP ban
**Why it happens:** Code only checks status code 429, ignores headers
**How to avoid:** Parse and respect these headers:
- `X-Ratelimit-Remaining`: Requests left in current window
- `X-Ratelimit-Reset`: Seconds until window resets
- `Retry-After`: Explicit wait time (if present)
**Warning signs:** Frequent 429 responses, progressively longer ban periods

### Pitfall 4: Default User-Agent Strings
**What goes wrong:** Reddit aggressively rate-limits or blocks default Python user agents
**Why it happens:** Using `requests` default UA or generic "Python/3.x"
**How to avoid:** Set a unique, descriptive User-Agent with contact info
**Warning signs:** Getting rate-limited faster than expected (~10 req/min vs ~60)

### Pitfall 5: Sync HTTP in Event Loop
**What goes wrong:** Using `requests` (sync) in async context blocks the entire event loop
**Why it happens:** Mixing sync `requests` library with async code
**How to avoid:** Use `httpx.AsyncClient` for async code, or `httpx.Client` for sync
**Warning signs:** Poor performance when checking many accounts

## Code Examples

Verified patterns from official sources:

### Complete Settings Class
```python
# dolphin/config.py
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # Dolphin Anty API
    dolphin_api_key: SecretStr
    dolphin_api_url: str = "https://dolphin-anty-api.com"

    # Reddit checking
    reddit_user_agent: str = "DolphinTracker/2.0"
    reddit_min_delay: float = 2.0
    reddit_max_delay: float = 5.0
    reddit_max_retries: int = 5
    reddit_backoff_base: float = 2.0

    @field_validator("dolphin_api_key", mode="before")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Ensure API key is not empty."""
        if not v or v.strip() == "":
            raise ValueError("DOLPHIN_API_KEY must be set")
        return v

# Create singleton
settings = Settings()
```

### .env File Template
```bash
# dolphin/.env.example (commit this)
DOLPHIN_API_KEY=your_jwt_token_here
DOLPHIN_API_URL=https://dolphin-anty-api.com

# Optional overrides
REDDIT_USER_AGENT=DolphinTracker/2.0 (contact@yoursite.com)
REDDIT_MIN_DELAY=2.0
REDDIT_MAX_DELAY=5.0
```

### Reddit Checker with Rate Limit Handling
```python
# dolphin/sources/reddit.py
import random
import asyncio
from dataclasses import dataclass
from typing import Literal
import httpx

from config import settings

@dataclass
class RedditStatus:
    username: str
    status: Literal["active", "suspended", "not_found", "rate_limited", "error"]
    total_karma: int = 0
    comment_karma: int = 0
    link_karma: int = 0
    error_message: str | None = None

class RedditChecker:
    """Check Reddit account status with rate limiting."""

    def __init__(self):
        self.client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            headers={"User-Agent": settings.reddit_user_agent},
        )
        return self

    async def __aexit__(self, *args):
        if self.client:
            await self.client.aclose()

    async def _random_delay(self) -> None:
        """Sleep for random duration to avoid detection."""
        delay = random.uniform(settings.reddit_min_delay, settings.reddit_max_delay)
        await asyncio.sleep(delay)

    async def check_account(self, username: str) -> RedditStatus:
        """Check single Reddit account with backoff on rate limits."""
        if not self.client:
            raise RuntimeError("Use async context manager")

        url = f"https://www.reddit.com/user/{username}/about.json"

        for attempt in range(settings.reddit_max_retries):
            await self._random_delay()

            try:
                response = await self.client.get(url)

                if response.status_code == 200:
                    data = response.json().get("data", {})
                    return RedditStatus(
                        username=username,
                        status="active",
                        total_karma=data.get("total_karma", 0),
                        comment_karma=data.get("comment_karma", 0),
                        link_karma=data.get("link_karma", 0),
                    )
                elif response.status_code == 404:
                    return RedditStatus(username=username, status="not_found")
                elif response.status_code == 403:
                    return RedditStatus(username=username, status="suspended")
                elif response.status_code == 429:
                    # Rate limited - exponential backoff
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        delay = float(retry_after)
                    else:
                        delay = settings.reddit_backoff_base * (2 ** attempt)
                        delay += random.uniform(0, 1)  # Jitter

                    await asyncio.sleep(delay)
                    continue
                else:
                    return RedditStatus(
                        username=username,
                        status="error",
                        error_message=f"HTTP {response.status_code}",
                    )

            except httpx.RequestError as e:
                if attempt == settings.reddit_max_retries - 1:
                    return RedditStatus(
                        username=username,
                        status="error",
                        error_message=str(e),
                    )
                await asyncio.sleep(settings.reddit_backoff_base * (2 ** attempt))

        return RedditStatus(username=username, status="rate_limited")
```

### Dolphin API Client
```python
# dolphin/sources/dolphin.py
from dataclasses import dataclass
import httpx

from config import settings

@dataclass
class DolphinProfile:
    id: str
    name: str
    owner: str
    notes: str
    created_at: str
    updated_at: str

class DolphinClient:
    """Client for Dolphin Anty API."""

    def __init__(self):
        self.client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.dolphin_api_url,
            headers={
                "Authorization": f"Bearer {settings.dolphin_api_key.get_secret_value()}"
            },
            timeout=httpx.Timeout(30.0),
        )
        return self

    async def __aexit__(self, *args):
        if self.client:
            await self.client.aclose()

    async def get_team_users(self) -> list[dict]:
        """Fetch all team user IDs."""
        if not self.client:
            raise RuntimeError("Use async context manager")

        response = await self.client.get("/team/users")
        response.raise_for_status()
        return response.json().get("data", [])

    async def get_profiles(self, user_ids: list[int]) -> list[DolphinProfile]:
        """Fetch all browser profiles for given users."""
        if not self.client:
            raise RuntimeError("Use async context manager")

        profiles = []
        page = 1

        # Build user map for owner lookup
        users = await self.get_team_users()
        user_map = {u["id"]: u.get("displayName") or u.get("username", "Unknown") for u in users}

        while True:
            params = {"limit": 100, "page": page}
            for i, uid in enumerate(user_ids):
                params[f"users[{i}]"] = uid

            response = await self.client.get("/browser_profiles", params=params)
            response.raise_for_status()
            data = response.json()

            if not data.get("data"):
                break

            for p in data["data"]:
                notes = p.get("notes", {})
                notes_content = notes.get("content", "") if isinstance(notes, dict) else ""

                profiles.append(DolphinProfile(
                    id=str(p["id"]),
                    name=p["name"],
                    owner=user_map.get(p.get("userId"), "Unknown"),
                    notes=notes_content,
                    created_at=p.get("created_at", ""),
                    updated_at=p.get("updated_at", ""),
                ))

            if len(data["data"]) < 100:
                break
            page += 1

        return profiles
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `requests` library | `httpx` | 2023+ | Async support, HTTP/2, better pooling |
| `os.getenv()` + manual validation | `pydantic-settings` | 2023 (Pydantic v2) | Type safety, .env loading, SecretStr |
| Fixed `time.sleep(3)` | `random.uniform(2, 5)` | Always recommended | Avoid detection patterns |
| Catch 429 and retry | Parse X-Ratelimit headers + backoff | Always recommended | Respect rate limits properly |

**Deprecated/outdated:**
- `requests` library for async workloads (use httpx)
- Pydantic v1 Settings (use pydantic-settings v2)
- python-dotenv alone (use pydantic-settings which includes it)

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Reddit unauthenticated rate limit**
   - What we know: ~10 requests/minute for default UAs, ~60 for OAuth
   - What's unclear: Exact limit with custom User-Agent string (reports vary 10-60)
   - Recommendation: Start conservative (10/min), monitor X-Ratelimit headers

2. **Dolphin API rate limit**
   - What we know: Documentation mentions 500 requests/minute
   - What's unclear: Is this enforced? What happens when exceeded?
   - Recommendation: Unlikely to hit with profile fetching; add basic rate limiting if issues arise

3. **JWT token rotation**
   - What we know: Tokens have expiration dates, can be regenerated in Dolphin dashboard
   - What's unclear: How long current token is valid, whether auto-refresh is possible
   - Recommendation: Check token expiry in JWT payload, add error handling for 401 responses

## Sources

### Primary (HIGH confidence)
- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) - Configuration patterns
- [HTTPX Official Documentation](https://www.python-httpx.org/) - HTTP client patterns
- [HTTPX Async Support](https://www.python-httpx.org/async/) - AsyncClient usage

### Secondary (MEDIUM confidence)
- [Later for Reddit - Rate Limiting Explained](https://laterforreddit.com/news/2017/03/04/reddit-api-ratelimiting-explained/) - X-Ratelimit headers
- [Web Scraping Club - Exponential Backoff](https://substack.thewebscraping.club/p/rate-limit-scraping-exponential-backoff) - Backoff patterns
- [Python Web Scraping Random Delays](https://www.shellhacks.com/python-sleep-random-time-web-scraping/) - Anti-detection patterns
- [Dolphin Anty Help Center](https://help.dolphin-anty.com/en/articles/10386138-api) - API authentication

### Tertiary (LOW confidence)
- Various Reddit API rate limit discussions (limits vary by source, 10-100 req/min)
- Community best practices for anti-detection (general agreement on 2-5 second random delays)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - httpx and pydantic-settings are well-documented, current recommendations
- Architecture: HIGH - Patterns verified against official documentation
- Pitfalls: HIGH - Based on existing code issues and established security practices

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stack is stable)
