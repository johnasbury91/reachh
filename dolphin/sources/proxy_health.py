"""
Proxy health checker - verifies proxies can reach Reddit.
Tests against Reddit specifically, not generic endpoints.
"""

import httpx
from urllib.parse import quote, urlparse, urlunparse

from models import ProxyHealth


class ProxyHealthChecker:
    """Test proxy connectivity to Reddit."""

    # User agent for Reddit requests
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

    def _encode_proxy_url(self, proxy_url: str) -> str:
        """URL-encode credentials in proxy URL to handle special characters.

        Args:
            proxy_url: Proxy URL (e.g., "http://user:p@ss@host:port")

        Returns:
            URL with encoded credentials (e.g., "http://user:p%40ss@host:port")
        """
        parsed = urlparse(proxy_url)

        # If no credentials, return as-is
        if not parsed.username:
            return proxy_url

        # Encode username and password
        encoded_username = quote(parsed.username, safe="")
        encoded_password = quote(parsed.password, safe="") if parsed.password else ""

        # Reconstruct netloc with encoded credentials
        if encoded_password:
            auth = f"{encoded_username}:{encoded_password}"
        else:
            auth = encoded_username

        # Rebuild netloc: auth@host:port
        if parsed.port:
            netloc = f"{auth}@{parsed.hostname}:{parsed.port}"
        else:
            netloc = f"{auth}@{parsed.hostname}"

        # Reconstruct full URL
        return urlunparse((
            parsed.scheme,
            netloc,
            parsed.path,
            parsed.params,
            parsed.query,
            parsed.fragment,
        ))

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

        # Encode credentials to handle special characters
        encoded_proxy = self._encode_proxy_url(proxy_url)

        try:
            async with httpx.AsyncClient(
                proxy=encoded_proxy,
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
