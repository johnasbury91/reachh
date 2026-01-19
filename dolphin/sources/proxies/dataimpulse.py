"""DataImpulse proxy provider."""

from urllib.parse import urlparse, quote, urlunparse

from sources.proxies.base import ProxyConfig


class DataImpulseProvider:
    """
    DataImpulse residential proxy provider.

    Host: gw.dataimpulse.com
    Rotating port: 823 (new IP each request)
    Sticky ports: 10000+ (each port = persistent session)
    Username can include geo params: user__cr.us;state.california:pass
    """

    @property
    def name(self) -> str:
        return "dataimpulse"

    def matches(self, proxy_url: str) -> bool:
        """Match dataimpulse.com domains."""
        lower = proxy_url.lower()
        return "dataimpulse.com" in lower or "gw.dataimpulse.com" in lower

    def normalize(self, proxy_url: str) -> ProxyConfig:
        """Normalize DataImpulse proxy URL with encoded credentials."""
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

    def get_session_type(self, proxy_url: str) -> str:
        """
        Detect session type from port number.

        Returns:
            'rotating' for port 823
            'sticky' for ports 10000+
            'unknown' for other ports
        """
        parsed = urlparse(proxy_url)
        port = parsed.port

        if port == 823:
            return "rotating"
        elif port and port >= 10000:
            return "sticky"
        return "unknown"

    def parse_geo_params(self, proxy_url: str) -> dict:
        """
        Parse geo parameters from username.

        DataImpulse format: user__cr.us;state.california:pass
        - cr.XX = country
        - state.XX = state/region

        Returns:
            Dict with 'country' and 'state' keys if present
        """
        parsed = urlparse(proxy_url)
        username = parsed.username or ""

        geo = {}

        # Split on double underscore to get params
        if "__" in username:
            parts = username.split("__")
            if len(parts) > 1:
                params_str = parts[1]
                # Split on semicolon for multiple params
                for param in params_str.split(";"):
                    if param.startswith("cr."):
                        geo["country"] = param[3:]
                    elif param.startswith("state."):
                        geo["state"] = param[6:]

        return geo
