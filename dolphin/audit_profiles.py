#!/usr/bin/env python3
"""
Dolphin Profile Audit Script.
Checks all Dolphin profiles for proper proxy and session configuration.

Identifies common misconfigurations that cause Reddit bans:
1. Profiles with no proxy configured
2. Profiles using rotating IPs (port 823) instead of sticky
3. Multiple profiles sharing the same proxy session
4. Profiles with incomplete geo-targeting

Usage:
    python3 audit_profiles.py              # Console + JSON only
    python3 audit_profiles.py --sync       # Also sync to Google Sheets "Audit" tab
"""

import argparse
import asyncio
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import gspread

from sources.dolphin import DolphinClient
from models import DolphinProfile
from config import settings


@dataclass
class ProxyAuditInfo:
    """Parsed proxy configuration for audit purposes."""

    provider: str = "unknown"
    host: str = ""
    port: int = 0
    session_type: str = "unknown"  # "rotating", "sticky", "unknown"
    geo_country: str = ""
    geo_state: str = ""
    geo_city: str = ""
    geo_zip: str = ""
    session_id: str = ""  # Port number for sticky sessions


@dataclass
class ProfileAuditResult:
    """Audit result for a single profile."""

    profile_id: str
    username: str
    owner: str
    proxy_url: str
    proxy_info: ProxyAuditInfo
    issues: list[str] = field(default_factory=list)


@dataclass
class AuditReport:
    """Complete audit report."""

    total_profiles: int = 0
    profiles_checked: int = 0
    profiles_with_issues: int = 0

    # Issue counts
    no_proxy_count: int = 0
    rotating_proxy_count: int = 0
    shared_proxy_count: int = 0
    no_geo_count: int = 0

    # Detailed results
    results: list[ProfileAuditResult] = field(default_factory=list)

    # Shared proxy sessions (session_id -> list of profiles)
    shared_sessions: dict[str, list[str]] = field(default_factory=dict)


def parse_dataimpulse_proxy(proxy_url: str) -> ProxyAuditInfo:
    """Parse DataImpulse proxy URL for audit.

    DataImpulse format:
    - Host: gw.dataimpulse.com
    - Port 823 = rotating
    - Port 10000+ = sticky (each port is a session ID)
    - Username params: user__cr.us;state.california;city.losangeles
    """
    info = ProxyAuditInfo(provider="dataimpulse")

    try:
        parsed = urlparse(proxy_url)
        info.host = parsed.hostname or ""
        info.port = parsed.port or 0

        # Session type based on port
        if info.port == 823:
            info.session_type = "rotating"
        elif info.port >= 10000:
            info.session_type = "sticky"
            info.session_id = str(info.port)
        else:
            info.session_type = "unknown"

        # Parse geo and session ID from username
        # Format: user__cr.us;state.illinois;city.chicago
        # Or with session: user__cr.us;state.california-sess_profilename
        username = parsed.username or ""
        if "__" in username:
            params_part = username.split("__", 1)[1]

            # Check for session ID suffix (e.g., -sess_profilename)
            if "-sess_" in params_part:
                params_part, session_suffix = params_part.rsplit("-sess_", 1)
                info.session_id = f"sess_{session_suffix}"  # Use session ID from username

            params = params_part.split(";")
            for param in params:
                if param.startswith("cr."):
                    info.geo_country = param[3:]
                elif param.startswith("state."):
                    info.geo_state = param[6:]
                elif param.startswith("city."):
                    info.geo_city = param[5:]
                elif param.startswith("zip."):
                    info.geo_zip = param[4:]
    except Exception:
        pass

    return info


def parse_decodo_proxy(proxy_url: str) -> ProxyAuditInfo:
    """Parse Decodo proxy URL for audit.

    Decodo format:
    - Host: gate.decodo.com or smartproxy.com
    - Port 7000 = rotating
    - Sticky via sessionduration parameter in username
    """
    info = ProxyAuditInfo(provider="decodo")

    try:
        parsed = urlparse(proxy_url)
        info.host = parsed.hostname or ""
        info.port = parsed.port or 0

        username = parsed.username or ""

        # Check for sticky session via sessionduration parameter
        if "sessionduration" in username.lower():
            info.session_type = "sticky"
            # Extract session duration value
            match = re.search(r"sessionduration[_-](\d+)", username.lower())
            if match:
                info.session_id = f"duration_{match.group(1)}"
        elif info.port == 7000:
            info.session_type = "rotating"
        else:
            info.session_type = "sticky"  # Non-7000 ports are typically sticky
            info.session_id = str(info.port)

        # Decodo uses country- prefixes in username for geo
        if "country-" in username.lower():
            match = re.search(r"country-(\w+)", username.lower())
            if match:
                info.geo_country = match.group(1)
    except Exception:
        pass

    return info


def parse_brightdata_proxy(proxy_url: str) -> ProxyAuditInfo:
    """Parse Bright Data proxy URL for audit."""
    info = ProxyAuditInfo(provider="brightdata")

    try:
        parsed = urlparse(proxy_url)
        info.host = parsed.hostname or ""
        info.port = parsed.port or 0

        username = parsed.username or ""

        # Bright Data uses session- parameter for sticky
        if "session-" in username.lower():
            info.session_type = "sticky"
            match = re.search(r"session-(\w+)", username.lower())
            if match:
                info.session_id = match.group(1)
        else:
            info.session_type = "rotating"

        # Check for country parameter
        if "country-" in username.lower():
            match = re.search(r"country-(\w+)", username.lower())
            if match:
                info.geo_country = match.group(1)
    except Exception:
        pass

    return info


def parse_proxy(proxy_url: str) -> ProxyAuditInfo:
    """Parse any proxy URL and return audit info."""
    if not proxy_url or proxy_url == "None":
        return ProxyAuditInfo()

    lower = proxy_url.lower()

    if "dataimpulse.com" in lower:
        return parse_dataimpulse_proxy(proxy_url)
    elif "decodo.com" in lower or "smartproxy.com" in lower:
        return parse_decodo_proxy(proxy_url)
    elif "brightdata.com" in lower or "luminati.io" in lower or "brd.superproxy.io" in lower:
        return parse_brightdata_proxy(proxy_url)
    else:
        # Unknown provider - try generic parsing
        info = ProxyAuditInfo(provider="unknown")
        try:
            parsed = urlparse(proxy_url)
            info.host = parsed.hostname or ""
            info.port = parsed.port or 0
        except Exception:
            pass
        return info


def audit_profile(profile: DolphinProfile) -> ProfileAuditResult:
    """Audit a single profile for configuration issues."""
    result = ProfileAuditResult(
        profile_id=profile.id,
        username=profile.name,
        owner=profile.owner,
        proxy_url=profile.proxy_url,
        proxy_info=parse_proxy(profile.proxy_url),
    )

    # Issue 1: No proxy configured
    if not profile.proxy_url or profile.proxy_url == "None" or profile.proxy == "None":
        result.issues.append("NO_PROXY")
        return result  # No further checks possible

    # Issue 2: Using rotating instead of sticky
    if result.proxy_info.session_type == "rotating":
        result.issues.append("ROTATING_PROXY")

    # Issue 3: No geo-targeting (for providers that support it)
    if result.proxy_info.provider == "dataimpulse":
        if not result.proxy_info.geo_country:
            result.issues.append("NO_GEO_TARGETING")

    return result


def detect_shared_sessions(results: list[ProfileAuditResult]) -> dict[str, list[str]]:
    """Detect profiles sharing the same proxy session."""
    session_to_profiles: dict[str, list[str]] = defaultdict(list)

    for result in results:
        if result.proxy_info.session_type == "sticky" and result.proxy_info.session_id:
            # Create unique session key: provider_host_session
            key = f"{result.proxy_info.provider}_{result.proxy_info.host}_{result.proxy_info.session_id}"
            session_to_profiles[key].append(result.username)

    # Filter to only sessions with multiple profiles
    return {k: v for k, v in session_to_profiles.items() if len(v) > 1}


async def fetch_profiles() -> list[DolphinProfile]:
    """Fetch all profiles from Dolphin API."""
    async with DolphinClient() as client:
        return await client.get_profiles()


def generate_report(results: list[ProfileAuditResult], shared_sessions: dict[str, list[str]]) -> AuditReport:
    """Generate audit report from results."""
    report = AuditReport(
        total_profiles=len(results),
        profiles_checked=len(results),
        results=results,
        shared_sessions=shared_sessions,
    )

    for result in results:
        if result.issues:
            report.profiles_with_issues += 1

        if "NO_PROXY" in result.issues:
            report.no_proxy_count += 1
        if "ROTATING_PROXY" in result.issues:
            report.rotating_proxy_count += 1
        if "NO_GEO_TARGETING" in result.issues:
            report.no_geo_count += 1

    # Count profiles in shared sessions
    shared_profile_count = sum(len(profiles) for profiles in shared_sessions.values())
    report.shared_proxy_count = shared_profile_count

    return report


def print_report(report: AuditReport) -> None:
    """Print audit report to console."""
    print("\n=== Dolphin Profile Audit ===")
    print(f"Total profiles: {report.total_profiles}")
    print()

    if report.profiles_with_issues == 0 and not report.shared_sessions:
        print("No issues found. All profiles are properly configured.")
        return

    print("ISSUES FOUND:")

    if report.no_proxy_count > 0:
        print(f"  - {report.no_proxy_count} profiles with no proxy configured")
        no_proxy_profiles = [r for r in report.results if "NO_PROXY" in r.issues]
        for p in no_proxy_profiles[:5]:  # Show first 5
            print(f"      * {p.username} (owner: {p.owner})")
        if len(no_proxy_profiles) > 5:
            print(f"      ... and {len(no_proxy_profiles) - 5} more")

    if report.rotating_proxy_count > 0:
        print(f"  - {report.rotating_proxy_count} profiles using rotating proxy (should be sticky)")
        rotating_profiles = [r for r in report.results if "ROTATING_PROXY" in r.issues]
        for p in rotating_profiles[:5]:
            print(f"      * {p.username} (port: {p.proxy_info.port})")
        if len(rotating_profiles) > 5:
            print(f"      ... and {len(rotating_profiles) - 5} more")

    if report.shared_sessions:
        total_shared = sum(len(profiles) for profiles in report.shared_sessions.values())
        print(f"  - {total_shared} profiles sharing proxy sessions ({len(report.shared_sessions)} shared sessions)")
        for session_key, profiles in list(report.shared_sessions.items())[:3]:
            print(f"      * Session {session_key.split('_')[-1]}: {', '.join(profiles)}")
        if len(report.shared_sessions) > 3:
            print(f"      ... and {len(report.shared_sessions) - 3} more shared sessions")

    if report.no_geo_count > 0:
        print(f"  - {report.no_geo_count} profiles with no geo-targeting")
        no_geo_profiles = [r for r in report.results if "NO_GEO_TARGETING" in r.issues]
        for p in no_geo_profiles[:5]:
            print(f"      * {p.username}")
        if len(no_geo_profiles) > 5:
            print(f"      ... and {len(no_geo_profiles) - 5} more")

    print()


def save_report_json(report: AuditReport, output_path: Path) -> None:
    """Save audit report to JSON file."""
    # Convert dataclasses to dict for JSON serialization
    output = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_profiles": report.total_profiles,
            "profiles_with_issues": report.profiles_with_issues,
            "no_proxy_count": report.no_proxy_count,
            "rotating_proxy_count": report.rotating_proxy_count,
            "shared_proxy_count": report.shared_proxy_count,
            "no_geo_count": report.no_geo_count,
        },
        "shared_sessions": report.shared_sessions,
        "profiles_with_issues": [
            {
                "profile_id": r.profile_id,
                "username": r.username,
                "owner": r.owner,
                "issues": r.issues,
                "proxy_info": asdict(r.proxy_info),
            }
            for r in report.results
            if r.issues
        ],
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)


# Audit sheet headers
AUDIT_HEADERS = [
    "username",        # A
    "owner",           # B
    "issues",          # C - comma-separated issue codes
    "provider",        # D
    "session_type",    # E
    "session_id",      # F
    "geo",             # G - country/state/city
    "audited_at",      # H
]


def sync_to_sheets(report: AuditReport) -> dict:
    """
    Sync audit results to Google Sheets "Audit" tab.

    Creates or updates an "Audit" tab with profiles that have issues.
    Replaces all data on each run (full refresh).

    Args:
        report: AuditReport with results

    Returns:
        dict with "synced" count
    """
    # Check configuration
    if not settings.google_credentials_json or not settings.google_sheets_id:
        raise ValueError(
            "Google Sheets not configured. Set GOOGLE_CREDENTIALS_JSON and GOOGLE_SHEETS_ID in .env"
        )

    # Load credentials from JSON string
    credentials_json = settings.google_credentials_json.get_secret_value()
    credentials = json.loads(credentials_json)

    # Connect to Google Sheets
    gc = gspread.service_account_from_dict(credentials)
    spreadsheet = gc.open_by_key(settings.google_sheets_id)

    # Get or create Audit tab
    try:
        audit_sheet = spreadsheet.worksheet("Audit")
    except gspread.WorksheetNotFound:
        audit_sheet = spreadsheet.add_worksheet(
            title="Audit",
            rows=500,
            cols=len(AUDIT_HEADERS),
        )

    # Clear existing data and write headers
    audit_sheet.clear()
    audit_sheet.update(values=[AUDIT_HEADERS], range_name="A1:H1")

    # Build summary row
    summary_row = [
        "SUMMARY",
        f"{report.total_profiles} profiles",
        f"{report.profiles_with_issues} with issues",
        f"no_proxy: {report.no_proxy_count}",
        f"rotating: {report.rotating_proxy_count}",
        f"shared: {report.shared_proxy_count}",
        f"no_geo: {report.no_geo_count}",
        datetime.now().strftime("%Y-%m-%d %H:%M"),
    ]
    audit_sheet.update(values=[summary_row], range_name="A2:H2")

    # Prepare data rows for profiles with issues
    rows = []
    for result in report.results:
        if not result.issues:
            continue

        # Format geo info
        geo_parts = []
        if result.proxy_info.geo_country:
            geo_parts.append(result.proxy_info.geo_country)
        if result.proxy_info.geo_state:
            geo_parts.append(result.proxy_info.geo_state)
        if result.proxy_info.geo_city:
            geo_parts.append(result.proxy_info.geo_city)
        geo_str = "/".join(geo_parts) if geo_parts else "N/A"

        rows.append([
            result.username,
            result.owner,
            ", ".join(result.issues),
            result.proxy_info.provider,
            result.proxy_info.session_type,
            result.proxy_info.session_id or "N/A",
            geo_str,
            datetime.now().isoformat(),
        ])

    # Batch write data rows starting at row 3
    if rows:
        audit_sheet.update(values=rows, range_name=f"A3:H{2 + len(rows)}")

    return {"synced": len(rows)}


async def main(sync_to_sheet: bool = False) -> None:
    """Run profile audit.

    Args:
        sync_to_sheet: If True, also sync results to Google Sheets "Audit" tab
    """
    print("Fetching profiles from Dolphin API...")
    profiles = await fetch_profiles()
    print(f"Found {len(profiles)} profiles")

    print("Auditing profiles...")
    results = [audit_profile(p) for p in profiles]

    print("Detecting shared sessions...")
    shared_sessions = detect_shared_sessions(results)

    # Mark profiles in shared sessions with issue
    shared_usernames = set()
    for profiles_list in shared_sessions.values():
        shared_usernames.update(profiles_list)

    for result in results:
        if result.username in shared_usernames and "SHARED_SESSION" not in result.issues:
            result.issues.append("SHARED_SESSION")

    report = generate_report(results, shared_sessions)

    # Print console summary
    print_report(report)

    # Save JSON report
    output_path = Path(__file__).parent / "audit_results.json"
    save_report_json(report, output_path)
    print(f"Details saved to: {output_path}")

    # Optionally sync to Google Sheets
    if sync_to_sheet:
        print("Syncing to Google Sheets 'Audit' tab...")
        try:
            result = sync_to_sheets(report)
            print(f"Synced {result['synced']} profiles with issues to Audit tab")
        except ValueError as e:
            print(f"Warning: Could not sync to sheets - {e}")
        except Exception as e:
            print(f"Warning: Sheets sync failed - {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Audit Dolphin profiles for proxy configuration issues"
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Sync results to Google Sheets 'Audit' tab"
    )
    args = parser.parse_args()

    asyncio.run(main(sync_to_sheet=args.sync))
