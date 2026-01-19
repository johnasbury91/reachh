"""
Reddit account checker with anti-detection patterns.
Uses randomized delays and exponential backoff for rate limit handling.
"""

import asyncio
import random
from datetime import datetime, timezone
from typing import Literal

import httpx

from config import settings
from models import RedditStatus, ActivityCounts


class RedditChecker:
    """Check Reddit account status with anti-detection measures."""

    def __init__(self):
        self.client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            headers={"User-Agent": settings.reddit_user_agent},
        )
        return self

    async def __aexit__(self, *args):
        if self.client:
            await self.client.aclose()

    async def _random_delay(self) -> None:
        """Sleep for random duration to avoid detection patterns.

        CRITICAL for INFRA-02: Uses random.uniform, never fixed values.
        """
        delay = random.uniform(settings.reddit_min_delay, settings.reddit_max_delay)
        await asyncio.sleep(delay)

    async def check_account(self, username: str) -> RedditStatus:
        """Check single Reddit account with backoff on rate limits.

        Handles:
        - 200: Active account with karma
        - 404: Account not found
        - 403: Account suspended
        - 429: Rate limited (triggers exponential backoff)
        - Other: Error status
        """
        if not self.client:
            raise RuntimeError("Use async context manager")

        url = f"https://www.reddit.com/user/{username}/about.json"

        for attempt in range(settings.reddit_max_retries):
            # Random delay before each request (INFRA-02)
            await self._random_delay()

            try:
                response = await self.client.get(url)

                if response.status_code == 200:
                    data = response.json().get("data", {})

                    # Check for shadowban (profile exists but posts hidden)
                    shadowban_status = await self.check_shadowban(username)

                    return RedditStatus(
                        username=username,
                        status=shadowban_status,
                        total_karma=data.get("total_karma", 0),
                        comment_karma=data.get("comment_karma", 0),
                        link_karma=data.get("link_karma", 0),
                        created_utc=data.get("created_utc", 0),
                    )

                elif response.status_code == 404:
                    return RedditStatus(username=username, status="not_found")

                elif response.status_code == 403:
                    return RedditStatus(username=username, status="suspended")

                elif response.status_code == 429:
                    # Rate limited - exponential backoff with jitter (INFRA-03)
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        delay = float(retry_after)
                    else:
                        # Exponential backoff: base * 2^attempt + random jitter
                        delay = settings.reddit_backoff_base * (2**attempt)
                        delay += random.uniform(0, 1)

                    print(f"Rate limited, backing off {delay:.1f}s...")
                    await asyncio.sleep(delay)
                    continue

                else:
                    return RedditStatus(
                        username=username,
                        status="error",
                        error_message=f"HTTP {response.status_code}",
                    )

            except httpx.RequestError as e:
                # Network error - retry with backoff
                if attempt < settings.reddit_max_retries - 1:
                    delay = settings.reddit_backoff_base * (2**attempt)
                    delay += random.uniform(0, 1)
                    await asyncio.sleep(delay)
                    continue

                return RedditStatus(
                    username=username,
                    status="error",
                    error_message=str(e),
                )

        # Exhausted all retries
        return RedditStatus(username=username, status="rate_limited")

    async def check_shadowban(self, username: str) -> Literal["active", "shadowbanned"]:
        """
        Detect if an active account is actually shadowbanned.

        Only call this for accounts that passed basic check_account() as "active".
        Shadowban = profile exists but posts are not publicly visible.

        Returns:
            "active" - account is truly active (or has no posts to verify)
            "shadowbanned" - profile exists but posts are hidden
        """
        if not self.client:
            raise RuntimeError("Use async context manager")

        # Step 1: Fetch user's submitted posts
        submitted_url = f"https://www.reddit.com/user/{username}/submitted.json"

        try:
            await self._random_delay()
            submitted_resp = await self.client.get(submitted_url)

            if submitted_resp.status_code == 429:
                # Rate limited - default to active (conservative)
                return "active"

            if submitted_resp.status_code != 200:
                # Can't check - default to active (conservative)
                return "active"

            posts = submitted_resp.json().get("data", {}).get("children", [])

            if not posts:
                # No posts to verify - cannot detect shadowban
                return "active"

            # Step 2: Check if most recent post is publicly visible
            recent_post = posts[0].get("data", {})
            permalink = recent_post.get("permalink")

            if not permalink:
                return "active"

            # Step 3: Verify post visibility via direct permalink
            post_url = f"https://www.reddit.com{permalink}.json"

            await self._random_delay()
            post_resp = await self.client.get(post_url)

            if post_resp.status_code == 404:
                # Post exists on profile but not publicly visible = shadowbanned
                return "shadowbanned"

            # Post is publicly visible - account is truly active
            return "active"

        except httpx.RequestError:
            # Network error - default to active (conservative)
            return "active"

    async def check_accounts(self, usernames: list[str]) -> list[RedditStatus]:
        """Check multiple Reddit accounts.

        Returns list of RedditStatus in same order as input.
        """
        results = []
        for username in usernames:
            result = await self.check_account(username)
            results.append(result)
        return results

    async def get_activity_counts(self, username: str) -> ActivityCounts:
        """Get today's activity counts for a Reddit account.

        Fetches recent comments and posts, counts those from today (UTC).
        Designed to be called AFTER check_account() confirms the account is active.

        Args:
            username: Reddit username to check

        Returns:
            ActivityCounts with today's comment and post counts.
            Returns 0 counts on errors (account may be suspended/rate limited).
        """
        if not self.client:
            raise RuntimeError("Use async context manager")

        today = datetime.now(tz=timezone.utc).date()
        fetched_at = datetime.now(tz=timezone.utc).isoformat()

        comments_today = 0
        posts_today = 0

        # Fetch recent comments
        try:
            await self._random_delay()
            comments_url = f"https://www.reddit.com/user/{username}/comments.json?limit=25"
            comments_resp = await self.client.get(comments_url)

            if comments_resp.status_code == 200:
                comments = comments_resp.json().get("data", {}).get("children", [])
                for c in comments:
                    created_utc = c.get("data", {}).get("created_utc", 0)
                    if created_utc > 0:
                        comment_date = datetime.fromtimestamp(
                            created_utc, tz=timezone.utc
                        ).date()
                        if comment_date == today:
                            comments_today += 1
            # On 404/403/429 - return 0 counts (don't block)

        except httpx.RequestError:
            # Network error - return 0 counts
            pass

        # Fetch recent submissions
        try:
            await self._random_delay()
            posts_url = f"https://www.reddit.com/user/{username}/submitted.json?limit=10"
            posts_resp = await self.client.get(posts_url)

            if posts_resp.status_code == 200:
                posts = posts_resp.json().get("data", {}).get("children", [])
                for p in posts:
                    created_utc = p.get("data", {}).get("created_utc", 0)
                    if created_utc > 0:
                        post_date = datetime.fromtimestamp(
                            created_utc, tz=timezone.utc
                        ).date()
                        if post_date == today:
                            posts_today += 1
            # On 404/403/429 - return 0 counts (don't block)

        except httpx.RequestError:
            # Network error - return 0 counts
            pass

        return ActivityCounts(
            username=username,
            comments_today=comments_today,
            posts_today=posts_today,
            fetched_at=fetched_at,
        )
