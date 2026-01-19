"""
Dolphin Anty API client.
Async client for fetching browser profiles and team users.
"""

import httpx

from config import settings
from models import DolphinProfile


def format_proxy(proxy_data: dict | None) -> tuple[str, str]:
    """Extract proxy info for display and health checking.

    Returns:
        Tuple of (display_proxy, full_proxy_url)
        - display_proxy: Hostname only (safe for sheet display)
        - full_proxy_url: Full URL with credentials (for health checking)
    """
    if not proxy_data:
        return "None", ""

    host = proxy_data.get("host", "")
    if not host:
        return "None", ""

    proxy_type = proxy_data.get("type", "http")

    # Display version: just the hostname (safe for sheets)
    display_proxy = f"{proxy_type}://{host}"

    # Full URL: from 'name' field which contains credentials
    # Format: http://username:password@host:port
    name = proxy_data.get("name", "")
    if name and ("@" in name or "://" in name):
        # 'name' contains the full proxy URL
        if not name.startswith(("http://", "https://", "socks")):
            full_url = f"{proxy_type}://{name}"
        else:
            full_url = name
    else:
        # No credentials available, use basic format
        port = proxy_data.get("port", "")
        if port:
            full_url = f"{proxy_type}://{host}:{port}"
        else:
            full_url = display_proxy

    return display_proxy, full_url


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

                # Extract proxy info from profile
                proxy_data = p.get("proxy", {})
                display_proxy, full_proxy_url = format_proxy(proxy_data) if proxy_data else ("None", "")

                profiles.append(
                    DolphinProfile(
                        id=str(p["id"]),
                        name=p["name"],
                        owner=owner,
                        notes=notes_content,
                        created_at=p.get("created_at", ""),
                        updated_at=p.get("updated_at", ""),
                        proxy=display_proxy,
                        proxy_url=full_proxy_url,
                    )
                )

            # Check if more pages
            if len(data["data"]) < 100:
                break
            page += 1

        return profiles

    async def update_profile_proxy(
        self,
        profile_id: str,
        proxy_type: str,
        host: str,
        port: int,
        login: str,
        password: str,
    ) -> bool:
        """Update a profile's proxy configuration.

        Args:
            profile_id: Dolphin profile ID
            proxy_type: Proxy type (http, socks5, etc.)
            host: Proxy hostname
            port: Proxy port
            login: Proxy username (with geo params)
            password: Proxy password

        Returns:
            True if update successful, False otherwise
        """
        if not self.client:
            raise RuntimeError("Use async context manager")

        # Build full proxy URL for the 'name' field
        full_url = f"{proxy_type}://{login}:{password}@{host}:{port}"

        proxy_data = {
            "proxy": {
                "type": proxy_type,
                "host": host,
                "port": port,
                "name": full_url,
                "login": login,
                "password": password,
            }
        }

        response = await self.client.patch(
            f"/browser_profiles/{profile_id}",
            json=proxy_data,
        )

        return response.status_code == 200
