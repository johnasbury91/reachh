"""
Base protocol for proxy providers.
Uses typing.Protocol for structural typing (no inheritance needed).
"""

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class ProxyConfig:
    """Normalized proxy configuration."""
    url: str  # Full URL: scheme://user:pass@host:port
    provider: str  # Provider name (e.g., "decodo", "brightdata")
    original_url: str  # Original URL before normalization


@runtime_checkable
class ProxyProvider(Protocol):
    """Interface for proxy providers."""

    @property
    def name(self) -> str:
        """Provider identifier (e.g., 'decodo', 'brightdata')."""
        ...

    def matches(self, proxy_url: str) -> bool:
        """Check if this provider handles the given proxy URL."""
        ...

    def normalize(self, proxy_url: str) -> ProxyConfig:
        """
        Normalize proxy URL and return ProxyConfig.

        Handles:
        - URL encoding of credentials (special chars in password)
        - Default scheme if missing
        - Provider-specific URL transformations
        """
        ...
