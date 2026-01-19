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


def calculate_warmup_status(created_utc: float, total_karma: int) -> str:
    """Determine account warmup status based on age and karma.

    Reddit accounts need gradual activity ramp-up. This function classifies
    accounts into warmup stages to help identify safe activity levels.

    Args:
        created_utc: Unix timestamp from Reddit API (UTC)
        total_karma: Combined karma score

    Returns:
        Status string: "unknown", "new", "warming", "ready", or "established"
    """
    if created_utc <= 0:
        return "unknown"

    created = datetime.fromtimestamp(created_utc, tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    delta = now - created
    age_days = delta.days

    if age_days < 0:
        return "unknown"  # Future date (shouldn't happen)

    # Check thresholds in order from most established to newest
    if age_days >= 90 and total_karma >= 500:
        return "established"
    elif age_days >= 30 and total_karma >= 100:
        return "ready"
    elif age_days >= 7 or total_karma >= 10:
        return "warming"
    else:
        return "new"


@dataclass
class DolphinProfile:
    """Browser profile from Dolphin Anty."""

    id: str
    name: str  # This is the Reddit username
    owner: str  # Freelancer who owns this account
    notes: str
    created_at: str
    updated_at: str
    proxy: str = ""  # Display-safe proxy (hostname only, for sheet) or "None"
    proxy_url: str = ""  # Full proxy URL with credentials (for health checking)


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
