#!/usr/bin/env python3
"""
Profile Cleanup Script.

Scans all Dolphin profiles against Reddit to find dead accounts,
and optionally deletes them. Also fixes timezones to match proxy geo.

Usage:
    python3 cleanup_profiles.py --scan              # Scan only, show dead profiles
    python3 cleanup_profiles.py --delete            # Delete dead profiles
    python3 cleanup_profiles.py --fix-timezones     # Fix timezones to match proxy state
    python3 cleanup_profiles.py --all               # Do everything
"""

import argparse
import asyncio
import re
import sys

from sources.dolphin import DolphinClient
from sources.reddit import RedditChecker


# State to timezone mapping
STATE_TIMEZONES = {
    "california": "America/Los_Angeles",
    "washington": "America/Los_Angeles",
    "arizona": "America/Phoenix",
    "colorado": "America/Denver",
    "texas": "America/Chicago",
    "illinois": "America/Chicago",
    "michigan": "America/Detroit",
    "ohio": "America/New_York",
    "georgia": "America/New_York",
    "florida": "America/New_York",
    "north_carolina": "America/New_York",
    "pennsylvania": "America/New_York",
    "new_york": "America/New_York",
    "massachusetts": "America/New_York",
}


def extract_state_from_proxy(proxy_url: str) -> str | None:
    """Extract state from proxy URL."""
    match = re.search(r"state\.([a-z_]+)", proxy_url)
    if match:
        return match.group(1)
    return None


async def scan_profiles() -> tuple[list[dict], list[dict], list[dict]]:
    """Scan all profiles and categorize them.

    Returns:
        Tuple of (active, dead, suspended) profile lists
    """
    async with DolphinClient() as dolphin:
        profiles = await dolphin.get_profiles()

    print(f"Scanning {len(profiles)} profiles against Reddit...")
    print()

    active = []
    dead = []
    suspended = []

    async with RedditChecker() as reddit:
        for i, p in enumerate(profiles):
            status = await reddit.check_account(p.name)

            profile_info = {
                "id": p.id,
                "name": p.name,
                "proxy_url": p.proxy_url,
                "status": status.status,
            }

            if status.status == "not_found":
                dead.append(profile_info)
                marker = "DEAD"
            elif status.status == "suspended":
                suspended.append(profile_info)
                marker = "SUSPENDED"
            else:
                active.append(profile_info)
                marker = "OK"

            # Progress every 25
            if (i + 1) % 25 == 0 or marker != "OK":
                print(f"  [{i+1}/{len(profiles)}] {p.name}: {marker}")

    return active, dead, suspended


async def delete_profiles(profiles: list[dict], dry_run: bool = False) -> int:
    """Delete profiles from Dolphin.

    Returns:
        Number of profiles deleted
    """
    if not profiles:
        print("No profiles to delete.")
        return 0

    print(f"\nDeleting {len(profiles)} profiles...")

    deleted = 0
    async with DolphinClient() as dolphin:
        for p in profiles:
            if dry_run:
                print(f"  [DRY-RUN] Would delete: {p['name']}")
                deleted += 1
            else:
                success = await dolphin.delete_profile(p["id"])
                if success:
                    print(f"  ✓ Deleted: {p['name']}")
                    deleted += 1
                else:
                    print(f"  ✗ Failed to delete: {p['name']}")
                await asyncio.sleep(0.1)

    return deleted


async def fix_timezones(dry_run: bool = False) -> int:
    """Fix profile timezones to match proxy state.

    Returns:
        Number of profiles updated
    """
    async with DolphinClient() as dolphin:
        profiles = await dolphin.get_profiles()

    print(f"\nChecking timezones for {len(profiles)} profiles...")

    updated = 0
    async with DolphinClient() as dolphin:
        for i, p in enumerate(profiles):
            state = extract_state_from_proxy(p.proxy_url)
            if not state:
                continue

            timezone = STATE_TIMEZONES.get(state)
            if not timezone:
                continue

            if dry_run:
                print(f"  [DRY-RUN] {p.name}: {state} → {timezone}")
                updated += 1
            else:
                success = await dolphin.update_profile_timezone(p.id, timezone)
                if success:
                    updated += 1
                    if (updated) % 25 == 0:
                        print(f"  Progress: {updated} timezones updated")
                await asyncio.sleep(0.1)

    return updated


def print_summary(active: list, dead: list, suspended: list):
    """Print scan summary."""
    print("\n" + "=" * 60)
    print("SCAN SUMMARY")
    print("=" * 60)
    print(f"Total profiles:  {len(active) + len(dead) + len(suspended)}")
    print(f"Active:          {len(active)}")
    print(f"Dead:            {len(dead)}")
    print(f"Suspended:       {len(suspended)}")

    if dead:
        print("\nDead profiles (can be deleted):")
        for p in dead:
            print(f"  - {p['name']}")

    if suspended:
        print("\nSuspended profiles:")
        for p in suspended:
            print(f"  - {p['name']}")


def main():
    parser = argparse.ArgumentParser(description="Cleanup Dolphin profiles")
    parser.add_argument("--scan", action="store_true", help="Scan profiles against Reddit")
    parser.add_argument("--delete", action="store_true", help="Delete dead profiles")
    parser.add_argument("--fix-timezones", action="store_true", help="Fix timezones to match proxy state")
    parser.add_argument("--all", action="store_true", help="Do scan, delete, and fix timezones")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    args = parser.parse_args()

    if not any([args.scan, args.delete, args.fix_timezones, args.all]):
        parser.print_help()
        sys.exit(1)

    if args.all:
        args.scan = args.delete = args.fix_timezones = True

    active, dead, suspended = [], [], []

    # Scan if requested
    if args.scan or args.delete:
        active, dead, suspended = asyncio.run(scan_profiles())
        print_summary(active, dead, suspended)

    # Delete dead profiles if requested
    if args.delete and dead:
        if not args.dry_run:
            print(f"\nWARNING: About to delete {len(dead)} profiles!")
            confirm = input("Continue? [y/N]: ")
            if confirm.lower() != "y":
                print("Skipping delete.")
            else:
                deleted = asyncio.run(delete_profiles(dead))
                print(f"\nDeleted {deleted} profiles.")
        else:
            deleted = asyncio.run(delete_profiles(dead, dry_run=True))
            print(f"\n[DRY-RUN] Would delete {deleted} profiles.")

    # Fix timezones if requested
    if args.fix_timezones:
        if args.dry_run:
            updated = asyncio.run(fix_timezones(dry_run=True))
            print(f"\n[DRY-RUN] Would update {updated} timezones.")
        else:
            print(f"\nUpdating timezones to match proxy states...")
            updated = asyncio.run(fix_timezones())
            print(f"\nUpdated {updated} timezones.")


if __name__ == "__main__":
    main()
