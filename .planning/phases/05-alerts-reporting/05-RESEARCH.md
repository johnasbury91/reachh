# Phase 5: Alerts & Reporting - Research

**Researched:** 2026-01-18
**Domain:** Notifications, state change detection, analytics reporting
**Confidence:** HIGH

## Summary

Phase 5 adds alerting when accounts have problems (bans/suspensions, proxy failures) and generates weekly karma performance reports. The existing codebase provides strong foundations: `tracker.py` already tracks status and proxy_health, `karma_history.json` stores daily snapshots, and launchd scheduling is already configured.

The recommended approach uses:
1. **macOS native notifications** via `pync`/`terminal-notifier` for immediate alerts (no external services)
2. **State file pattern** (`last_run_state.json`) to detect changes between runs
3. **Weekly launchd job** that aggregates `karma_history.json` for reporting

**Primary recommendation:** Use local notifications for alerts (zero config, works offline), with optional Slack webhook for team visibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pync | 2.0.1 | macOS notifications | Python wrapper for terminal-notifier, built-in to macOS |
| deepdiff | 8.6+ | State change detection | Mature library for detecting dictionary changes |
| smtplib | stdlib | Email notifications | Python standard library, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| terminal-notifier | 2.0+ | CLI notifications | Required by pync, install via homebrew |
| requests | 2.31+ | Slack webhooks | Already in codebase (httpx also works) |
| statistics | stdlib | Karma velocity | Python stdlib for mean/median calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pync | osascript (native) | osascript is simpler but has fewer features, pync provides better API |
| pync | Telegram bot | External service dependency, requires internet, more setup |
| deepdiff | manual dict comparison | deepdiff handles nested changes cleanly, avoids bugs |
| Slack webhooks | Email | Email requires SMTP config, Slack is simpler for teams |

**Installation:**
```bash
# macOS notification support
brew install terminal-notifier
pip install pync

# State change detection
pip install deepdiff

# Optional: Slack notifications (requests or httpx already in project)
# No additional install needed
```

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
├── tracker.py             # Main tracker (existing)
├── alerts.py              # NEW: Notification dispatcher
├── reporting.py           # NEW: Weekly report generator
├── state.py               # NEW: State tracking/change detection
├── last_run_state.json    # NEW: Previous run state for comparison
├── karma_history.json     # Existing: Historical karma data
└── launchd/
    ├── com.dolphin.tracker.plist        # Existing: Daily at 9 AM
    └── com.dolphin.weekly-report.plist  # NEW: Weekly on Sundays
```

### Pattern 1: State Change Detection
**What:** Compare current run state against previous run to detect new problems
**When to use:** Every tracker run to detect new bans/suspensions/proxy failures
**Example:**
```python
# Source: deepdiff documentation + standard pattern
from deepdiff import DeepDiff
import json
from pathlib import Path

STATE_FILE = Path(__file__).parent / "last_run_state.json"

def load_previous_state() -> dict:
    """Load state from previous run."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"accounts": {}, "proxies": {}}

def save_current_state(state: dict) -> None:
    """Save current state for next comparison."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def detect_new_problems(previous: dict, current: dict) -> dict:
    """Detect accounts that changed from active to suspended/not_found."""
    new_bans = []
    new_proxy_failures = []

    for username, status in current["accounts"].items():
        prev_status = previous.get("accounts", {}).get(username)
        # Account was active but now suspended/not_found
        if prev_status == "active" and status in ("suspended", "not_found"):
            new_bans.append(username)

    for proxy, health in current["proxies"].items():
        prev_health = previous.get("proxies", {}).get(proxy)
        # Proxy was working but now failing
        if prev_health == "pass" and health in ("fail", "blocked"):
            new_proxy_failures.append(proxy)

    return {"new_bans": new_bans, "new_proxy_failures": new_proxy_failures}
```

### Pattern 2: Multi-Channel Notification
**What:** Send alerts to multiple channels (macOS, optional Slack)
**When to use:** When problems are detected that need immediate attention
**Example:**
```python
# Source: pync documentation, Slack webhook docs
import pync
import httpx
import os

def notify_macos(title: str, message: str, sound: bool = True) -> None:
    """Send macOS notification center alert."""
    pync.notify(
        message,
        title=title,
        sound="default" if sound else None,
        group="dolphin-tracker"  # Groups notifications together
    )

def notify_slack(webhook_url: str, title: str, message: str) -> None:
    """Send Slack webhook notification (optional)."""
    if not webhook_url:
        return
    payload = {
        "text": f"*{title}*\n{message}",
        "username": "Dolphin Tracker",
    }
    httpx.post(webhook_url, json=payload, timeout=10)

def send_alert(title: str, message: str) -> None:
    """Send alert to all configured channels."""
    notify_macos(title, message)

    slack_url = os.getenv("SLACK_WEBHOOK_URL")
    if slack_url:
        notify_slack(slack_url, title, message)
```

### Pattern 3: Karma Velocity Calculation
**What:** Calculate karma growth rate (karma per day) from historical data
**When to use:** Weekly reports to identify top/bottom performers
**Example:**
```python
# Source: Standard analytics pattern
from datetime import datetime, timedelta
import json
from pathlib import Path

def calculate_karma_velocity(history: dict, days: int = 7) -> dict[str, float]:
    """
    Calculate karma/day rate for each account over specified period.

    Args:
        history: karma_history.json data
        days: Number of days to analyze

    Returns:
        Dict of username -> karma_per_day rate
    """
    velocities = {}
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    for username, snapshots in history.items():
        # Get snapshots within date range
        dates = sorted([d for d in snapshots.keys() if d >= cutoff])

        if len(dates) < 2:
            velocities[username] = 0.0
            continue

        first_date = dates[0]
        last_date = dates[-1]

        first_karma = snapshots[first_date]["total_karma"]
        last_karma = snapshots[last_date]["total_karma"]

        # Calculate days between
        d1 = datetime.strptime(first_date, "%Y-%m-%d")
        d2 = datetime.strptime(last_date, "%Y-%m-%d")
        days_elapsed = (d2 - d1).days or 1  # Avoid division by zero

        velocities[username] = (last_karma - first_karma) / days_elapsed

    return velocities
```

### Anti-Patterns to Avoid
- **Polling external services for alerts:** Use local state comparison, not API calls
- **Alerting on every run for known issues:** Track "acknowledged" state to avoid alert fatigue
- **Storing sensitive webhook URLs in code:** Use environment variables via Settings
- **Blocking main tracker on notification failures:** Use try/except, log and continue

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| macOS notifications | `os.system("osascript...")` | pync library | Handles escaping, provides callbacks, groups notifications |
| Dict diff detection | Manual key comparison loops | deepdiff library | Handles nested dicts, edge cases, clear output format |
| Weekly scheduling | Python sleep loops | launchd plist | System-level, survives reboots, handles sleep/wake |
| Date calculations | Manual string parsing | datetime module | Handles timezones, DST, leap years correctly |

**Key insight:** Notification and scheduling are OS-level concerns - leverage system tools (terminal-notifier, launchd) rather than Python-level solutions that may fail when the machine sleeps.

## Common Pitfalls

### Pitfall 1: Alert Fatigue from Repeated Notifications
**What goes wrong:** Same ban/failure generates alert on every run
**Why it happens:** No tracking of what's already been alerted
**How to avoid:** Store "alerted_at" timestamp in state file; only alert on NEW problems
**Warning signs:** Getting multiple alerts for the same suspended account

### Pitfall 2: State File Corruption
**What goes wrong:** JSON write interrupted, file unreadable on next run
**Why it happens:** Process killed during write, disk full, etc.
**How to avoid:** Write to temp file first, then atomic rename
**Warning signs:** "JSONDecodeError" in logs after crash/reboot
```python
# Safe state file write pattern
import tempfile
import os

def safe_save_state(state: dict, filepath: Path) -> None:
    """Atomic write to prevent corruption."""
    temp_fd, temp_path = tempfile.mkstemp(dir=filepath.parent)
    try:
        with os.fdopen(temp_fd, 'w') as f:
            json.dump(state, f, indent=2)
        os.rename(temp_path, filepath)  # Atomic on POSIX
    except:
        os.unlink(temp_path)
        raise
```

### Pitfall 3: Missing Historical Data for Velocity
**What goes wrong:** Karma velocity shows 0 or NaN for accounts
**Why it happens:** Account only has one data point (just added)
**How to avoid:** Require minimum 2 data points; handle gracefully in reports
**Warning signs:** New accounts showing incorrect velocity rankings

### Pitfall 4: Notification Service Failures Breaking Tracker
**What goes wrong:** Tracker crashes because Slack webhook is down
**Why it happens:** No error handling around notification calls
**How to avoid:** Wrap ALL notification calls in try/except, log and continue
**Warning signs:** Tracker failing when internet is down

### Pitfall 5: launchd Job Not Running
**What goes wrong:** Weekly report never generates
**Why it happens:** plist not loaded, wrong Python path, permissions
**How to avoid:** Test plist manually with `launchctl start`; check stderr log
**Warning signs:** No weekly report appearing, empty stderr log

## Code Examples

Verified patterns from official sources:

### macOS Notification with pync
```python
# Source: https://pypi.org/project/pync/
import pync

# Basic notification
pync.notify("3 new account bans detected", title="Dolphin Tracker Alert")

# With sound and grouping
pync.notify(
    "Proxy 192.168.1.1 is failing",
    title="Proxy Alert",
    sound="default",
    group="dolphin-alerts"
)

# Clear previous notifications in group
pync.remove_notifications("dolphin-alerts")
```

### Slack Webhook Notification
```python
# Source: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
import httpx

def send_slack_alert(webhook_url: str, accounts: list[str]) -> None:
    """Send ban alert to Slack channel."""
    message = {
        "text": f"*Account Alert*\nNew bans detected: {', '.join(accounts)}",
        "username": "Dolphin Tracker",
        "icon_emoji": ":warning:"
    }

    try:
        response = httpx.post(webhook_url, json=message, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as e:
        # Log but don't crash - alerts are best-effort
        print(f"Slack notification failed: {e}")
```

### Weekly Report Generation
```python
# Source: Standard Python analytics pattern
from datetime import datetime, timedelta

def generate_weekly_summary(history: dict) -> str:
    """Generate markdown-formatted weekly karma summary."""
    velocities = calculate_karma_velocity(history, days=7)

    # Sort by velocity
    sorted_accounts = sorted(
        velocities.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # Top 5 performers
    top_5 = sorted_accounts[:5]
    bottom_5 = sorted_accounts[-5:]

    report = f"""# Weekly Karma Summary
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Top Performers (Karma/Day)
| Account | Karma/Day |
|---------|-----------|
"""
    for username, velocity in top_5:
        report += f"| {username} | {velocity:+.1f} |\n"

    report += """
## Needs Attention (Lowest Karma/Day)
| Account | Karma/Day |
|---------|-----------|
"""
    for username, velocity in bottom_5:
        report += f"| {username} | {velocity:+.1f} |\n"

    return report
```

### launchd Weekly Schedule Plist
```xml
<!-- Source: Apple launchd documentation -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dolphin.weekly-report</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Library/Frameworks/Python.framework/Versions/3.13/bin/python3</string>
        <string>/Users/johnasbury/Reachh/dolphin/reporting.py</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/johnasbury/Reachh/dolphin</string>

    <!-- Run every Sunday at 10 AM -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>10</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/johnasbury/Reachh/dolphin/logs/weekly-report.stdout</string>
    <key>StandardErrorPath</key>
    <string>/Users/johnasbury/Reachh/dolphin/logs/weekly-report.stderr</string>
</dict>
</plist>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email for all alerts | Push notifications (macOS/Slack) | 2020+ | Faster response, less inbox clutter |
| cron on macOS | launchd | macOS 10.4 | Handles sleep/wake, more reliable |
| Manual dict comparison | deepdiff library | N/A | Cleaner code, handles edge cases |
| osascript for notifications | terminal-notifier/pync | 2015+ | Better features, callbacks, grouping |

**Deprecated/outdated:**
- **cron on macOS:** Still works but deprecated; launchd is recommended
- **NSUserNotificationCenter:** Deprecated in favor of UNUserNotificationCenter, but terminal-notifier abstracts this

## Open Questions

Things that couldn't be fully resolved:

1. **Notification persistence when Mac is locked**
   - What we know: terminal-notifier supports `-ignoreDnD` flag
   - What's unclear: Behavior when Mac is locked vs asleep
   - Recommendation: Test on actual hardware; may need to skip notifications during certain hours

2. **Slack webhook rate limits**
   - What we know: Slack has rate limits on incoming webhooks
   - What's unclear: Exact limits for free/paid plans
   - Recommendation: Batch multiple alerts into single message; add rate limiting if needed

3. **Email notification viability**
   - What we know: Gmail requires App Passwords (2FA), other providers vary
   - What's unclear: User's preferred email setup
   - Recommendation: Make email optional; macOS notifications work without config

## Sources

### Primary (HIGH confidence)
- [pync PyPI](https://pypi.org/project/pync/) - Installation and API
- [terminal-notifier GitHub](https://github.com/julienXX/terminal-notifier) - CLI options
- [DeepDiff documentation](https://zepworks.com/deepdiff/current/diff.html) - Dictionary comparison
- [Python smtplib docs](https://docs.python.org/3/library/smtplib.html) - Email sending
- [Apple launchd documentation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html) - Scheduling

### Secondary (MEDIUM confidence)
- [Slack Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) - Webhook setup
- [launchd.info tutorial](https://www.launchd.info/) - plist examples
- [alvinalexander.com launchd examples](https://alvinalexander.com/mac-os-x/launchd-plist-examples-startinterval-startcalendarinterval/) - Calendar intervals

### Tertiary (LOW confidence)
- WebSearch results for Telegram bots - considered but not recommended (external dependency)
- Community blog posts on report automation - patterns verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using well-documented, stable libraries (pync, deepdiff, stdlib)
- Architecture: HIGH - Patterns match existing codebase (launchd, JSON state files)
- Pitfalls: HIGH - Based on documented issues and standard engineering practices

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable domain, unlikely to change)
