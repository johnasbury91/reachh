#!/usr/bin/env python3
"""
Alert and notification system for Dolphin Tracker.

Provides multi-channel notifications (macOS, Slack) for tracking events.
"""

import logging
from typing import Optional

try:
    import pync
    PYNC_AVAILABLE = True
except ImportError:
    PYNC_AVAILABLE = False

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

from config import settings

logger = logging.getLogger("tracker")


def notify_macos(title: str, message: str) -> None:
    """
    Send macOS notification via terminal-notifier.

    Requires: brew install terminal-notifier
    Best-effort: logs failures but doesn't raise.
    """
    if not PYNC_AVAILABLE:
        logger.debug("pync not installed, skipping macOS notification")
        return

    try:
        pync.notify(
            message,
            title=title,
            group="dolphin-tracker",
            sound="default",
        )
        logger.debug(f"macOS notification sent: {title}")
    except Exception as e:
        logger.warning(f"macOS notification failed: {e}")


def notify_slack(title: str, message: str) -> None:
    """
    Send Slack notification via webhook.

    If SLACK_WEBHOOK_URL not configured, returns silently.
    Best-effort: logs failures but doesn't raise.
    """
    webhook_url = getattr(settings, 'slack_webhook_url', None)
    if not webhook_url:
        logger.debug("Slack webhook not configured, skipping")
        return

    if not HTTPX_AVAILABLE:
        logger.debug("httpx not installed, skipping Slack notification")
        return

    try:
        payload = {
            "text": f"*{title}*\n{message}",
            "username": "Dolphin Tracker",
        }
        with httpx.Client(timeout=10) as client:
            response = client.post(webhook_url, json=payload)
            response.raise_for_status()
        logger.debug(f"Slack notification sent: {title}")
    except Exception as e:
        logger.warning(f"Slack notification failed: {e}")


def send_alert(title: str, message: str) -> None:
    """
    Send alert through all configured channels (macOS, Slack).

    Best-effort delivery: failures are logged but don't raise exceptions.
    """
    logger.info(f"Sending alert: {title}")
    notify_macos(title, message)
    notify_slack(title, message)


def notify_bans(usernames: list[str]) -> None:
    """
    Notify about newly banned/suspended accounts.

    Args:
        usernames: List of usernames that were banned.
    """
    if not usernames:
        return

    count = len(usernames)
    user_list = ", ".join(usernames[:5])
    if count > 5:
        user_list += f" (+{count - 5} more)"

    send_alert(
        title="Account Alert",
        message=f"New bans ({count}): {user_list}",
    )


def notify_proxy_failures(proxies: list[str]) -> None:
    """
    Notify about proxy failures.

    Args:
        proxies: List of proxy URLs that are failing.
    """
    if not proxies:
        return

    count = len(proxies)
    proxy_list = ", ".join(proxies[:3])
    if count > 3:
        proxy_list += f" (+{count - 3} more)"

    send_alert(
        title="Proxy Alert",
        message=f"Proxies failing ({count}): {proxy_list}",
    )
