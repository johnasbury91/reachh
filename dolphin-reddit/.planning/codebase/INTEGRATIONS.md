# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Dolphin Anty Remote API:**
- Purpose: List browser profiles, manage profiles remotely
- Base URL: `https://dolphin-anty-api.com`
- Auth: Bearer token via `Authorization` header
- Client: Native `fetch()` in `browse-reddit.js` and `test-api.js`
- Endpoints used:
  - `GET /browser_profiles` - List all profiles
  - `GET /browser_profiles/:id/start?automation=1` - Start profile and get WebSocket URL
  - `GET /browser_profiles/:id/stop` - Stop profile

**Dolphin Anty Local API:**
- Purpose: Start/stop browser profiles for automation
- Base URL: `http://localhost:3001/v1.0`
- Auth: Local session token (different from remote API token)
- Client: Native `fetch()` via `dolphinFetch()` function
- Known Issue: Local API requires session token generated at Dolphin startup (documented in `TESTING.md`)

**Reddit (via Browser Automation):**
- Purpose: All Reddit interactions (browsing, voting, commenting, posting)
- Method: Puppeteer browser automation through Dolphin Anty profiles
- No direct API calls - all interactions via DOM manipulation
- Endpoints accessed:
  - `https://www.reddit.com` - Home feed
  - `https://www.reddit.com/r/{subreddit}` - Subreddit pages
  - `https://www.reddit.com/r/{subreddit}/submit` - Post creation
  - `https://www.reddit.com/user/{username}` - User profiles
  - `https://www.reddit.com/user/{username}/saved` - Saved posts
  - `https://www.reddit.com/user/{username}/submitted` - User's posts
  - `https://www.reddit.com/user/{username}/comments` - User's comments
  - `https://www.reddit.com/message/inbox` - Messages
  - `https://www.reddit.com/message/compose` - Compose message
  - `https://www.reddit.com/search` - Search

## Data Storage

**Databases:**
- None - Stateless operation

**File Storage:**
- Local filesystem only
- Directories (configured in `config.js`):
  - `./logs/` - Action logs (JSON lines format)
  - `./screenshots/` - Error and manual screenshots
  - `./data/` - General data storage (created but not actively used)

**Log Format:**
- JSON lines in `./logs/actions-{YYYY-MM-DD}.log`
- Each entry: `{timestamp, level, profile, message, ...data}`

**Caching:**
- In-memory state only (no persistent cache)
- Session state tracked in `state` object:
  - `dailyCounts` - Reset at midnight
  - `hourlyCounts` - Reset hourly
  - `lastActions` - Cooldown tracking
  - `undoStack` - Reversible action history

## Authentication & Identity

**Auth Provider:**
- Dolphin Anty profiles contain saved Reddit sessions
- No direct Reddit authentication - relies on pre-authenticated browser profiles

**Dolphin Anty Auth:**
- JWT Bearer token for remote API
- Token format: Standard JWT with RS256 algorithm
- Token source: `config.js` or `DOLPHIN_TOKEN` environment variable

## Monitoring & Observability

**Error Tracking:**
- Console output with color-coded log levels
- File logging to `./logs/`
- Screenshot on error (`config.safety.screenshotOnError`)

**Logs:**
- Custom logging system via `log()` function
- Levels: debug, info, warn, error, action
- Colored console output (ANSI escape codes)
- JSON file logging when `config.logging.enabled`

## CI/CD & Deployment

**Hosting:**
- Local execution only (macOS development machine)

**CI Pipeline:**
- None configured

**Deployment:**
- Manual execution via terminal
- Future: VPS deployment noted in spec

## Environment Configuration

**Required env vars:**
- `DOLPHIN_TOKEN` (optional if hardcoded in config.js)

**Configuration file:**
- `config.js` - All settings exported as module

**Secrets location:**
- `config.js` contains hardcoded JWT token (security concern noted)
- No `.env` file usage

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Browser Automation Protocol

**Chrome DevTools Protocol (CDP):**
- Puppeteer connects via WebSocket to Dolphin Anty browser instances
- WebSocket endpoint returned from `/browser_profiles/:id/start?automation=1`
- Connection: `puppeteer.connect({ browserWSEndpoint: automation.wsEndpoint })`

**Socket.IO Connection:**
- Alternative connection method tested in `test-socket.js`
- URL: `http://localhost:3001`
- Transport: WebSocket
- Auth: Token-based

## Rate Limiting Integration

**Reddit Rate Limit Detection:**
- Browser-side detection via page content analysis
- Indicators monitored:
  - "you are doing that too much"
  - "try again in X minutes/seconds"
  - "rate limit"
  - "too many requests"
- Automatic wait time extraction from error messages

**Internal Rate Limiting:**
- Configurable delays between actions
- Daily/hourly limits per action type
- Cooldown periods between same-type actions
- Activity hours simulation (8 AM - 11 PM)

## Safety Integrations

**Ban Detection:**
- Page content scanning for suspension indicators
- Auto-stop on ban detection (`config.safety.autoStopOnWarning`)

**Captcha Detection:**
- Monitors for reCAPTCHA and hCaptcha iframes
- Alerts for manual intervention required

**Session Validation:**
- Checks for login state via DOM inspection
- Validates user menu presence vs login button

---

*Integration audit: 2026-01-19*
