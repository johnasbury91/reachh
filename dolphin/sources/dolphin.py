"""
Dolphin Anty API client.
Async client for fetching browser profiles and team users.
"""

import httpx

from ..config import settings
from ..models import DolphinProfile


class DolphinClient:
    """Async client for Dolphin Anty API."""

    def __init__(self):
        self.client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.dolphin_api_url,
            headers={
                "Authorization": f"Bearer {settings.dolphin_api_key.get_secret_value()}"
            },
            timeout=httpx.Timeout(30.0),
        )
        return self

    async def __aexit__(self, *args):
        if self.client:
            await self.client.aclose()

    async def get_team_users(self) -> list[dict]:
        """Fetch all team user IDs and names."""
        if not self.client:
            raise RuntimeError("Use async context manager")

        response = await self.client.get("/team/users")
        response.raise_for_status()
        data = response.json()

        users = []
        for user in data.get("data", []):
            users.append({
                "id": user["id"],
                "username": user.get("username", ""),
                "displayName": user.get("displayName", ""),
                "role": user.get("role", ""),
            })
        return users

    async def get_profiles(self) -> list[DolphinProfile]:
        """Fetch all browser profiles with pagination and owner info."""
        if not self.client:
            raise RuntimeError("Use async context manager")

        # First get team users to build owner lookup map
        team_users = await self.get_team_users()
        user_ids = [u["id"] for u in team_users]
        user_map = {
            u["id"]: u.get("displayName") or u.get("username", "Unknown")
            for u in team_users
        }

        profiles = []
        page = 1

        while True:
            # Build params with user IDs for filtering
            params = {"limit": 100, "page": page}
            for i, uid in enumerate(user_ids):
                params[f"users[{i}]"] = uid

            response = await self.client.get("/browser_profiles", params=params)
            response.raise_for_status()
            data = response.json()

            if not data.get("data"):
                break

            for p in data["data"]:
                # Extract notes content (handles dict or empty)
                notes = p.get("notes", {})
                if isinstance(notes, dict):
                    notes_content = notes.get("content", "") or ""
                else:
                    notes_content = ""

                # Get owner from user_map
                owner = user_map.get(p.get("userId"), "Unknown")

                profiles.append(
                    DolphinProfile(
                        id=str(p["id"]),
                        name=p["name"],
                        owner=owner,
                        notes=notes_content,
                        created_at=p.get("created_at", ""),
                        updated_at=p.get("updated_at", ""),
                    )
                )

            # Check if more pages
            if len(data["data"]) < 100:
                break
            page += 1

        return profiles
