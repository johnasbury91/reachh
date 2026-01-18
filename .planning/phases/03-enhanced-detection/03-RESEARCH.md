# Phase 3: Enhanced Detection - Research

**Researched:** 2026-01-18
**Domain:** Reddit shadowban detection, proxy health testing, multi-provider abstraction
**Confidence:** HIGH (verified with official docs and multiple sources)

## Summary

This research covers three interconnected capabilities needed for Phase 3: shadowban detection, proxy health verification, and multi-provider proxy support. The existing codebase already uses httpx for Reddit checking - this research extends those patterns for enhanced detection capabilities.

**Key findings:**
1. **Shadowban detection** requires checking if user content is publicly visible (not just if profile exists). Current code only checks `about.json` which cannot distinguish shadowbanned from active accounts. True detection requires comparing profile data with content visibility.
2. **Proxy health testing** should verify Reddit reachability specifically, not generic endpoints. The standard httpbin.org/ip test confirms proxy works but not that it can reach Reddit without being blocked.
3. **Multi-provider support** is straightforward - all major providers (Decodo, Bright Data, Oxylabs) use the standard `http://user:pass@host:port` format that httpx already supports.

**Primary recommendation:** Extend `RedditChecker` with shadowban detection via `submitted.json` endpoint, add proxy health testing against Reddit endpoints directly, and create a `ProxyProvider` Protocol for multi-provider abstraction.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | 0.27+ | HTTP client with proxy support | Already in use, supports HTTP/SOCKS5 proxies natively |
| httpx-socks | 0.9+ | SOCKS5 proxy transport | Recommended for reliable SOCKS5 authentication |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| urllib.parse | stdlib | URL encoding for credentials | When proxy passwords contain special characters |
| typing.Protocol | stdlib | Interface definitions | For multi-provider abstraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| httpx native SOCKS5 | httpx-socks | httpx-socks more reliable for SOCKS5 auth (GitHub issue #3555) |
| ABC for providers | Protocol | Protocol enables structural typing, no inheritance required |

**Installation:**
```bash
pip install httpx httpx-socks
```

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
├── sources/
│   ├── reddit.py        # Extended with shadowban + proxy health
│   └── proxies/
│       ├── __init__.py
│       ├── base.py      # ProxyProvider Protocol
│       ├── decodo.py    # Decodo implementation
│       ├── brightdata.py # Bright Data implementation
│       └── oxylabs.py   # Oxylabs implementation
├── models.py            # Extended with proxy health fields
└── config.py            # Extended with proxy provider settings
```

### Pattern 1: Shadowban Detection Flow
**What:** Two-stage detection that first checks profile existence, then verifies content visibility
**When to use:** For all accounts marked "active" by basic check
**Example:**
```python
# Source: GitHub skeeto/am-i-shadowbanned + Reddit API wiki
async def check_shadowban(self, username: str) -> ShadowbanStatus:
    """
    Detection logic:
    1. Check about.json - if 404, account is suspended/deleted (not shadowban)
    2. Check submitted.json - get user's recent posts
    3. For each post, check if visible in subreddit (without auth)

    If profile exists but posts aren't visible = shadowbanned
    """
    # Step 1: Profile must exist (about.json returns 200)
    about_url = f"https://www.reddit.com/user/{username}/about.json"
    about_resp = await self.client.get(about_url)
    if about_resp.status_code != 200:
        return "suspended"  # or "not_found"

    # Step 2: Get submitted posts
    submitted_url = f"https://www.reddit.com/user/{username}/submitted.json"
    submitted_resp = await self.client.get(submitted_url)
    posts = submitted_resp.json().get("data", {}).get("children", [])

    if not posts:
        return "active"  # No posts to check, assume active

    # Step 3: Check if most recent post is visible (without auth)
    # A shadowbanned user's posts appear on their profile but not in subreddit
    recent_post = posts[0]["data"]
    permalink = recent_post.get("permalink")

    # Check if post appears in subreddit/comments
    post_url = f"https://www.reddit.com{permalink}.json"
    post_resp = await self.client.get(post_url)

    if post_resp.status_code == 404:
        return "shadowbanned"  # Post exists on profile but not publicly

    return "active"
```

### Pattern 2: Proxy Health Testing
**What:** Verify proxy can reach Reddit (not just any endpoint)
**When to use:** Before using proxy for Reddit checking
**Example:**
```python
# Source: httpx documentation + proxy checker patterns
async def test_proxy_health(
    self,
    proxy_url: str,
    timeout: float = 10.0
) -> ProxyHealth:
    """
    Test proxy against Reddit specifically.

    Steps:
    1. Test basic connectivity with httpbin (fast)
    2. Test Reddit reachability with /robots.txt (lightweight)
    3. Return detailed health status
    """
    try:
        async with httpx.AsyncClient(
            proxy=proxy_url,
            timeout=httpx.Timeout(timeout)
        ) as client:
            # Test 1: Basic proxy works
            try:
                ip_resp = await client.get("https://httpbin.org/ip")
                proxy_ip = ip_resp.json().get("origin", "unknown")
            except Exception:
                return ProxyHealth(working=False, error="proxy_connection_failed")

            # Test 2: Can reach Reddit
            try:
                reddit_resp = await client.get(
                    "https://www.reddit.com/robots.txt",
                    headers={"User-Agent": self.user_agent}
                )
                if reddit_resp.status_code == 200:
                    return ProxyHealth(
                        working=True,
                        proxy_ip=proxy_ip,
                        reddit_reachable=True
                    )
                elif reddit_resp.status_code == 429:
                    return ProxyHealth(
                        working=True,
                        proxy_ip=proxy_ip,
                        reddit_reachable=False,
                        error="rate_limited"
                    )
                else:
                    return ProxyHealth(
                        working=True,
                        proxy_ip=proxy_ip,
                        reddit_reachable=False,
                        error=f"http_{reddit_resp.status_code}"
                    )
            except Exception as e:
                return ProxyHealth(
                    working=True,
                    proxy_ip=proxy_ip,
                    reddit_reachable=False,
                    error=str(e)
                )
    except (httpx.ProxyError, httpx.ConnectError, httpx.ConnectTimeout) as e:
        return ProxyHealth(working=False, error=str(e))
```

### Pattern 3: Multi-Provider Proxy Abstraction
**What:** Protocol-based interface for proxy providers
**When to use:** When supporting multiple proxy providers
**Example:**
```python
# Source: PEP 544 + typing.Protocol documentation
from typing import Protocol, runtime_checkable
from dataclasses import dataclass

@dataclass
class ProxyConfig:
    """Proxy configuration returned by providers."""
    url: str  # Full proxy URL: http://user:pass@host:port
    provider: str
    location: str | None = None  # Country/city if applicable

@runtime_checkable
class ProxyProvider(Protocol):
    """Interface for proxy providers."""

    @property
    def name(self) -> str:
        """Provider name (e.g., 'decodo', 'brightdata')."""
        ...

    def get_proxy(self, profile_proxy: str) -> ProxyConfig | None:
        """
        Parse profile's proxy string into ProxyConfig.
        Returns None if proxy string doesn't match this provider.
        """
        ...

# Concrete implementation example
class DecodoProvider:
    """Decodo (formerly Smartproxy) proxy provider."""

    @property
    def name(self) -> str:
        return "decodo"

    def get_proxy(self, profile_proxy: str) -> ProxyConfig | None:
        # Decodo format: http://user:pass@gate.decodo.com:7000
        if "decodo.com" in profile_proxy or "smartproxy" in profile_proxy:
            return ProxyConfig(url=profile_proxy, provider=self.name)
        return None
```

### Anti-Patterns to Avoid
- **Testing proxies against httpbin only:** httpbin.org may work but Reddit could be blocking the proxy. Always test against Reddit directly.
- **Hardcoding provider detection:** Use a registry pattern, not if/elif chains for provider detection.
- **Ignoring URL encoding:** Proxy passwords often contain special characters (`@`, `:`) that must be URL-encoded.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL credential encoding | Manual string replacement | `urllib.parse.quote()` | Handles all edge cases (special chars) |
| SOCKS5 auth with httpx | Custom transport | `httpx-socks` AsyncProxyTransport | Known auth issues in native httpx SOCKS5 |
| HTTP proxy auth | Manual header setting | httpx built-in via URL | httpx handles proxy auth automatically |
| Interface contracts | Manual duck typing | `typing.Protocol` | Type checker support, `@runtime_checkable` |

**Key insight:** httpx handles most proxy complexity - don't reimplement auth or connection handling. Focus on the Reddit-specific detection logic.

## Common Pitfalls

### Pitfall 1: Confusing Shadowban with Suspension
**What goes wrong:** Treating 404 on `about.json` as shadowban when it's actually suspension/deletion
**Why it happens:** Both make content invisible, but detection differs
**How to avoid:**
- 404 on about.json = suspended or deleted (NOT shadowban)
- 200 on about.json but posts not visible = shadowban
**Warning signs:** "Shadowbanned" count includes obviously suspended accounts

### Pitfall 2: Rate Limiting During Shadowban Check
**What goes wrong:** Getting 429s when checking if posts are visible in subreddits
**Why it happens:** Shadowban detection requires additional requests per account
**How to avoid:**
- Check only most recent post (not all posts)
- Use longer delays between accounts
- Consider caching subreddit checks
**Warning signs:** Many accounts showing "error" or "rate_limited" status

### Pitfall 3: Proxy Passwords with Special Characters
**What goes wrong:** Proxy auth fails with "invalid URL" or 407 errors
**Why it happens:** Characters like `@`, `:`, `/` in passwords break URL parsing
**How to avoid:**
```python
from urllib.parse import quote
password = "p@ss:word/123"
encoded = quote(password, safe="")  # Results in: p%40ss%3Aword%2F123
proxy_url = f"http://user:{encoded}@host:port"
```
**Warning signs:** Proxy works in curl but fails in Python

### Pitfall 4: Reddit Blocking Proxy IPs
**What goes wrong:** Proxy health test passes but Reddit requests fail
**Why it happens:** Reddit may block known datacenter/proxy IP ranges
**How to avoid:**
- Test against Reddit specifically (not httpbin)
- Use residential proxies, not datacenter
- Rotate IPs when possible
**Warning signs:** Generic connectivity works but Reddit returns 403 or captcha

### Pitfall 5: Inconsistent Proxy URL Formats
**What goes wrong:** Provider URLs don't parse correctly
**Why it happens:** Different providers use slightly different formats
**How to avoid:**
- Normalize all URLs to `scheme://user:pass@host:port` format
- Handle missing scheme (default to http)
- Handle missing port (use provider defaults)
**Warning signs:** Some proxies work, others fail silently

## Code Examples

Verified patterns from official sources:

### Decodo (Smartproxy) Proxy URL
```python
# Source: https://help.decodo.com/docs/code-integration
username = "your_username"
password = "your_password"
proxy = f"http://{username}:{password}@gate.decodo.com:7000"

# With targeting (city/country in username)
# Format: user-username-country-US-city-newyork
targeted_username = f"user-{username}-country-US"
proxy = f"http://{targeted_username}:{password}@gate.decodo.com:7000"
```

### Bright Data Proxy URL
```python
# Source: https://docs.brightdata.com/api-reference/authentication
customer_id = "your_customer_id"
zone = "your_zone"
password = "your_password"
host = "brd.superproxy.io"
port = 22225

# Standard format
proxy = f"http://brd-customer-{customer_id}-zone-{zone}:{password}@{host}:{port}"

# With session (sticky IP)
import random
session_id = random.random()
proxy = f"http://brd-customer-{customer_id}-zone-{zone}-session-{session_id}:{password}@{host}:{port}"
```

### Oxylabs Proxy URL
```python
# Source: https://developers.oxylabs.io/proxies/residential-proxies/getting-started
username = "your_username"
password = "your_password"
host = "pr.oxylabs.io"
port = 7777

# Standard format
proxy = f"http://{username}:{password}@{host}:{port}"

# With country targeting
country = "US"
proxy = f"http://user-{username}-country-{country}:{password}@{host}:{port}"
```

### httpx AsyncClient with Proxy
```python
# Source: https://www.python-httpx.org/advanced/proxies/
import httpx
from urllib.parse import quote

# With authentication (encode special chars in password)
password = quote("p@ss:word", safe="")
proxy_url = f"http://user:{password}@proxy.example.com:8080"

async with httpx.AsyncClient(proxy=proxy_url, timeout=10.0) as client:
    response = await client.get("https://www.reddit.com/user/example/about.json")
```

### SOCKS5 with httpx-socks (Recommended)
```python
# Source: https://pypi.org/project/httpx-socks/
import httpx
from httpx_socks import AsyncProxyTransport

transport = AsyncProxyTransport.from_url(
    "socks5://user:password@proxy.example.com:1080"
)
async with httpx.AsyncClient(transport=transport) as client:
    response = await client.get("https://www.reddit.com/robots.txt")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| requests library | httpx | 2020+ | Native async, better proxy support |
| ABC for interfaces | Protocol | Python 3.8+ | Structural typing, no inheritance needed |
| Smartproxy brand | Decodo brand | April 2025 | Same endpoints, new domain (decodo.com) |

**Deprecated/outdated:**
- `aiohttp` for proxies: httpx has better proxy support and simpler API
- Manual proxy auth headers: httpx handles auth in URL automatically
- Inheritance-based provider interfaces: Protocol is more flexible

## Open Questions

Things that couldn't be fully resolved:

1. **Exact shadowban detection reliability**
   - What we know: Checking if posts appear in subreddit works
   - What's unclear: Edge cases (private subreddits, very new posts not indexed yet)
   - Recommendation: Start with most recent post check, iterate based on results

2. **Reddit rate limits for unauthenticated access**
   - What we know: 10 QPM for unauthenticated, 100 QPM for OAuth
   - What's unclear: Whether proxy rotation effectively bypasses per-IP limits
   - Recommendation: Use existing delays (2-5s), monitor for 429s

3. **Provider auto-detection accuracy**
   - What we know: Domain matching works (decodo.com, brightdata.com)
   - What's unclear: Edge cases with custom domains or whitelabeled proxies
   - Recommendation: Allow manual provider override in config

## Sources

### Primary (HIGH confidence)
- [httpx official docs - Proxies](https://www.python-httpx.org/advanced/proxies/) - Proxy configuration
- [httpx-socks PyPI](https://pypi.org/project/httpx-socks/) - SOCKS5 async support
- [Decodo Help Documentation](https://help.decodo.com/docs/code-integration) - Proxy format
- [Bright Data Docs](https://docs.brightdata.com/api-reference/authentication) - Auth format
- [Oxylabs Documentation](https://developers.oxylabs.io/proxies/residential-proxies/getting-started) - Proxy format
- [Reddit API Wiki - GitHub Archive](https://github.com/reddit-archive/reddit/wiki/json) - JSON structure

### Secondary (MEDIUM confidence)
- [Reddit Shadowbans 2025 - Reddifier](https://reddifier.com/blog/reddit-shadowbans-2025-how-they-work-how-to-detect-them-and-what-to-do-next) - Detection methods
- [GitHub skeeto/am-i-shadowbanned](https://github.com/skeeto/am-i-shadowbanned/issues/4) - Detection logic
- [PEP 544 - Protocols](https://peps.python.org/pep-0544/) - Protocol pattern

### Tertiary (LOW confidence)
- Various Medium/blog posts on shadowban detection (methods vary)
- Stack Overflow discussions on proxy auth (often outdated)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - httpx proxy support verified in official docs
- Architecture: HIGH - Protocol pattern well-documented in PEP 544
- Shadowban detection: MEDIUM - Logic verified but edge cases unknown
- Provider formats: HIGH - Verified against official provider docs
- Pitfalls: MEDIUM - Based on common patterns and GitHub issues

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable domain)
