#!/usr/bin/env python3
"""
Proxy Remediation Script.

Updates all Dolphin profiles with unique DataImpulse sticky sessions.
Each profile gets a unique session ID to prevent IP sharing.

Usage:
    python3 remediate_proxies.py --dry-run          # Preview changes
    python3 remediate_proxies.py --test ProfileName # Test single profile
    python3 remediate_proxies.py                    # Run full remediation
"""

import argparse
import asyncio
import re
import sys
from dataclasses import dataclass

from sources.dolphin import DolphinClient


# DataImpulse configuration
DATAIMPULSE_USER = "6bedabce678df1c53167"
DATAIMPULSE_PASS = "e9d405b46163e5ee"
DATAIMPULSE_HOST = "gw.dataimpulse.com"
DATAIMPULSE_PORT = 10000  # Sticky session port

# US states for distribution (14 states, geographically diverse)
US_STATES = [
    "california",
    "texas",
    "florida",
    "new_york",
    "illinois",
    "pennsylvania",
    "ohio",
    "georgia",
    "north_carolina",
    "michigan",
    "arizona",
    "washington",
    "colorado",
    "massachusetts",
]


@dataclass
class RemediationResult:
    """Result of a single profile remediation."""

    profile_id: str
    profile_name: str
    old_proxy: str
    new_proxy: str
    success: bool
    error: str = ""


def sanitize_session_id(profile_name: str) -> str:
    """Convert profile name to valid session ID.

    - Lowercase
    - Replace non-alphanumeric with underscore
    - Max 30 chars
    """
    sanitized = re.sub(r"[^a-zA-Z0-9]", "_", profile_name.lower())
    sanitized = re.sub(r"_+", "_", sanitized)  # Collapse multiple underscores
    sanitized = sanitized.strip("_")
    return sanitized[:30]


def assign_state(profile_index: int) -> str:
    """Assign a state to a profile using round-robin distribution."""
    return US_STATES[profile_index % len(US_STATES)]


def generate_proxy_login(profile_name: str, state: str) -> str:
    """Generate unique DataImpulse login with session ID, state, and max sticky duration.

    Format: baseuser__cr.us_st.STATE_s.sessionid;sessttl.120
    Example: 6bedabce678df1c53167__cr.us_st.california_s.bourdin_hady;sessttl.120

    sessttl.120 = 120 minute (2 hour) sticky session (max allowed)
    """
    session_id = sanitize_session_id(profile_name)
    return f"{DATAIMPULSE_USER}__cr.us_st.{state}_s.{session_id};sessttl.120"


def generate_proxy_url(profile_name: str, state: str) -> str:
    """Generate full proxy URL for a profile."""
    login = generate_proxy_login(profile_name, state)
    return f"http://{login}:{DATAIMPULSE_PASS}@{DATAIMPULSE_HOST}:{DATAIMPULSE_PORT}"


async def remediate_profile(
    client: DolphinClient,
    profile_id: str,
    profile_name: str,
    old_proxy: str,
    state: str,
    dry_run: bool = False,
) -> RemediationResult:
    """Remediate a single profile's proxy configuration."""
    login = generate_proxy_login(profile_name, state)
    new_proxy_url = generate_proxy_url(profile_name, state)

    result = RemediationResult(
        profile_id=profile_id,
        profile_name=profile_name,
        old_proxy=old_proxy,
        new_proxy=new_proxy_url,
        success=False,
    )

    if dry_run:
        result.success = True
        return result

    try:
        success = await client.update_profile_proxy(
            profile_id=profile_id,
            proxy_type="http",
            host=DATAIMPULSE_HOST,
            port=DATAIMPULSE_PORT,
            login=login,
            password=DATAIMPULSE_PASS,
        )
        result.success = success
        if not success:
            result.error = "API returned non-200 status"
    except Exception as e:
        result.error = str(e)

    return result


async def run_remediation(
    dry_run: bool = False,
    test_profile: str | None = None,
) -> list[RemediationResult]:
    """Run proxy remediation on all profiles."""
    results = []

    async with DolphinClient() as client:
        print("Fetching profiles from Dolphin...")
        profiles = await client.get_profiles()
        print(f"Found {len(profiles)} profiles")

        # Filter to single profile if testing
        if test_profile:
            profiles = [p for p in profiles if p.name.lower() == test_profile.lower()]
            if not profiles:
                print(f"ERROR: Profile '{test_profile}' not found")
                return results
            print(f"Testing single profile: {profiles[0].name}")

        # Process each profile with state assignment
        for i, profile in enumerate(profiles):
            state = assign_state(i)
            result = await remediate_profile(
                client=client,
                profile_id=profile.id,
                profile_name=profile.name,
                old_proxy=profile.proxy_url,
                state=state,
                dry_run=dry_run,
            )
            results.append(result)

            # Status indicator
            status = "✓" if result.success else "✗"
            mode = "[DRY-RUN] " if dry_run else ""
            print(f"{mode}[{i+1}/{len(profiles)}] {status} {profile.name} → {state}")

            if result.error:
                print(f"    ERROR: {result.error}")

            # Small delay to avoid rate limiting
            if not dry_run and i < len(profiles):
                await asyncio.sleep(0.1)

    return results


def print_summary(results: list[RemediationResult], dry_run: bool = False):
    """Print remediation summary."""
    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count

    print("\n" + "=" * 60)
    if dry_run:
        print("DRY-RUN SUMMARY (no changes made)")
    else:
        print("REMEDIATION SUMMARY")
    print("=" * 60)
    print(f"Total profiles:  {len(results)}")
    print(f"Successful:      {success_count}")
    print(f"Failed:          {fail_count}")

    if fail_count > 0:
        print("\nFailed profiles:")
        for r in results:
            if not r.success:
                print(f"  - {r.profile_name}: {r.error}")

    if dry_run and results:
        print("\nSample changes:")
        for r in results[:5]:
            print(f"\n  {r.profile_name}:")
            old_display = r.old_proxy[:70] + "..." if len(r.old_proxy) > 70 else r.old_proxy
            new_display = r.new_proxy[:70] + "..." if len(r.new_proxy) > 70 else r.new_proxy
            print(f"    Old: {old_display}")
            print(f"    New: {new_display}")

        # Show state distribution
        print("\nState distribution:")
        from collections import Counter
        state_counts = Counter()
        for i in range(len(results)):
            state_counts[assign_state(i)] += 1
        for state, count in sorted(state_counts.items()):
            print(f"  {state}: {count} profiles")


def main():
    parser = argparse.ArgumentParser(description="Remediate Dolphin profile proxies")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    parser.add_argument(
        "--test",
        metavar="PROFILE",
        help="Test remediation on a single profile by name",
    )
    args = parser.parse_args()

    if not args.dry_run and not args.test:
        print("WARNING: This will update ALL profile proxies!")
        print("Run with --dry-run first to preview changes.")
        confirm = input("Continue? [y/N]: ")
        if confirm.lower() != "y":
            print("Aborted.")
            sys.exit(0)

    results = asyncio.run(run_remediation(
        dry_run=args.dry_run,
        test_profile=args.test,
    ))

    print_summary(results, dry_run=args.dry_run)

    # Exit with error code if any failures
    if any(not r.success for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
