"""
Google Sheets sync module for Dolphin tracker.
Syncs account data to Google Sheets with batch upsert operations.
"""

import json
from datetime import datetime

import gspread

from config import settings
from models import AccountResult, calculate_account_age, calculate_warmup_status
from warmup import get_warmup_limits, check_warmup_thresholds


# Column headers for the Google Sheet (17 columns: A-Q)
HEADERS = [
    "profile_id",      # A
    "username",        # B
    "status",          # C
    "total_karma",     # D
    "comment_karma",   # E
    "link_karma",      # F
    "account_age",     # G
    "warmup_status",   # H
    "owner",           # I
    "proxy",           # J
    "proxy_health",    # K
    "karma_delta",     # L
    "comments_today",  # M: Daily comment count
    "posts_today",     # N: Daily post count
    "warmup_tier",     # O: new/warming/ready/established
    "limit_status",    # P: OK/WARNING/EXCEEDED
    "checked_at",      # Q
]

# Archive tab has main headers + archive metadata (15 columns: A-O)
ARCHIVE_HEADERS = HEADERS + ["archive_reason", "archived_at"]


def _to_row(result: AccountResult) -> list:
    """Convert AccountResult to a row list matching HEADERS order."""
    # Calculate account age from Reddit created_utc
    account_age = calculate_account_age(result.reddit.created_utc)

    # Calculate warmup status from age and karma
    warmup_status = calculate_warmup_status(
        result.reddit.created_utc, result.reddit.total_karma
    )

    # Format karma_delta as +N or -N for readability
    if result.karma_change > 0:
        karma_delta = f"+{result.karma_change}"
    elif result.karma_change < 0:
        karma_delta = str(result.karma_change)  # Already has minus sign
    else:
        karma_delta = "0"

    # Get proxy health status
    proxy_health_status = "N/A"
    if result.proxy_health:
        proxy_health_status = result.proxy_health.status

    # Get activity counts (default to 0 if None)
    comments_today = 0
    posts_today = 0
    if result.activity:
        comments_today = result.activity.comments_today
        posts_today = result.activity.posts_today

    # Get warmup tier and calculate limit status
    limits_info = get_warmup_limits(result.reddit.created_utc)
    warmup_tier = limits_info["tier"]

    # Determine limit_status based on threshold checks
    limit_status = "N/A"
    if result.activity and limits_info["limits"]:
        warnings = check_warmup_thresholds(result.activity, limits_info["limits"])
        if any("EXCEEDED" in w for w in warnings):
            limit_status = "EXCEEDED"
        elif any("WARNING" in w for w in warnings):
            limit_status = "WARNING"
        else:
            limit_status = "OK"
    elif result.reddit.status == "active":
        limit_status = "OK"  # Active but no activity data yet

    return [
        result.profile.id,
        result.profile.name,
        result.reddit.status,
        result.reddit.total_karma,
        result.reddit.comment_karma,
        result.reddit.link_karma,
        account_age,
        warmup_status,
        result.profile.owner,
        result.profile.proxy or "None",
        proxy_health_status,
        karma_delta,
        comments_today,
        posts_today,
        warmup_tier,
        limit_status,
        result.checked_at or datetime.now().isoformat(),
    ]


def _ensure_headers(worksheet: gspread.Worksheet) -> None:
    """Ensure header row exists in the worksheet."""
    # Check if first row is empty or doesn't have our headers
    try:
        first_row = worksheet.row_values(1)
    except Exception:
        first_row = []

    if not first_row or first_row != HEADERS:
        # Clear first row and write headers
        worksheet.update("A1:Q1", [HEADERS])


def _update_summary_row(worksheet: gspread.Worksheet, results: list[AccountResult]) -> None:
    """Update the summary row (row 2) with aggregate stats."""
    # Count statuses
    status_counts: dict[str, int] = {}
    proxy_fail_count = 0
    total_karma = 0
    total_delta = 0

    # Count warmup limit statuses
    limit_status_counts: dict[str, int] = {"OK": 0, "WARNING": 0, "EXCEEDED": 0}
    total_comments = 0
    total_posts = 0

    for result in results:
        status = result.reddit.status
        status_counts[status] = status_counts.get(status, 0) + 1
        total_karma += result.reddit.total_karma or 0
        total_delta += result.karma_change or 0

        if result.proxy_health and result.proxy_health.status != "pass":
            proxy_fail_count += 1

        # Count activity and limit status
        if result.activity:
            total_comments += result.activity.comments_today
            total_posts += result.activity.posts_today

            # Calculate limit status for this result
            limits_info = get_warmup_limits(result.reddit.created_utc)
            if limits_info["limits"]:
                warnings = check_warmup_thresholds(result.activity, limits_info["limits"])
                if any("EXCEEDED" in w for w in warnings):
                    limit_status_counts["EXCEEDED"] += 1
                elif any("WARNING" in w for w in warnings):
                    limit_status_counts["WARNING"] += 1
                else:
                    limit_status_counts["OK"] += 1

    total = len(results)
    active = status_counts.get("active", 0)
    suspended = status_counts.get("suspended", 0)
    shadowbanned = status_counts.get("shadowbanned", 0)
    not_found = status_counts.get("not_found", 0)

    # Format delta with sign
    delta_str = f"+{total_delta}" if total_delta >= 0 else str(total_delta)

    # Format limit status summary
    limit_summary = f"{limit_status_counts['OK']} OK"
    if limit_status_counts["WARNING"] > 0:
        limit_summary += f" / {limit_status_counts['WARNING']} warn"
    if limit_status_counts["EXCEEDED"] > 0:
        limit_summary += f" / {limit_status_counts['EXCEEDED']} over"

    # Build summary cells matching header columns (17 columns: A-Q)
    summary_row = [
        "SUMMARY",  # profile_id column
        f"{total} accounts",  # username column
        f"{active} active / {suspended} suspended / {shadowbanned} shadow / {not_found} missing",  # status
        total_karma,  # total_karma
        "",  # comment_karma
        "",  # link_karma
        "",  # account_age
        "",  # warmup_status
        "",  # owner
        f"{proxy_fail_count} failing" if proxy_fail_count else "All OK",  # proxy
        "",  # proxy_health
        delta_str,  # karma_delta
        total_comments,  # comments_today
        total_posts,  # posts_today
        "",  # warmup_tier
        limit_summary,  # limit_status
        datetime.now().strftime("%Y-%m-%d %H:%M"),  # checked_at
    ]

    worksheet.update("A2:Q2", [summary_row])


def sync_to_sheet(results: list[AccountResult]) -> dict:
    """
    Sync account results to Google Sheets.

    Uses batch operations to minimize API calls:
    - Single read to get existing data
    - Single batch_update for updates
    - Single append_rows for inserts

    Args:
        results: List of AccountResult from tracker

    Returns:
        dict with "updated" and "inserted" counts

    Raises:
        ValueError: If Google Sheets credentials not configured
        gspread.exceptions.GSpreadException: On API errors
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
    worksheet = spreadsheet.sheet1

    # Ensure header row exists
    _ensure_headers(worksheet)

    # Read existing data (single API call)
    # Row 1 = headers, Row 2 = summary, Row 3+ = data
    all_values = worksheet.get_all_values()

    # Build existing_ids from row 3 onwards (index 2+, skipping header and summary)
    existing_ids: dict[str, int] = {}
    for idx, row in enumerate(all_values[2:], start=3):  # Start at row 3
        if row and row[0] and row[0] != "SUMMARY":  # Has profile_id and not summary
            existing_ids[str(row[0])] = idx

    # Partition into updates vs inserts
    updates = []
    inserts = []

    for result in results:
        row_data = _to_row(result)
        profile_id = str(result.profile.id)

        if profile_id in existing_ids:
            # Update existing row
            row_num = existing_ids[profile_id]
            updates.append({
                "range": f"A{row_num}:Q{row_num}",
                "values": [row_data],
            })
        else:
            # Insert as new row
            inserts.append(row_data)

    # Batch update existing rows (single API call)
    if updates:
        worksheet.batch_update(updates)

    # Batch append new rows (single API call)
    if inserts:
        worksheet.append_rows(inserts)

    # Update summary row with aggregate stats
    _update_summary_row(worksheet, results)

    return {
        "updated": len(updates),
        "inserted": len(inserts),
    }


def _get_or_create_archive_sheet(spreadsheet: gspread.Spreadsheet) -> gspread.Worksheet:
    """Get or create the Archive worksheet."""
    try:
        archive_sheet = spreadsheet.worksheet("Archive")
    except gspread.WorksheetNotFound:
        # Create with enough rows/cols for archived data
        archive_sheet = spreadsheet.add_worksheet(
            title="Archive",
            rows=1000,
            cols=len(ARCHIVE_HEADERS),
        )
        # Write headers (A1 to O1 for 15 columns)
        archive_sheet.update(f"A1:{chr(64 + len(ARCHIVE_HEADERS))}1", [ARCHIVE_HEADERS])
    return archive_sheet


def archive_stale_profiles(dolphin_profile_ids: set[str]) -> dict:
    """
    Archive profiles that exist in sheet but not in Dolphin.

    Profiles deleted from Dolphin are moved to the Archive tab with
    archive_reason and archived_at metadata.

    Args:
        dolphin_profile_ids: Set of profile IDs currently in Dolphin

    Returns:
        dict with "archived" count
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
    worksheet = spreadsheet.sheet1

    # Read all values from main sheet (row 3 onwards = data, skip header and summary)
    all_values = worksheet.get_all_values()

    # Find stale rows (in sheet but not in Dolphin)
    stale_rows = []
    stale_row_indices = []

    for idx, row in enumerate(all_values[2:], start=3):  # Start at row 3 (index 2)
        if not row or not row[0]:
            continue
        profile_id = str(row[0])
        if profile_id == "SUMMARY":
            continue
        if profile_id not in dolphin_profile_ids:
            # This profile was deleted from Dolphin
            stale_rows.append(row)
            stale_row_indices.append(idx)

    if not stale_rows:
        return {"archived": 0}

    # Get or create Archive sheet
    archive_sheet = _get_or_create_archive_sheet(spreadsheet)

    # Prepare archive rows with metadata
    archived_at = datetime.now().isoformat()
    archive_rows = []
    for row in stale_rows:
        # Extend row with archive metadata
        archive_row = row + ["deleted_from_dolphin", archived_at]
        archive_rows.append(archive_row)

    # Batch append to Archive sheet (single API call)
    archive_sheet.append_rows(archive_rows)

    # Delete stale rows from main sheet (work backwards to preserve indices)
    for row_idx in sorted(stale_row_indices, reverse=True):
        worksheet.delete_rows(row_idx)

    return {"archived": len(stale_rows)}


def archive_dead_accounts(usernames_to_archive: list[str]) -> dict:
    """
    Archive accounts that have been not_found for threshold days.

    Moves accounts from main sheet to Archive tab with archive_reason
    "dead_account_7d" and archived_at timestamp.

    Args:
        usernames_to_archive: List of Reddit usernames to archive

    Returns:
        dict with "archived" count
    """
    if not usernames_to_archive:
        return {"archived": 0}

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
    worksheet = spreadsheet.sheet1

    # Read all values from main sheet (row 3 onwards = data, skip header and summary)
    all_values = worksheet.get_all_values()

    # Find rows where username (column B) is in usernames_to_archive
    usernames_set = set(usernames_to_archive)
    dead_rows = []
    dead_row_indices = []

    for idx, row in enumerate(all_values[2:], start=3):  # Start at row 3 (index 2)
        if not row or len(row) < 2:
            continue
        username = row[1]  # Column B = username
        if username in usernames_set:
            dead_rows.append(row)
            dead_row_indices.append(idx)

    if not dead_rows:
        return {"archived": 0}

    # Get or create Archive sheet
    archive_sheet = _get_or_create_archive_sheet(spreadsheet)

    # Prepare archive rows with metadata
    archived_at = datetime.now().isoformat()
    archive_rows = []
    for row in dead_rows:
        # Extend row with archive metadata
        archive_row = row + ["dead_account_7d", archived_at]
        archive_rows.append(archive_row)

    # Batch append to Archive sheet (single API call)
    archive_sheet.append_rows(archive_rows)

    # Delete dead rows from main sheet (work backwards to preserve indices)
    for row_idx in sorted(dead_row_indices, reverse=True):
        worksheet.delete_rows(row_idx)

    return {"archived": len(dead_rows)}
