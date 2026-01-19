# Phase 2: Warmup Management - Research

**Researched:** 2026-01-19
**Domain:** Reddit account warmup, anti-spam detection, activity tracking
**Confidence:** HIGH (multiple sources verified, existing codebase validated)

## Summary

This research investigates safe warmup practices for Reddit accounts to prevent early-stage bans. The problem is well-documented: Reddit's anti-spam systems flag new accounts that exhibit bot-like patterns including rapid posting, excessive activity, and sudden behavioral changes.

The solution involves three components: (1) defining age-based activity limits that mirror normal user behavior, (2) tracking daily activity counts to enforce those limits, (3) alerting when accounts approach or exceed thresholds.

The existing Dolphin tracker already has infrastructure for Google Sheets sync, state tracking, and alerts. Phase 2 extends this with warmup-specific columns, activity counting via Reddit API, and threshold-based alerts.

**Primary recommendation:** Implement a 4-tier warmup schedule (days 1-7, 8-14, 15-30, 30+) with progressively increasing limits, track activity via Reddit's public API, and alert at 80% of daily limits to give operators time to pause.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gspread | 6.1.x | Google Sheets API | Already in use, mature Python wrapper |
| httpx | 0.27.x | Reddit API calls | Already in use for async HTTP |
| pydantic | 2.x | Data validation | Already in use for models |
| pydantic-settings | 2.x | Config management | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PRAW | 7.7.x | Reddit API wrapper | Alternative for authenticated access if rate limited |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw httpx | PRAW | PRAW handles rate limits automatically but requires auth |
| Manual API calls | Apify scrapers | Third party, adds cost and dependency |

**Installation:**
```bash
# No new dependencies needed - existing stack sufficient
# Optional if rate limits become problematic:
pip install praw
```

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
├── models.py           # Add WarmupLimits, ActivityCounts dataclasses
├── warmup.py           # NEW: Warmup limit definitions and checking
├── tracker.py          # Extend to fetch activity counts
├── sheets_sync.py      # Add warmup columns to sheet
├── alerts.py           # Add warmup threshold alerts
└── docs/
    ├── WARMUP_PLAYBOOK.md    # NEW: Warmup schedule documentation
    └── TROUBLESHOOTING.md    # NEW: Banned account checklist
```

### Pattern 1: Age-Based Warmup Tiers
**What:** Define activity limits by account age bracket with 4 tiers
**When to use:** All warmup limit checks
**Example:**
```python
# Based on community research and Reddit behavior patterns
WARMUP_TIERS = {
    "new": {        # Days 1-7: Lurker mode
        "max_days": 7,
        "max_comments": 3,      # Per day
        "max_posts": 0,         # No posts first week
        "max_votes": 10,        # Upvotes per day
        "target_karma": 15,     # By end of tier
    },
    "warming": {    # Days 8-14: Light engagement
        "max_days": 14,
        "max_comments": 5,
        "max_posts": 1,         # Every other day max
        "max_votes": 20,
        "target_karma": 100,
    },
    "ready": {      # Days 15-30: Building consistency
        "max_days": 30,
        "max_comments": 8,
        "max_posts": 2,
        "max_votes": 30,
        "target_karma": 250,
    },
    "established": { # Days 30+: Normal activity
        "max_days": None,
        "max_comments": 15,
        "max_posts": 3,
        "max_votes": 50,
        "target_karma": 500,
    },
}
```

### Pattern 2: Activity Counting via Reddit API
**What:** Fetch user's recent submissions and comments to count daily activity
**When to use:** Each tracker run to update activity counts
**Example:**
```python
async def get_activity_counts(username: str, client: httpx.AsyncClient) -> dict:
    """Get today's activity counts for a Reddit account."""
    today = datetime.now(tz=timezone.utc).date()

    # Fetch recent comments
    comments_url = f"https://www.reddit.com/user/{username}/comments.json?limit=25"
    comments_resp = await client.get(comments_url)
    comments = comments_resp.json().get("data", {}).get("children", [])

    # Count today's comments
    today_comments = sum(
        1 for c in comments
        if datetime.fromtimestamp(c["data"]["created_utc"], tz=timezone.utc).date() == today
    )

    # Fetch recent submissions
    posts_url = f"https://www.reddit.com/user/{username}/submitted.json?limit=10"
    posts_resp = await client.get(posts_url)
    posts = posts_resp.json().get("data", {}).get("children", [])

    # Count today's posts
    today_posts = sum(
        1 for p in posts
        if datetime.fromtimestamp(p["data"]["created_utc"], tz=timezone.utc).date() == today
    )

    return {
        "comments_today": today_comments,
        "posts_today": today_posts,
        # Note: Votes cannot be tracked via API - they're private
    }
```

### Pattern 3: Threshold-Based Alerts
**What:** Alert at 80% of daily limit to give operator time to pause
**When to use:** After activity counts are fetched
**Example:**
```python
def check_warmup_thresholds(
    activity: dict,
    limits: dict,
    username: str,
    alert_threshold: float = 0.8
) -> list[str]:
    """Check if account is approaching or exceeding limits."""
    warnings = []

    # Comments threshold
    if limits["max_comments"] > 0:
        comment_ratio = activity["comments_today"] / limits["max_comments"]
        if comment_ratio >= 1.0:
            warnings.append(f"EXCEEDED: {username} has {activity['comments_today']} comments (limit: {limits['max_comments']})")
        elif comment_ratio >= alert_threshold:
            warnings.append(f"WARNING: {username} at {int(comment_ratio*100)}% of comment limit")

    # Posts threshold
    if limits["max_posts"] > 0:
        post_ratio = activity["posts_today"] / limits["max_posts"]
        if post_ratio >= 1.0:
            warnings.append(f"EXCEEDED: {username} has {activity['posts_today']} posts (limit: {limits['max_posts']})")
        elif post_ratio >= alert_threshold:
            warnings.append(f"WARNING: {username} at {int(post_ratio*100)}% of post limit")

    return warnings
```

### Anti-Patterns to Avoid
- **Fixed delay patterns:** Reddit detects bots by consistent timing. Always use random delays.
- **Same-day volume spikes:** Going from 0 to max activity in one day triggers flags.
- **Ignoring CQS:** New accounts with "Lowest" CQS get filtered aggressively.
- **External links early:** Links in first 2 weeks are major red flags.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Account age calculation | Manual datetime math | `models.calculate_account_age()` | Already implemented with edge cases handled |
| Warmup status | New logic | `models.calculate_warmup_status()` | Already exists, just needs enhancement |
| Batch sheet updates | Individual cell updates | `gspread.batch_update()` | API quota limits (60 req/min/user) |
| Rate limit handling | Manual retry logic | Existing `reddit.py` backoff | Already handles 429s with exponential backoff |

**Key insight:** The existing tracker already has 80% of the infrastructure. Phase 2 is about extending, not rebuilding.

## Common Pitfalls

### Pitfall 1: Over-aggressive Activity Limits
**What goes wrong:** Setting limits too low causes accounts to never build karma.
**Why it happens:** Fear of bans leads to over-conservative limits.
**How to avoid:** Use the community-validated limits from research (3 comments/day for new accounts is the floor).
**Warning signs:** Accounts stuck at low karma after 2+ weeks.

### Pitfall 2: Ignoring Account Creation Time
**What goes wrong:** Using Dolphin profile creation date instead of Reddit account creation date.
**Why it happens:** Dolphin creation date is easy to get; Reddit creation requires API call.
**How to avoid:** Always use `created_utc` from Reddit API (already fetched in `reddit.py`).
**Warning signs:** Established accounts being treated as "new".

### Pitfall 3: Not Verifying Email
**What goes wrong:** Accounts get "Lowest" CQS and posts are filtered.
**Why it happens:** Email verification is seen as optional.
**How to avoid:** Document email verification as mandatory in warmup playbook.
**Warning signs:** Posts not appearing, CQS check shows "Lowest".

### Pitfall 4: Activity Tracking Without Context
**What goes wrong:** Alerting on activity without knowing if it was manual or automated.
**Why it happens:** Tracker runs after manual activity, sees high counts.
**How to avoid:** Track activity DELTA since last check, not absolute counts.
**Warning signs:** False positive alerts during legitimate manual farming.

### Pitfall 5: Shared Proxy Correlation
**What goes wrong:** Multiple accounts with similar activity patterns get linked.
**Why it happens:** Operators use same schedule for all accounts.
**How to avoid:** Randomize activity timing per account, use unique proxies (already documented in Phase 1).
**Warning signs:** Mass bans hitting accounts created around same time.

## Code Examples

Verified patterns from existing codebase and official sources:

### Extend Warmup Status (models.py)
```python
# Source: Existing models.py, extended with activity limits
def get_warmup_limits(created_utc: float) -> dict:
    """Get activity limits based on account age."""
    if created_utc <= 0:
        return {"tier": "unknown", "limits": None}

    age_days = (datetime.now(tz=timezone.utc) -
                datetime.fromtimestamp(created_utc, tz=timezone.utc)).days

    if age_days < 7:
        return {"tier": "new", "limits": WARMUP_TIERS["new"]}
    elif age_days < 14:
        return {"tier": "warming", "limits": WARMUP_TIERS["warming"]}
    elif age_days < 30:
        return {"tier": "ready", "limits": WARMUP_TIERS["ready"]}
    else:
        return {"tier": "established", "limits": WARMUP_TIERS["established"]}
```

### Add Warmup Columns to Sheet (sheets_sync.py)
```python
# Source: gspread docs - batch_update pattern
# Extend HEADERS to include warmup tracking
HEADERS = [
    # ... existing columns ...
    "comments_today",   # N: Daily comment count
    "posts_today",      # O: Daily post count
    "warmup_tier",      # P: new/warming/ready/established
    "limit_status",     # Q: OK/WARNING/EXCEEDED
]
```

### Warmup Alert Function (alerts.py)
```python
# Source: Existing alerts.py pattern
def notify_warmup_warnings(warnings: list[dict]) -> None:
    """Notify about accounts approaching/exceeding warmup limits."""
    if not warnings:
        return

    exceeded = [w for w in warnings if "EXCEEDED" in w["message"]]
    approaching = [w for w in warnings if "WARNING" in w["message"]]

    if exceeded:
        send_alert(
            title="Warmup Limit EXCEEDED",
            message=f"{len(exceeded)} account(s) over limit: {', '.join(w['username'] for w in exceeded[:3])}"
        )

    if approaching:
        send_alert(
            title="Warmup Warning",
            message=f"{len(approaching)} account(s) near limit"
        )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Karma/age gates | Contributor Quality Score (CQS) | 2023 | CQS now primary trust signal |
| Manual moderation | Automated spam detection (57.5% of removals) | 2024-2025 | Need behavioral authenticity |
| Datacenter proxies | Residential proxies only | 2024 | Datacenter IPs flagged aggressively |
| 10% self-promo rule | Near-zero self-promo for new accounts | 2025 | Links = instant flags for new accounts |

**Deprecated/outdated:**
- Pushshift API: No longer provides real-time data, historical only
- Simple karma farming: CQS tracks engagement quality, not just quantity

## Reddit Anti-Spam Signals (2025-2026)

Based on research, Reddit uses the following detection signals:

### Behavioral Fingerprinting
- Keystroke rhythms
- Voting habits
- Time spent on site per session
- Navigation patterns

### Network Signals
- IP address consistency
- Device fingerprinting (OS, browser, screen resolution, fonts)
- Shared IP pool detection
- VPN/datacenter detection

### Activity Patterns
- Posting frequency (too fast = bot-like)
- Comment timing (consistent intervals = automated)
- Subreddit diversity (single niche = suspicious)
- Link density (too many external links = spam)
- Vote manipulation patterns

### Account Signals
- Email verification status
- Account age vs activity level
- Karma accumulation rate
- CQS score tier

## Warmup Schedule Research Synthesis

Based on multiple sources, here is the synthesized warmup schedule:

### Days 1-7: Lurker Mode
- **Goal:** Build trust, establish cookies, verify email
- **Activity:** Browse 15-20 min/day, upvote 5-10 posts, subscribe to 5-10 subreddits
- **Comments:** 0-3 per day, short and conversational
- **Posts:** NONE
- **Links:** NONE
- **Target karma:** 10-20

### Days 8-14: Light Engagement
- **Goal:** Build comment karma, establish posting history
- **Activity:** 20-30 min/day
- **Comments:** 3-5 per day, thoughtful responses
- **Posts:** 1-2 total across the week (text only)
- **Links:** NONE (no external links)
- **Target karma:** 50-100

### Days 15-30: Building Consistency
- **Goal:** Reach posting requirements for most subreddits
- **Activity:** 20-30 min/day
- **Comments:** 5-8 per day
- **Posts:** 2-4 per week
- **Links:** Minimal, only when very relevant
- **Target karma:** 100-250

### Days 30+: Established
- **Goal:** Normal activity, can begin light promotion
- **Activity:** Regular usage
- **Comments:** 10-15 per day max
- **Posts:** 3-5 per week
- **Links:** Follow 80/20 rule (8 non-promo : 1 promo)
- **Target karma:** 250+

## CQS (Contributor Quality Score) Key Points

- **Tiers:** Lowest, Low, Moderate, High, Highest
- **Check method:** Post in r/WhatismyCQS for automated check
- **Minimum target:** "Moderate" before any promotional activity
- **Key factors:** Email verification, engagement quality, subreddit diversity, upvote ratio
- **Quick boost:** Verify email (Lowest -> Low immediately)
- **Avoid:** Links in profile bio (causes CQS drop)

## Open Questions

Things that couldn't be fully resolved:

1. **Vote tracking limitations**
   - What we know: Reddit API does not expose a user's voting history (private data)
   - What's unclear: No way to programmatically count daily votes
   - Recommendation: Track only comments and posts; document manual vote tracking in playbook

2. **CQS tier thresholds**
   - What we know: Reddit intentionally hides specific thresholds to prevent gaming
   - What's unclear: Exact karma/age requirements for each CQS tier
   - Recommendation: Use r/WhatismyCQS check as part of manual verification, not automated

3. **Rate limit specifics per account age**
   - What we know: New accounts have lower rate limits than established
   - What's unclear: Exact limits per tier
   - Recommendation: Stay well under observed limits (3 comments/day for new accounts is safe)

## Sources

### Primary (HIGH confidence)
- Reddit Official Help: Account ban explanations, CQS documentation
- gspread 6.1.2 documentation: Batch operations, API limits
- Existing Dolphin codebase: Verified patterns for tracker, alerts, models

### Secondary (MEDIUM confidence)
- [Multilogin Warmup Guide](https://multilogin.com/blog/how-to-warm-up-a-reddit-account/) - Detailed day-by-day schedule
- [DiCloak Warmup Guide](https://dicloak.com/blog-detail/how-to-warm-up-a-reddit-account-safely-complete-guide-for-2025) - Conservative/fast approach comparison
- [GoLogin Account Suspended Guide](https://gologin.com/blog/reddit-account-suspended/) - Ban detection and tracking signals
- [Postpone CQS Guide](https://www.postpone.app/blog/understanding-reddits-contributor-quality-score) - CQS factors and improvement

### Tertiary (LOW confidence)
- BlackHatWorld forum threads - Community practices (may be outdated or incorrect)
- Individual blog posts without official verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries already in codebase
- Activity limits: MEDIUM - Community consensus but Reddit keeps exact limits hidden
- CQS details: MEDIUM - Official documentation exists but specifics intentionally obscured
- Warmup schedule: MEDIUM - Multiple sources agree on general approach, exact numbers vary

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - Reddit's anti-spam evolves but core principles stable)
