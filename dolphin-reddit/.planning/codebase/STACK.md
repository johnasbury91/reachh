# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- JavaScript (ES2020+) - All application code

**Secondary:**
- None

## Runtime

**Environment:**
- Node.js v22+ (per `dolphin-reddit-automation-spec.md`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- puppeteer-core ^24.35.0 - Browser automation via Chrome DevTools Protocol (CDP)

**Testing:**
- None configured - `package.json` has placeholder test script

**Build/Dev:**
- None - Direct Node.js execution, no transpilation required

## Key Dependencies

**Critical:**
- `puppeteer-core` ^24.35.0 - Connects to Dolphin Anty browser instances for Reddit automation
- `socket.io-client` ^4.8.3 - WebSocket communication with Dolphin Anty local API
- `node-fetch-cookies` ^2.1.1 - HTTP requests with cookie persistence

**Infrastructure:**
- Node.js built-in `readline` - Interactive CLI interface
- Node.js built-in `fs` - File system operations for logging/screenshots
- Node.js built-in `path` - Path manipulation

## Configuration

**Environment:**
- `DOLPHIN_TOKEN` - API token for Dolphin Anty authentication (can be set via env var or hardcoded in `config.js`)
- Configuration file: `config.js` exports module with all settings

**Key Configuration Sections:**
- `dolphinRemoteApi` - Remote API URL (https://dolphin-anty-api.com)
- `dolphinLocalApi` - Local API URL (http://localhost:3001/v1.0)
- `dolphinToken` - JWT bearer token for API authentication
- `logging` - Log level and file settings
- `delays` - Rate limiting delays (min/max action times, typing delays)
- `dailyLimits` - Per-day action limits (upvotes: 50, comments: 20, etc.)
- `hourlyLimits` - Per-hour action limits
- `activityHours` - Simulated human activity hours (8 AM - 11 PM)
- `warmup` - New account warmup multipliers
- `safety` - Dry run mode, error handling, session validation
- `paths` - Output directories (logs, screenshots, data)

**Build:**
- No build step required - runs directly with Node.js

## Platform Requirements

**Development:**
- macOS (darwin) confirmed
- Node.js v22+
- Dolphin Anty application running locally
- Dolphin Anty local API enabled on port 3001

**Production:**
- Same as development - designed for local execution
- Could be deployed to VPS with Dolphin Anty installed (noted as future enhancement)

## Entry Points

**Main Script:**
- `browse-reddit.js` - CLI application with interactive REPL

**CLI Arguments:**
```bash
node browse-reddit.js [options]
  --profile, -p <name>   Profile to connect to on startup
  --dry-run, -d          Enable dry run mode
  --help, -h             Show help
```

**Test Scripts:**
- `test-api.js` - Tests Dolphin Anty remote API endpoints
- `test-socket.js` - Tests Socket.IO connection to local Dolphin API

---

*Stack analysis: 2026-01-19*
