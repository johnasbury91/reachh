"""
Google Sheets sync module for Dolphin tracker.
Syncs account data to Google Sheets with batch upsert operations.
"""

import json
from datetime import datetime

import gspread

from config import settings
from models import AccountResult, calculate_account_age, calculate_warmup_status


# Column headers for the Google Sheet (13 columns: A-M)
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
    "checked_at",      # M
]


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
        worksheet.update("A1:M1", [HEADERS])


def _update_summary_row(worksheet: gspread.Worksheet, results: list[AccountResult]) -> None:
    """Update the summary row (row 2) with aggregate stats."""
    # Count statuses
    status_counts: dict[str, int] = {}
    proxy_fail_count = 0
    total_karma = 0
    total_delta = 0

    for result in results:
        status = result.reddit.status
        status_counts[status] = status_counts.get(status, 0) + 1
        total_karma += result.reddit.total_karma or 0
        total_delta += result.karma_change or 0

        if result.proxy_health and result.proxy_health.status != "pass":
            proxy_fail_count += 1

    total = len(results)
    active = status_counts.get("active", 0)
    suspended = status_counts.get("suspended", 0)
    shadowbanned = status_counts.get("shadowbanned", 0)
    not_found = status_counts.get("not_found", 0)

    # Format delta with sign
    delta_str = f"+{total_delta}" if total_delta >= 0 else str(total_delta)

    # Build summary cells matching header columns
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
        datetime.now().strftime("%Y-%m-%d %H:%M"),  # checked_at
    ]

    worksheet.update("A2:M2", [summary_row])


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
                "range": f"A{row_num}:M{row_num}",
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
