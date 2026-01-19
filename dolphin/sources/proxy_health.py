"""
Proxy health checker - verifies proxies can reach Reddit.
Tests against Reddit specifically, not generic endpoints.
"""

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    RetryError,
)

from models import ProxyHealth
from sources.proxies import normalize_proxy


class ProxyHealthChecker:
    """Test proxy connectivity to Reddit."""

    # User agent for Reddit requests
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=30, jitter=5),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.ConnectTimeout)),
        reraise=True,
    )
    async def _request_with_retry(
        client: httpx.AsyncClient, url: str, headers: dict
    ) -> httpx.Response:
        """
        Make HTTP request with retry on transient failures.

        Retries on:
        - ConnectError: Network unreachable, DNS failure, connection refused
        - ConnectTimeout: Connection attempt timed out

        Does NOT retry on:
        - ProxyError: Proxy credentials/config issue (permanent)
        - 403/429 responses: IP blocked by Reddit (permanent)
        """
        return await client.get(url, headers=headers)

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
                response = await self._request_with_retry(
                    client,
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

        except RetryError as e:
            # Retries exhausted - extract the last exception for error message
            last_exc = e.last_attempt.exception()
            if isinstance(last_exc, httpx.ConnectTimeout):
                return ProxyHealth(
                    status="fail", error="Connection timeout (after 3 retries)"
                )
            elif isinstance(last_exc, httpx.ConnectError):
                return ProxyHealth(
                    status="fail",
                    error=f"Connection error (after 3 retries): {str(last_exc)}",
                )
            else:
                return ProxyHealth(
                    status="fail", error=f"Retries exhausted: {str(last_exc)}"
                )
        except httpx.ProxyError as e:
            # Proxy config/credentials issue - don't retry
            return ProxyHealth(status="fail", error=f"Proxy error: {str(e)}")
        except Exception as e:
            return ProxyHealth(status="fail", error=f"Unexpected error: {str(e)}")
