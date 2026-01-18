"""
State tracking for change detection between tracker runs.

Tracks account statuses and proxy health to detect new problems
(bans, suspensions, proxy failures) that require alerts.
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from models import AccountResult

# State file location (same directory as this module)
STATE_FILE = Path(__file__).parent / "last_run_state.json"

logger = logging.getLogger("tracker")


def load_state() -> dict:
    """
    Load state from previous tracker run.

    Returns:
        dict with 'accounts', 'proxies', and 'run_at' keys.
        Returns empty state structure if file missing or corrupt.
    """
    if not STATE_FILE.exists():
        logger.debug("No previous state file found, starting fresh")
        return {"accounts": {}, "proxies": {}, "run_at": None}

    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            state = json.load(f)
        # Validate structure
        if not isinstance(state.get("accounts"), dict):
            state["accounts"] = {}
        if not isinstance(state.get("proxies"), dict):
            state["proxies"] = {}
        return state
    except (json.JSONDecodeError, IOError) as e:
        logger.warning(f"Failed to load state file, starting fresh: {e}")
        return {"accounts": {}, "proxies": {}, "run_at": None}


def save_state(state: dict) -> None:
    """
    Atomically save state to prevent corruption.

    Uses temp file + rename pattern for POSIX atomic write.

    Args:
        state: dict with 'accounts', 'proxies', and 'run_at' keys.
    """
    # Ensure state has required structure
    if "accounts" not in state:
        state["accounts"] = {}
    if "proxies" not in state:
        state["proxies"] = {}
    if "run_at" not in state:
        state["run_at"] = datetime.now(tz=timezone.utc).isoformat()

    # Atomic write: temp file in same directory, then rename
    temp_fd, temp_path = tempfile.mkstemp(
        dir=STATE_FILE.parent,
        prefix=".state_",
        suffix=".tmp"
    )
    try:
        with os.fdopen(temp_fd, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.rename(temp_path, STATE_FILE)
        logger.debug(f"State saved to {STATE_FILE}")
    except Exception:
        # Clean up temp file on failure
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def build_current_state(results: list[AccountResult]) -> dict:
    """
    Extract state from tracker results for comparison.

    Args:
        results: List of AccountResult from tracker run.

    Returns:
        dict with 'accounts' mapping username->status,
        'proxies' mapping proxy_url->health, and 'run_at' timestamp.
    """
    accounts = {}
    proxies = {}

    for r in results:
        # Track account status (username -> status string)
        accounts[r.reddit.username] = r.reddit.status

        # Track proxy health (proxy_url -> health status)
        # Only track proxies that are configured (not empty or "None")
        if r.profile.proxy and r.profile.proxy != "None" and r.proxy_health:
            proxies[r.profile.proxy] = r.proxy_health.status

    return {
        "accounts": accounts,
        "proxies": proxies,
        "run_at": datetime.now(tz=timezone.utc).isoformat(),
    }


def detect_changes(previous: dict, current: dict) -> dict:
    """
    Detect new problems between runs.

    Args:
        previous: State from previous run.
        current: State from current run.

    Returns:
        dict with:
          - 'new_bans': list of usernames that went active -> suspended/not_found
          - 'new_proxy_failures': list of proxy URLs that went pass -> fail/blocked
    """
    new_bans = []
    new_proxy_failures = []

    prev_accounts = previous.get("accounts", {})
    curr_accounts = current.get("accounts", {})

    prev_proxies = previous.get("proxies", {})
    curr_proxies = current.get("proxies", {})

    # Detect accounts that changed from active to banned states
    for username, status in curr_accounts.items():
        prev_status = prev_accounts.get(username)
        # Only alert if previously active (or shadowbanned) and now suspended/not_found
        if prev_status in ("active", "shadowbanned") and status in ("suspended", "not_found"):
            new_bans.append(username)

    # Detect proxies that started failing
    for proxy_url, health in curr_proxies.items():
        prev_health = prev_proxies.get(proxy_url)
        # Only alert if was passing and now failing/blocked
        if prev_health == "pass" and health in ("fail", "blocked"):
            new_proxy_failures.append(proxy_url)

    return {
        "new_bans": new_bans,
        "new_proxy_failures": new_proxy_failures,
    }
