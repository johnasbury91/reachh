"""
Data models for Dolphin tracker.
Uses dataclasses for simple data containers.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


def calculate_account_age(created_utc: float) -> str:
    """Convert Reddit created_utc timestamp to human-readable age.

    Args:
        created_utc: Unix timestamp from Reddit API (UTC)

    Returns:
        Human-readable age like "2y 3m", "6m", or "15d"
        Returns "N/A" for invalid/zero timestamps
    """
    if created_utc <= 0:
        return "N/A"

    created = datetime.fromtimestamp(created_utc, tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    delta = now - created

    days = delta.days
    if days < 0:
        return "N/A"  # Future date (shouldn't happen)

    years = days // 365
    months = (days % 365) // 30

    if years > 0:
        return f"{years}y {months}m"
    elif months > 0:
        return f"{months}m"
    else:
        return f"{days}d"


@dataclass
class DolphinProfile:
    """Browser profile from Dolphin Anty."""

    id: str
    name: str  # This is the Reddit username
    owner: str  # Freelancer who owns this account
    notes: str
    created_at: str
    updated_at: str
    proxy: str = ""  # Proxy URL (e.g., "http://1.2.3.4:8080") or "None"


@dataclass
class RedditStatus:
    """Status result from Reddit account check."""

    username: str
    status: Literal["active", "suspended", "not_found", "rate_limited", "error", "shadowbanned"]
    total_karma: int = 0
    comment_karma: int = 0
    link_karma: int = 0
    created_utc: float = 0
    error_message: str | None = None


@dataclass
class ProxyHealth:
    """Result from proxy health check."""

    status: Literal["pass", "fail", "blocked", "N/A"]
    proxy_ip: str | None = None  # IP as seen by target (if available)
    error: str | None = None  # Error message if failed


@dataclass
class AccountResult:
    """Combined result for tracker output."""

    profile: DolphinProfile
    reddit: RedditStatus
    category: str
    karma_change: int = 0
    checked_at: str = ""
    proxy_health: ProxyHealth | None = None
