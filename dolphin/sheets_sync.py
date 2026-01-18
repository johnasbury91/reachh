"""
Google Sheets sync module for Dolphin tracker.
Syncs account data to Google Sheets with batch upsert operations.
"""

import json
from datetime import datetime

import gspread

from config import settings
from models import AccountResult, calculate_account_age


# Column headers for the Google Sheet (11 columns: A-K)
HEADERS = [
    "profile_id",
    "username",
    "status",
    "total_karma",
    "comment_karma",
    "link_karma",
    "account_age",
    "owner",
    "proxy",
    "karma_delta",
    "checked_at",
]


def _to_row(result: AccountResult) -> list:
    """Convert AccountResult to a row list matching HEADERS order."""
    # Calculate account age from Reddit created_utc
    account_age = calculate_account_age(result.reddit.created_utc)

    # Format karma_delta as +N or -N for readability
    if result.karma_change > 0:
        karma_delta = f"+{result.karma_change}"
    elif result.karma_change < 0:
        karma_delta = str(result.karma_change)  # Already has minus sign
    else:
        karma_delta = "0"

    return [
        result.profile.id,
        result.profile.name,
        result.reddit.status,
        result.reddit.total_karma,
        result.reddit.comment_karma,
        result.reddit.link_karma,
        account_age,
        result.profile.owner,
        result.profile.proxy or "None",
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
        worksheet.update("A1:K1", [HEADERS])


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
    existing = worksheet.get_all_records(default_blank="")
    existing_ids = {str(row["profile_id"]): idx + 2 for idx, row in enumerate(existing)}
    # idx + 2 because: row 1 is headers, enumerate starts at 0

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
                "range": f"A{row_num}:K{row_num}",
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

    return {
        "updated": len(updates),
        "inserted": len(inserts),
    }
