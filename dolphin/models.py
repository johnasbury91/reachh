"""
Data models for Dolphin tracker.
Uses dataclasses for simple data containers.
"""

from dataclasses import dataclass, field
from typing import Literal


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
    status: Literal["active", "suspended", "not_found", "rate_limited", "error"]
    total_karma: int = 0
    comment_karma: int = 0
    link_karma: int = 0
    created_utc: float = 0
    error_message: str | None = None


@dataclass
class AccountResult:
    """Combined result for tracker output."""

    profile: DolphinProfile
    reddit: RedditStatus
    category: str
    karma_change: int = 0
    checked_at: str = ""
