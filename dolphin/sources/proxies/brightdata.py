"""Bright Data proxy provider."""

from urllib.parse import urlparse, quote, urlunparse

from sources.proxies.base import ProxyConfig


class BrightDataProvider:
    """Bright Data (formerly Luminati) proxy provider."""

    @property
    def name(self) -> str:
        return "brightdata"

    def matches(self, proxy_url: str) -> bool:
        """Match brightdata.com or luminati.io domains."""
        lower = proxy_url.lower()
        return (
            "brightdata.com" in lower
            or "brd.superproxy.io" in lower
            or "luminati.io" in lower
        )

    def normalize(self, proxy_url: str) -> ProxyConfig:
        """Normalize Bright Data proxy URL with encoded credentials."""
        return ProxyConfig(
            url=self._encode_credentials(proxy_url),
            provider=self.name,
            original_url=proxy_url,
        )

    def _encode_credentials(self, proxy_url: str) -> str:
        """URL-encode credentials in proxy URL."""
        # Same logic as Decodo - factor out if needed later
        parsed = urlparse(proxy_url)

        if not parsed.scheme:
            proxy_url = f"http://{proxy_url}"
            parsed = urlparse(proxy_url)

        if parsed.username or parsed.password:
            username = quote(parsed.username or "", safe="")
            password = quote(parsed.password or "", safe="")
            netloc = f"{username}:{password}@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return urlunparse((
                parsed.scheme,
                netloc,
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment,
            ))

        return proxy_url
