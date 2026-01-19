# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Single-File CLI Application with Module Pattern

**Key Characteristics:**
- Monolithic single-file design (`browse-reddit.js` - 1882 lines)
- Stateful singleton pattern for browser/session management
- Command pattern for user interactions (REPL-style interface)
- Rate limiting and safety features built into action execution layer
- External browser automation via Dolphin Anty API + Puppeteer

## Layers

**Configuration Layer:**
- Purpose: Centralize all configurable parameters
- Location: `config.js`
- Contains: API endpoints, delays, rate limits, safety settings, paths
- Depends on: Environment variables (DOLPHIN_TOKEN)
- Used by: All other layers in `browse-reddit.js`

**State Management Layer:**
- Purpose: Track browser connection, rate limits, session validity
- Location: `browse-reddit.js` lines 13-56 (state object)
- Contains: Browser/page references, profile info, action timestamps, daily/hourly counts, undo stack
- Depends on: Nothing (initialized at module load)
- Used by: All action functions, command processor

**Logging Layer:**
- Purpose: Console output and file-based action logging
- Location: `browse-reddit.js` lines 58-108
- Contains: `log()`, `logAction()`, `ensureDir()` functions
- Depends on: config.paths, config.logging
- Used by: All action functions

**Rate Limiting Layer:**
- Purpose: Enforce daily/hourly limits, cooldowns, activity hours
- Location: `browse-reddit.js` lines 136-302
- Contains: Limit checkers, cooldown enforcement, warmup multipliers
- Depends on: State management, config
- Used by: Action functions via `canPerformAction()`

**Detection Layer:**
- Purpose: Detect session issues, bans, captchas, rate limits
- Location: `browse-reddit.js` lines 304-443
- Contains: `validateSession()`, `checkForBan()`, `checkForCaptcha()`, `checkForRateLimit()`
- Depends on: Puppeteer page evaluation
- Used by: Navigation functions, action functions

**Dolphin Anty API Layer:**
- Purpose: Interface with Dolphin Anty browser profile manager
- Location: `browse-reddit.js` lines 445-532
- Contains: `dolphinFetch()`, `listProfiles()`, `startProfile()`, `stopProfile()`, `connectToProfile()`
- Depends on: config.dolphinApi, config.dolphinToken, puppeteer-core
- Used by: Command processor (connect/disconnect commands)

**Navigation Layer:**
- Purpose: Browser navigation with safety checks
- Location: `browse-reddit.js` lines 534-591
- Contains: `goto()`, `gotoSubreddit()`, `gotoPost()`, `gotoUser()`, `search()`, `home()`, `back()`, `refresh()`
- Depends on: State (page), Detection layer, config.delays
- Used by: Action functions, command processor

**Content Extraction Layer:**
- Purpose: Scrape Reddit page content using CSS selectors
- Location: `browse-reddit.js` lines 593-729
- Contains: `extractPosts()`, `extractComments()`, `extractPostContent()`, `extractUserProfile()`, `extractSubredditInfo()`
- Depends on: State (page), Puppeteer page.evaluate()
- Used by: Command processor, other action functions

**Action Layer:**
- Purpose: Execute Reddit interactions (vote, comment, post, etc.)
- Location: `browse-reddit.js` lines 731-1327
- Contains: Voting functions, comment functions, post management, save/follow/join, reporting/blocking
- Depends on: Rate limiting, state, detection, config.content
- Used by: Command processor

**Account Layer:**
- Purpose: Account-related operations and queries
- Location: `browse-reddit.js` lines 1329-1483
- Contains: `checkNotifications()`, `checkMessages()`, `sendMessage()`, `getAccountInfo()`, `getSavedPosts()`, `getMyPosts()`, `getMyComments()`
- Depends on: Navigation, extraction, state
- Used by: Command processor

**Command Processor Layer:**
- Purpose: Parse and execute CLI commands, REPL interface
- Location: `browse-reddit.js` lines 1583-1784
- Contains: Command registry, `processCommand()`, help system
- Depends on: All other layers
- Used by: Main entry point

**Main Entry Point:**
- Purpose: Initialize application, start REPL
- Location: `browse-reddit.js` lines 1786-1879
- Contains: `parseArgs()`, `main()`, readline interface
- Depends on: Command processor, config.paths
- Used by: Node.js runtime

## Data Flow

**Profile Connection Flow:**

1. User runs `connect <profile-name>`
2. `connectToProfile()` calls Dolphin Anty API to find profile
3. API returns WebSocket endpoint for browser automation
4. Puppeteer connects via WebSocket endpoint
5. Session validation runs to check Reddit login status
6. State updated with browser/page references and profile info

**Action Execution Flow:**

1. User enters command (e.g., `upvote`)
2. `processCommand()` parses input and routes to handler
3. `canPerformAction('upvote')` checks:
   - Dry run mode
   - Activity hours
   - Daily limits
   - Hourly limits
   - Cooldown timers
4. If allowed, action executes via `page.evaluate()` (DOM manipulation)
5. `recordAction()` updates timestamps and counts
6. Action logged to file and console
7. Result returned as JSON

**State Management:**
- Global `state` object holds all runtime state
- Daily/hourly counts auto-reset on date/hour change
- Undo stack tracks reversible actions (upvote, downvote, save)
- Consecutive error count triggers safety stop

## Key Abstractions

**Command Registry:**
- Purpose: Map command names to functions with metadata
- Examples: `browse-reddit.js` lines 1587-1654
- Pattern: Object literal with fn, args, desc properties

**State Object:**
- Purpose: Centralized mutable state container
- Examples: `browse-reddit.js` lines 13-56
- Pattern: Singleton module-level object

**Rate Limit Checks:**
- Purpose: Composable permission checking
- Examples: `checkDailyLimit()`, `checkHourlyLimit()`, `checkCooldown()`, `checkActivityHours()`
- Pattern: Returns `{allowed: boolean, reason?: string}` objects

## Entry Points

**CLI Entry:**
- Location: `browse-reddit.js` (shebang: `#!/usr/bin/env node`)
- Triggers: `node browse-reddit.js [--profile <name>] [--dry-run] [--help]`
- Responsibilities: Parse args, create directories, auto-connect if profile specified, start REPL

**REPL Commands:**
- Location: `processCommand()` function
- Triggers: User input via readline
- Responsibilities: Parse command, execute handler, return JSON result

## Error Handling

**Strategy:** Catch-and-continue with logging and safety limits

**Patterns:**
- Try/catch around all command execution
- Consecutive error counting with configurable max (default: 5)
- Auto-screenshot on error (when enabled in config)
- Graceful degradation (return error object, don't crash)
- Detection functions return safe defaults on error

## Cross-Cutting Concerns

**Logging:**
- Console with color-coded prefixes (debug/info/warn/error/action)
- JSON file logging to `./logs/actions-YYYY-MM-DD.log`
- Configurable log level filtering

**Validation:**
- Content validation (max lengths, forbidden words) in `writeComment()`, `createPost()`
- Session validation before actions (configurable)
- Input parsing with quoted string support in command processor

**Authentication:**
- Dolphin Anty API token from config/environment
- Reddit session managed by Dolphin browser profile (cookies persisted in profile)
- Session validity checked via DOM inspection for user menu presence

---

*Architecture analysis: 2026-01-19*
