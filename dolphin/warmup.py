"""
Warmup limits system for Reddit accounts.

Defines age-based activity tiers and threshold checking to prevent
early-stage bans from over-activity.
"""

from datetime import datetime, timezone
from models import ActivityCounts


# Age-based warmup tiers with activity limits
# Based on community research and Reddit behavior patterns
WARMUP_TIERS = {
    "new": {  # Days 1-7: Lurker mode
        "max_days": 7,
        "max_comments": 3,  # Per day
        "max_posts": 0,  # No posts first week
        "max_votes": 10,  # Upvotes per day (not trackable via API)
        "target_karma": 15,  # By end of tier
    },
    "warming": {  # Days 8-14: Light engagement
        "max_days": 14,
        "max_comments": 5,
        "max_posts": 1,  # Every other day max
        "max_votes": 20,
        "target_karma": 100,
    },
    "ready": {  # Days 15-30: Building consistency
        "max_days": 30,
        "max_comments": 8,
        "max_posts": 2,
        "max_votes": 30,
        "target_karma": 250,
    },
    "established": {  # Days 30+: Normal activity
        "max_days": None,
        "max_comments": 15,
        "max_posts": 3,
        "max_votes": 50,
        "target_karma": 500,
    },
}


def get_warmup_limits(created_utc: float) -> dict:
    """Get activity limits based on account age.

    Args:
        created_utc: Unix timestamp from Reddit API (UTC)

    Returns:
        dict with 'tier' name and 'limits' from WARMUP_TIERS
        Returns tier="unknown", limits=None for invalid timestamps
    """
    if created_utc <= 0:
        return {"tier": "unknown", "limits": None}

    try:
        created = datetime.fromtimestamp(created_utc, tz=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        delta = now - created
        age_days = delta.days

        if age_days < 0:
            return {"tier": "unknown", "limits": None}

        if age_days < 7:
            return {"tier": "new", "limits": WARMUP_TIERS["new"]}
        elif age_days < 14:
            return {"tier": "warming", "limits": WARMUP_TIERS["warming"]}
        elif age_days < 30:
            return {"tier": "ready", "limits": WARMUP_TIERS["ready"]}
        else:
            return {"tier": "established", "limits": WARMUP_TIERS["established"]}

    except (ValueError, OSError, OverflowError):
        # Invalid timestamp
        return {"tier": "unknown", "limits": None}


def check_warmup_thresholds(
    activity: ActivityCounts,
    limits: dict,
    alert_threshold: float = 0.8
) -> list[str]:
    """Check if account is approaching or exceeding warmup limits.

    Args:
        activity: ActivityCounts with today's comment/post counts
        limits: Dict from WARMUP_TIERS with max_comments, max_posts, etc.
        alert_threshold: Ratio (0-1) at which to warn (default 0.8 = 80%)

    Returns:
        List of warning strings for accounts at/over thresholds
    """
    warnings = []

    # Check comments threshold
    max_comments = limits.get("max_comments", 0)
    if max_comments > 0:
        comment_ratio = activity.comments_today / max_comments
        if comment_ratio >= 1.0:
            warnings.append(
                f"EXCEEDED: {activity.username} has {activity.comments_today} "
                f"comments (limit: {max_comments})"
            )
        elif comment_ratio >= alert_threshold:
            warnings.append(
                f"WARNING: {activity.username} at {int(comment_ratio * 100)}% "
                f"of comment limit"
            )

    # Check posts threshold
    max_posts = limits.get("max_posts", 0)
    if max_posts > 0:
        post_ratio = activity.posts_today / max_posts
        if post_ratio >= 1.0:
            warnings.append(
                f"EXCEEDED: {activity.username} has {activity.posts_today} "
                f"posts (limit: {max_posts})"
            )
        elif post_ratio >= alert_threshold:
            warnings.append(
                f"WARNING: {activity.username} at {int(post_ratio * 100)}% "
                f"of post limit"
            )

    return warnings
