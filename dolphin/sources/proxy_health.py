"""
Proxy health checker - verifies proxies can reach Reddit.
Tests against Reddit specifically, not generic endpoints.
"""

import httpx

from models import ProxyHealth
from sources.proxies import normalize_proxy


class ProxyHealthChecker:
    """Test proxy connectivity to Reddit."""

    # User agent for Reddit requests
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

    async def check(self, proxy_url: str, timeout: float = 10.0) -> ProxyHealth:
        """
        Test if proxy can reach Reddit.

        Args:
            proxy_url: Full proxy URL (e.g., "http://user:pass@host:port")
            timeout: Connection timeout in seconds

        Returns:
            ProxyHealth with status and optional error details
        """
        # Handle "None" proxy string - account has no proxy configured
        if not proxy_url or proxy_url == "None":
            return ProxyHealth(status="N/A")

        # Normalize URL using provider (handles credential encoding)
        config = normalize_proxy(proxy_url)
        normalized_url = config.url if config else proxy_url

        try:
            async with httpx.AsyncClient(
                proxy=normalized_url,
                timeout=httpx.Timeout(timeout),
            ) as client:
                # Test Reddit reachability via robots.txt (lightweight, always exists)
                response = await client.get(
                    "https://www.reddit.com/robots.txt",
                    headers={"User-Agent": self.USER_AGENT},
                )

                # Interpret response codes
                if response.status_code == 200:
                    return ProxyHealth(status="pass")
                elif response.status_code == 403:
                    return ProxyHealth(
                        status="blocked",
                        error="403 Forbidden - Reddit blocking this IP",
                    )
                elif response.status_code == 429:
                    return ProxyHealth(
                        status="blocked",
                        error="429 Rate Limited - IP likely flagged",
                    )
                else:
                    return ProxyHealth(
                        status="fail",
                        error=f"HTTP {response.status_code}",
                    )

        except httpx.ConnectTimeout:
            return ProxyHealth(status="fail", error="Connection timeout")
        except httpx.ProxyError as e:
            return ProxyHealth(status="fail", error=f"Proxy error: {str(e)}")
        except httpx.ConnectError as e:
            return ProxyHealth(status="fail", error=f"Connection error: {str(e)}")
        except Exception as e:
            return ProxyHealth(status="fail", error=f"Unexpected error: {str(e)}")
