#!/usr/bin/env python3
"""Weekly karma performance report generator."""

import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

from config import setup_logging
from alerts import send_alert

HISTORY_FILE = Path(__file__).parent / "karma_history.json"
logger = logging.getLogger("tracker")


def load_karma_history() -> dict:
    """
    Load karma history from JSON file.

    Returns:
        dict: Karma history by username, or empty dict if file missing.
    """
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load karma history: {e}")
    return {}


def calculate_karma_velocity(history: dict, days: int = 7) -> dict[str, float]:
    """
    Calculate karma velocity (karma gained per day) for each account.

    Args:
        history: Karma history dict {username: {date: {total_karma: int, ...}}}
        days: Number of days to calculate velocity over.

    Returns:
        dict: Username to karma/day mapping.
    """
    velocities: dict[str, float] = {}
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    for username, snapshots in history.items():
        # Filter to snapshots within the period
        recent_snapshots = {
            date: data for date, data in snapshots.items()
            if date >= cutoff_date
        }

        if len(recent_snapshots) < 2:
            # Need at least 2 data points to calculate velocity
            velocities[username] = 0.0
            continue

        # Sort by date and get first/last
        sorted_dates = sorted(recent_snapshots.keys())
        first_date = sorted_dates[0]
        last_date = sorted_dates[-1]

        first_karma = recent_snapshots[first_date].get("total_karma", 0)
        last_karma = recent_snapshots[last_date].get("total_karma", 0)

        # Calculate days between snapshots
        first_dt = datetime.strptime(first_date, "%Y-%m-%d")
        last_dt = datetime.strptime(last_date, "%Y-%m-%d")
        days_between = (last_dt - first_dt).days

        if days_between == 0:
            velocities[username] = 0.0
        else:
            velocities[username] = (last_karma - first_karma) / days_between

    return velocities


def generate_weekly_report(history: dict) -> str:
    """
    Generate formatted weekly karma report.

    Args:
        history: Karma history dict.

    Returns:
        str: Formatted report string.
    """
    velocities = calculate_karma_velocity(history, days=7)

    if not velocities:
        return "Weekly Karma Report: No data available"

    # Sort by velocity (descending)
    sorted_accounts = sorted(velocities.items(), key=lambda x: x[1], reverse=True)

    # Get top 5 and bottom 5
    top_5 = sorted_accounts[:5]
    bottom_5 = sorted_accounts[-5:][::-1]  # Reverse to show lowest first

    # Build report
    today = datetime.now().strftime("%Y-%m-%d")
    lines = [
        f"Weekly Karma Report ({today})",
        "",
        "Top 5 Performers:",
    ]

    for i, (username, velocity) in enumerate(top_5, 1):
        sign = "+" if velocity >= 0 else ""
        lines.append(f"  {i}. {username}: {sign}{velocity:.1f} karma/day")

    lines.append("")
    lines.append("Needs Attention (lowest growth):")

    for i, (username, velocity) in enumerate(bottom_5, 1):
        sign = "+" if velocity >= 0 else ""
        lines.append(f"  {i}. {username}: {sign}{velocity:.1f} karma/day")

    lines.append("")
    lines.append(f"Total accounts: {len(velocities)}")

    return "\n".join(lines)


def main() -> int:
    """
    Main entry point for weekly report generation.

    Returns:
        int: Exit code (0=success, 1=failure).
    """
    setup_logging()

    logger.info("=" * 60)
    logger.info("Starting weekly karma report generation")

    try:
        # Load history
        history = load_karma_history()

        if not history:
            logger.warning("No karma history found - skipping report")
            return 0

        # Check if we have enough data
        total_snapshots = sum(len(snapshots) for snapshots in history.values())
        if total_snapshots < 2:
            logger.warning("Insufficient history data (< 2 snapshots) - skipping report")
            return 0

        # Generate report
        report = generate_weekly_report(history)

        # Log full report
        logger.info("Weekly Karma Report:")
        for line in report.split("\n"):
            logger.info(f"  {line}")

        # Get velocities for notification summary
        velocities = calculate_karma_velocity(history, days=7)
        if velocities:
            sorted_velocities = sorted(velocities.items(), key=lambda x: x[1], reverse=True)
            top_user, top_vel = sorted_velocities[0]
            bottom_user, bottom_vel = sorted_velocities[-1]

            # Format condensed notification
            top_sign = "+" if top_vel >= 0 else ""
            bottom_sign = "+" if bottom_vel >= 0 else ""
            notification_msg = (
                f"Top: {top_user} ({top_sign}{top_vel:.1f}/day), "
                f"Bottom: {bottom_user} ({bottom_sign}{bottom_vel:.1f}/day)"
            )

            send_alert("Weekly Karma Report", notification_msg)

        logger.info("Weekly report completed successfully")
        return 0

    except Exception as e:
        logger.exception(f"Weekly report failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
