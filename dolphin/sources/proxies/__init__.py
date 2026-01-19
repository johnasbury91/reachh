"""
Proxy provider registry.
Auto-detects provider from URL and provides normalization.
"""

from sources.proxies.base import ProxyConfig, ProxyProvider
from sources.proxies.decodo import DecodoProvider
from sources.proxies.brightdata import BrightDataProvider
from sources.proxies.dataimpulse import DataImpulseProvider

# Registry of all providers
PROVIDERS: list[ProxyProvider] = [
    DecodoProvider(),
    BrightDataProvider(),
    DataImpulseProvider(),
]


def get_provider(proxy_url: str) -> ProxyProvider | None:
    """
    Auto-detect provider from proxy URL.

    Returns:
        Matching provider, or None if no provider matches.
    """
    for provider in PROVIDERS:
        if provider.matches(proxy_url):
            return provider
    return None


def normalize_proxy(proxy_url: str) -> ProxyConfig | None:
    """
    Normalize proxy URL using appropriate provider.

    Returns:
        ProxyConfig with normalized URL, or None if unrecognized.
    """
    if not proxy_url or proxy_url == "None":
        return None

    provider = get_provider(proxy_url)
    if provider:
        return provider.normalize(proxy_url)

    # Fallback: return as-is with "unknown" provider
    return ProxyConfig(
        url=proxy_url,
        provider="unknown",
        original_url=proxy_url
    )


__all__ = [
    "ProxyConfig",
    "ProxyProvider",
    "PROVIDERS",
    "get_provider",
    "normalize_proxy",
]
