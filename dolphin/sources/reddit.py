"""
Reddit account checker with anti-detection patterns.
Uses randomized delays and exponential backoff for rate limit handling.
"""

import asyncio
import random

import httpx

from config import settings
from models import RedditStatus


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
                    return RedditStatus(
                        username=username,
                        status="active",
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

    async def check_accounts(self, usernames: list[str]) -> list[RedditStatus]:
        """Check multiple Reddit accounts.

        Returns list of RedditStatus in same order as input.
        """
        results = []
        for username in usernames:
            result = await self.check_account(username)
            results.append(result)
        return results
