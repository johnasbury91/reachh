"""Decodo proxy provider (formerly Smartproxy)."""

from urllib.parse import urlparse, quote, urlunparse

from sources.proxies.base import ProxyConfig


class DecodoProvider:
    """Decodo/Smartproxy proxy provider."""

    @property
    def name(self) -> str:
        return "decodo"

    def matches(self, proxy_url: str) -> bool:
        """Match decodo.com or smartproxy.com domains."""
        lower = proxy_url.lower()
        return "decodo.com" in lower or "smartproxy.com" in lower

    def normalize(self, proxy_url: str) -> ProxyConfig:
        """Normalize Decodo proxy URL with encoded credentials."""
        return ProxyConfig(
            url=self._encode_credentials(proxy_url),
            provider=self.name,
            original_url=proxy_url,
        )

    def _encode_credentials(self, proxy_url: str) -> str:
        """URL-encode credentials in proxy URL."""
        parsed = urlparse(proxy_url)

        # Add default scheme if missing
        if not parsed.scheme:
            proxy_url = f"http://{proxy_url}"
            parsed = urlparse(proxy_url)

        # Encode username and password if present
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
