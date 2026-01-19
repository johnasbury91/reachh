#!/usr/bin/env python3
"""
Dolphin + Reddit Account Tracker
Fetches profiles from Dolphin Anty and checks Reddit karma for each account.

Uses async modules for Dolphin API and Reddit checking with anti-detection.
"""

import asyncio
import csv
import json
import logging
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

from alerts import notify_bans, notify_proxy_failures
from config import setup_logging
from models import DolphinProfile, RedditStatus, AccountResult, ProxyHealth
from sheets_sync import sync_to_sheet, archive_stale_profiles
from sources import DolphinClient, RedditChecker
from sources.proxy_health import ProxyHealthChecker
from state import load_state, save_state, build_current_state, detect_changes

# Module-level logger
logger = logging.getLogger("tracker")


def categorize_account(notes_content: str, reddit_status: str) -> str:
    """
    Categorize account based on Reddit status first, then Dolphin notes.
    Reddit status is trusted over Dolphin notes.
    Returns a category string.
    """
    notes_lower = notes_content.lower() if notes_content else ""

    # Check notes for known states
    not_created_keywords = ["need to create", "needs to be created", "need to login", "free space"]
    known_suspended_keywords = ["suspend", "banned"]
    needs_farming_keywords = ["needs to be farmed", "farming", "ready account"]

    # Priority 1: Trust Reddit status if account is active
    if reddit_status == "active":
        # Check if it needs farming based on notes
        for keyword in needs_farming_keywords:
            if keyword in notes_lower:
                return "needs_farming"
        return "active"

    # Priority 2: Reddit says not found or suspended
    if reddit_status in ["not_found", "suspended"]:
        # Check if notes indicate it was never created
        for keyword in not_created_keywords:
            if keyword in notes_lower:
                return "not_created"
        # Check if already known as suspended in notes
        for keyword in known_suspended_keywords:
            if keyword in notes_lower:
                return "known_suspended"
        # Otherwise it's suspended/not_found without prior knowledge
        return reddit_status

    # Priority 3: Other statuses (rate_limited, errors, etc.)
    return reddit_status


def load_history() -> dict:
    """Load historical karma data."""
    history_file = Path(__file__).parent / "karma_history.json"
    if history_file.exists():
        with open(history_file) as f:
            return json.load(f)
    return {}


def save_history(history: dict) -> None:
    """Save karma history to JSON."""
    history_file = Path(__file__).parent / "karma_history.json"
    with open(history_file, "w") as f:
        json.dump(history, f, indent=2)


async def run_tracker(limit: int | None = None) -> int:
    """
    Main tracking function. Pass limit to only check first N profiles.

    Returns:
        int: Exit code (0=success, 1=failure)
    """
    try:
        logger.info("Starting tracker...")

        # Fetch Dolphin profiles
        logger.info("Fetching Dolphin profiles...")
        async with DolphinClient() as dolphin:
            profiles = await dolphin.get_profiles()
        logger.info(f"Found {len(profiles)} profiles")

        # Extract profile IDs for stale detection
        dolphin_profile_ids = {str(p.id) for p in profiles}

        if limit:
            profiles = profiles[:limit]
            logger.info(f"Test mode: checking only first {limit} profiles")

        # Load history
        history = load_history()
        today = datetime.now().strftime("%Y-%m-%d")

        # Check Reddit status for each profile
        results: list[AccountResult] = []
        proxy_checker = ProxyHealthChecker()

        async with RedditChecker() as reddit:
            for i, profile in enumerate(profiles):
                logger.info(f"[{i+1}/{len(profiles)}] Checking {profile.name}...")

                # Check Reddit status
                status = await reddit.check_account(profile.name)

                if status.status == "active":
                    logger.info(f"  Karma: {status.total_karma} (comment: {status.comment_karma}, link: {status.link_karma})")

                    # Calculate karma change
                    karma_change = 0
                    if profile.name in history and history[profile.name]:
                        last_entry = list(history[profile.name].values())[-1]
                        karma_change = status.total_karma - last_entry.get("total_karma", 0)

                    # Update history
                    if profile.name not in history:
                        history[profile.name] = {}
                    history[profile.name][today] = {
                        "total_karma": status.total_karma,
                        "comment_karma": status.comment_karma,
                        "link_karma": status.link_karma,
                    }
                else:
                    logger.info(f"  Status: {status.status}")
                    karma_change = 0

                # Categorize account
                category = categorize_account(profile.notes, status.status)

                # Check proxy health
                proxy_health = await proxy_checker.check(profile.proxy or "")

                # Create result
                result = AccountResult(
                    profile=profile,
                    reddit=status,
                    category=category,
                    karma_change=karma_change,
                    checked_at=datetime.now().isoformat(),
                    proxy_health=proxy_health,
                )
                results.append(result)

        # Save history
        save_history(history)

        # State tracking and alerts
        try:
            previous_state = load_state()
            current_state = build_current_state(results)
            changes = detect_changes(previous_state, current_state)

            # Send alerts for new problems
            if changes["new_bans"]:
                logger.warning(f"New bans detected: {changes['new_bans']}")
                notify_bans(changes["new_bans"])

            if changes["new_proxy_failures"]:
                logger.warning(f"New proxy failures detected: {changes['new_proxy_failures']}")
                notify_proxy_failures(changes["new_proxy_failures"])

            # Save current state for next run
            save_state(current_state)
        except Exception as e:
            logger.warning(f"Alerting failed: {e}")
            # Continue with CSV export and Sheets sync

        # Export to CSV
        csv_file = Path(__file__).parent / f"tracking_{today}.csv"
        csv_rows = []
        for r in results:
            # Clean notes for CSV (remove HTML tags)
            clean_notes = re.sub(r'<[^>]+>', '', r.profile.notes).strip() if r.profile.notes else ""

            csv_rows.append({
                "profile_id": r.profile.id,
                "reddit_username": r.profile.name,
                "owner": r.profile.owner,
                "category": r.category,
                "dolphin_created": r.profile.created_at,
                "dolphin_last_active": r.profile.updated_at,
                "total_karma": r.reddit.total_karma,
                "comment_karma": r.reddit.comment_karma,
                "link_karma": r.reddit.link_karma,
                "karma_change": r.karma_change,
                "reddit_status": r.reddit.status,
                "notes": clean_notes,
                "checked_at": r.checked_at,
            })

        if csv_rows:
            with open(csv_file, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=csv_rows[0].keys())
                writer.writeheader()
                writer.writerows(csv_rows)
            logger.info(f"Results saved to {csv_file}")

        # Sync to Google Sheets
        try:
            logger.info("Syncing to Google Sheets...")
            stats = sync_to_sheet(results)
            logger.info(f"Sheets sync complete: {stats['updated']} updated, {stats['inserted']} inserted")

            # Archive profiles deleted from Dolphin
            archive_stats = archive_stale_profiles(dolphin_profile_ids)
            if archive_stats["archived"] > 0:
                logger.info(f"Archived {archive_stats['archived']} stale profile(s)")
        except Exception as e:
            logger.warning(f"Sheets sync failed: {e}")
            # Don't fail the whole run - CSV export already succeeded

        # Log summary by category
        categories = Counter(r.category for r in results)
        total_karma_all = sum(r.reddit.total_karma for r in results)

        logger.info("=== SUMMARY BY CATEGORY ===")
        for cat, count in categories.most_common():
            logger.info(f"  {cat}: {count}")
        logger.info(f"Total karma across all accounts: {total_karma_all}")

        # Log category breakdown by owner
        logger.info("=== BY OWNER ===")
        owners = set(r.profile.owner for r in results)
        for owner in owners:
            owner_results = [r for r in results if r.profile.owner == owner]
            owner_cats = Counter(r.category for r in owner_results)
            owner_karma = sum(r.reddit.total_karma for r in owner_results)
            logger.info(f"{owner}:")
            for cat, count in owner_cats.most_common():
                logger.info(f"  {cat}: {count}")
            logger.info(f"  Total karma: {owner_karma}")

        return 0

    except Exception as e:
        logger.exception(f"Tracker failed with error: {e}")
        return 1


def main() -> int:
    """Entry point for scheduled execution."""
    setup_logging()

    logger.info("=" * 60)
    logger.info("Starting scheduled tracker run")

    try:
        exit_code = asyncio.run(run_tracker())
        if exit_code == 0:
            logger.info("Tracker completed successfully")
        else:
            logger.error(f"Tracker completed with errors (exit code: {exit_code})")
        return exit_code
    except KeyboardInterrupt:
        logger.warning("Tracker interrupted by user")
        return 130
    except Exception as e:
        logger.exception(f"Tracker failed with unexpected error: {e}")
        return 1


if __name__ == "__main__":
    test_mode = "--test" in sys.argv
    if test_mode:
        # Interactive testing - setup logging but stay in foreground
        setup_logging()
        asyncio.run(run_tracker(limit=5))
    else:
        # Scheduled execution - proper entry point with exit codes
        sys.exit(main())
