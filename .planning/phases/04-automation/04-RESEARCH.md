# Phase 4: Automation - Research

**Researched:** 2026-01-18
**Domain:** macOS scheduled jobs, Python logging, error handling, launchd
**Confidence:** HIGH

## Summary

This phase addresses automating the dolphin tracker script to run on a daily schedule without manual intervention. The primary challenge is configuring macOS job scheduling (launchd), ensuring robust logging for unattended operation, and handling failures gracefully so they are logged rather than silently ignored.

The existing codebase uses `asyncio.run()` with an async `run_tracker()` function, outputs to stdout with timestamps, and already handles Google Sheets sync failures gracefully. The recommended approach uses launchd (Apple's native job scheduler) with a plist file in `~/Library/LaunchAgents/`, adds file-based logging with rotation, and wraps the main execution in proper error handling with exit codes.

**Primary recommendation:** Use launchd with `StartCalendarInterval` for daily scheduling (handles sleep/wake), add `TimedRotatingFileHandler` for daily log rotation with 30-day retention, and create a wrapper that returns proper exit codes on failure.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| launchd (macOS native) | N/A | Job scheduling | Apple's official scheduler, handles sleep/wake, preferred over cron |
| logging (stdlib) | N/A | Log management | Built-in, no dependency, supports rotation |
| logging.handlers (stdlib) | N/A | Log rotation | TimedRotatingFileHandler for daily rotation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| concurrent-log-handler | 0.9.26+ | Multi-process safe logging | Only if multiple processes write same log |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| launchd | cron | Cron still works on macOS but doesn't handle sleep/wake - job skipped if Mac asleep |
| launchd | schedule library | Requires Python process running constantly; launchd is native |
| TimedRotatingFileHandler | logrotate | External tool, more complex setup, overkill for single script |

**Installation:**
No additional Python packages required - uses stdlib logging.

## Architecture Patterns

### Recommended Project Structure
```
dolphin/
  tracker.py          # Main script with logging + error handling
  config.py           # Settings including log configuration
  logs/               # Log files directory (gitignored)
    tracker.log       # Current log
    tracker.log.YYYY-MM-DD  # Rotated logs
```

### Pattern 1: launchd Agent with Virtual Environment Python
**What:** Use the venv's Python interpreter directly in the plist
**When to use:** Any scheduled Python script with dependencies

```xml
<!-- ~/Library/LaunchAgents/com.dolphin.tracker.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dolphin.tracker</string>

    <key>ProgramArguments</key>
    <array>
        <string>/path/to/project/venv/bin/python</string>
        <string>/path/to/project/dolphin/tracker.py</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/path/to/project/dolphin</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/path/to/project/dolphin/logs/launchd.stdout</string>
    <key>StandardErrorPath</key>
    <string>/path/to/project/dolphin/logs/launchd.stderr</string>
</dict>
</plist>
```

Source: [Apple Developer - Scheduling Timed Jobs](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html)

### Pattern 2: TimedRotatingFileHandler for Daily Logs
**What:** Automatic log rotation at midnight with configurable retention
**When to use:** Any long-running or scheduled script

```python
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

def setup_logging(log_dir: Path) -> logging.Logger:
    """Configure logging with daily rotation and 30-day retention."""
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "tracker.log"

    # Create handler with daily rotation at midnight
    handler = TimedRotatingFileHandler(
        filename=log_file,
        when="midnight",
        interval=1,
        backupCount=30,  # Keep 30 days
        encoding="utf-8",
    )
    handler.suffix = "%Y-%m-%d"  # Rotated files: tracker.log.2026-01-18

    # Format with timestamp
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    # Configure root logger
    logger = logging.getLogger("tracker")
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)

    # Also log to stderr for launchd capture
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    return logger
```

Source: [Python logging.handlers Documentation](https://docs.python.org/3/library/logging.handlers.html)

### Pattern 3: Main Entry Point with Exit Codes
**What:** Wrap async main in try/except, return proper exit codes
**When to use:** Any scheduled script that needs to report success/failure

```python
#!/usr/bin/env python3
import asyncio
import sys
import logging

logger = logging.getLogger("tracker")

async def run_tracker() -> int:
    """Main tracking function. Returns 0 on success, 1 on failure."""
    try:
        # ... existing tracking logic ...
        logger.info("Tracking completed successfully")
        return 0
    except Exception as e:
        logger.exception(f"Tracking failed: {e}")
        return 1

def main() -> int:
    """Entry point with logging setup and error handling."""
    setup_logging(Path(__file__).parent / "logs")
    logger.info("=" * 50)
    logger.info("Starting scheduled tracker run")

    try:
        return asyncio.run(run_tracker())
    except KeyboardInterrupt:
        logger.warning("Interrupted by user")
        return 130  # Standard exit code for SIGINT
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

Source: [Controlling Python Exit Codes](https://www.henryleach.com/2025/02/controlling-python-exit-codes-and-shell-scripts/)

### Pattern 4: StartCalendarInterval for Daily Execution
**What:** Run job at specific time of day, with sleep/wake handling
**When to use:** Daily scheduled tasks

```xml
<!-- Run every day at 9:00 AM -->
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
</dict>
```

**Critical behavior:** If the Mac is asleep at 9:00 AM, the job runs when it wakes up. This is unique to `StartCalendarInterval` - other launchd keys skip the job entirely.

Source: [launchd.info Tutorial](https://www.launchd.info/)

### Anti-Patterns to Avoid
- **Using cron on macOS:** Jobs skipped when Mac is asleep. launchd with `StartCalendarInterval` runs on wake.
- **Activating venv in plist:** Don't try to source activate scripts. Use venv's Python directly.
- **Relative paths in plist:** launchd has no PATH context. Use absolute paths for everything.
- **Silent failures:** Always log exceptions and return non-zero exit codes on failure.
- **No log rotation:** Logs grow unbounded. Use `TimedRotatingFileHandler` or `RotatingFileHandler`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling | Python-based scheduler loop | launchd plist | Native, handles sleep/wake, no daemon needed |
| Log rotation | Manual file management | TimedRotatingFileHandler | Handles date suffixes, cleanup, atomic rotation |
| venv activation | Shell wrapper script | Direct venv Python path | Simpler, more reliable, no activation needed |
| Log file locking | Custom flock implementation | concurrent-log-handler | Only if multi-process (we don't need it) |

**Key insight:** launchd is macOS's native job scheduler. Fighting it to use cron or Python-based schedulers adds complexity without benefit. The venv's Python binary works directly - no activation script needed.

## Common Pitfalls

### Pitfall 1: Using cron Instead of launchd
**What goes wrong:** Scheduled job doesn't run if Mac was asleep at scheduled time
**Why it happens:** cron only checks time when awake; doesn't have "catch up" logic
**How to avoid:** Use launchd with `StartCalendarInterval` key - it runs on wake if job was missed
**Warning signs:** Gaps in log timestamps matching sleep periods

### Pitfall 2: Relative Paths in launchd Plist
**What goes wrong:** Job fails with "file not found" or wrong working directory
**Why it happens:** launchd runs with minimal environment, no PATH, no shell expansion
**How to avoid:** Use absolute paths for Python interpreter, script, and all file references
**Warning signs:** `StandardErrorPath` shows path-related errors

### Pitfall 3: Trying to Source venv/bin/activate
**What goes wrong:** Complex shell wrapper fails, environment not set up correctly
**Why it happens:** Developer assumes venv needs "activation" like interactive use
**How to avoid:** Run the venv's Python directly: `/path/to/venv/bin/python script.py`
**Warning signs:** Wrapper scripts, bash -c in plist, sourcing activate

### Pitfall 4: No Logging for Scheduled Runs
**What goes wrong:** Job fails silently, no way to diagnose issues
**Why it happens:** Print statements only go to stdout, which may be discarded
**How to avoid:** Use proper file-based logging with timestamps
**Warning signs:** Print statements in code, empty or missing log files

### Pitfall 5: Unbounded Log Growth
**What goes wrong:** Disk fills up after weeks/months of operation
**Why it happens:** No log rotation configured
**How to avoid:** Use `TimedRotatingFileHandler` with `backupCount` to limit retention
**Warning signs:** Log files measured in GB, disk space alerts

### Pitfall 6: Swallowing Exceptions Silently
**What goes wrong:** Job reports success (exit 0) when it actually failed
**Why it happens:** Broad try/except without re-raising or exit code
**How to avoid:** Log exceptions and `sys.exit(1)` on failure
**Warning signs:** Log shows errors but exit code was 0

## Code Examples

Verified patterns for this phase:

### Complete Logging Setup
```python
# dolphin/config.py (add to existing)
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

def setup_logging() -> logging.Logger:
    """Configure logging for scheduled execution."""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)

    logger = logging.getLogger("tracker")
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers if called multiple times
    if logger.handlers:
        return logger

    # File handler with daily rotation
    file_handler = TimedRotatingFileHandler(
        filename=log_dir / "tracker.log",
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
    )
    file_handler.suffix = "%Y-%m-%d"

    # Console handler (captured by launchd's StandardOutPath)
    console_handler = logging.StreamHandler()

    # Shared formatter
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
```

### Plist Template for Daily 9 AM Run
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dolphin.tracker</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/johnasbury/Reachh/dolphin/venv/bin/python</string>
        <string>/Users/johnasbury/Reachh/dolphin/tracker.py</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/johnasbury/Reachh/dolphin</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/johnasbury/Reachh/dolphin/logs/launchd.stdout</string>
    <key>StandardErrorPath</key>
    <string>/Users/johnasbury/Reachh/dolphin/logs/launchd.stderr</string>
</dict>
</plist>
```

### launchctl Commands
```bash
# Validate plist syntax
plutil -lint ~/Library/LaunchAgents/com.dolphin.tracker.plist

# Load the job (legacy but still works)
launchctl load ~/Library/LaunchAgents/com.dolphin.tracker.plist

# Or use modern syntax
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dolphin.tracker.plist

# Check if loaded
launchctl list | grep dolphin

# Unload job
launchctl unload ~/Library/LaunchAgents/com.dolphin.tracker.plist

# Or modern syntax
launchctl bootout gui/$(id -u)/com.dolphin.tracker

# Run job immediately for testing
launchctl start com.dolphin.tracker
```

### Main Entry Point with Proper Error Handling
```python
#!/usr/bin/env python3
"""
Dolphin + Reddit Account Tracker
Runs as scheduled job via launchd.
"""
import asyncio
import sys
import logging
from pathlib import Path

# Import after logging setup
from config import setup_logging

logger = logging.getLogger("tracker")


async def run_tracker(limit: int | None = None) -> int:
    """Main tracking function. Returns exit code (0=success, 1=failure)."""
    # ... existing tracking logic ...
    # Replace print() with logger.info()
    # Return 0 on success
    return 0


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
    # Support --test flag for manual testing
    test_mode = "--test" in sys.argv
    if test_mode:
        # For interactive testing, run directly
        asyncio.run(run_tracker(limit=5))
    else:
        # For scheduled execution, use proper entry point
        sys.exit(main())
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| cron on macOS | launchd with StartCalendarInterval | macOS 10.4+ (2005) | Jobs run on wake if missed |
| `launchctl load` | `launchctl bootstrap` | macOS 10.10+ | Modern syntax, same effect |
| Manual log cleanup | TimedRotatingFileHandler | Always available | Automatic rotation and cleanup |
| print() statements | logging module | Always recommended | File logging, levels, rotation |

**Deprecated/outdated:**
- cron: Still works but deprecated in favor of launchd on macOS
- `launchctl load/unload`: Legacy syntax, `bootstrap/bootout` is newer but both work

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal schedule time**
   - What we know: Script should run daily when user is likely awake
   - What's unclear: User's preferred time (morning? evening?)
   - Recommendation: Default to 9:00 AM, make configurable

2. **Notification on failure**
   - What we know: Exit codes indicate success/failure, logs capture details
   - What's unclear: Whether user wants active notification (email, macOS notification)
   - Recommendation: Start with just logging; add notifications in future phase if needed

3. **Virtual environment location**
   - What we know: Script needs venv with dependencies
   - What's unclear: Whether venv exists at `/Users/johnasbury/Reachh/dolphin/venv`
   - Recommendation: Check during setup, create if needed, document exact path

## Sources

### Primary (HIGH confidence)
- [Apple Developer - Scheduling Timed Jobs](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html) - Official Apple documentation on launchd
- [Python logging.handlers Documentation](https://docs.python.org/3/library/logging.handlers.html) - Official Python docs for rotating handlers
- [launchd.info Tutorial](https://www.launchd.info/) - Comprehensive launchd reference

### Secondary (MEDIUM confidence)
- [David Hamann - Using launchd agents to schedule scripts](https://davidhamann.de/2018/03/13/setting-up-a-launchagent-macos-cron/) - Practical macOS scheduling guide
- [Schedule Library - Exception Handling](https://schedule.readthedocs.io/en/stable/exception-handling.html) - Error handling patterns (applicable concepts)
- [Henry Leach - Controlling Python Exit Codes](https://www.henryleach.com/2025/02/controlling-python-exit-codes-and-shell-scripts/) - Exit code best practices

### Tertiary (LOW confidence)
- [Apple Community - Python Scripts in Virtual Environments](https://discussions.apple.com/thread/255934217) - Community guidance on venv with launchd
- [Alan Siu - launchctl new subcommand basics](https://www.alansiu.net/2023/11/15/launchctl-new-subcommand-basics-for-macos/) - Modern launchctl syntax

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - launchd is Apple's official solution, logging is stdlib
- Architecture: HIGH - Patterns verified against Apple docs and Python docs
- Pitfalls: HIGH - Well-documented issues with community consensus

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - launchd and logging are stable)
