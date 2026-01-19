# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- No formal test framework installed
- `package.json` test script: `"test": "echo \"Error: no test specified\" && exit 1"`

**Assertion Library:**
- None; no testing dependencies in package.json

**Current Testing Approach:**
- Manual testing via interactive CLI
- Ad-hoc test scripts (`test-api.js`, `test-socket.js`)

**Run Commands:**
```bash
# Manual testing via interactive mode
node browse-reddit.js --dry-run

# API connectivity test
node test-api.js

# Socket connectivity test
node test-socket.js
```

## Test File Organization

**Location:**
- Test scripts in project root alongside main code
- No dedicated `test/` or `__tests__/` directory

**Naming:**
- Prefix pattern: `test-*.js`
- Current files:
  - `test-api.js` - Tests Dolphin remote API connectivity
  - `test-socket.js` - Tests Socket.IO connection to Dolphin

**Structure:**
```
/Users/johnasbury/Reachh/dolphin-reddit/
├── browse-reddit.js      # Main application
├── config.js             # Configuration
├── test-api.js           # API connectivity test
├── test-socket.js        # Socket connectivity test
├── TESTING.md            # Manual testing tracker
└── package.json
```

## Test Structure

**Ad-hoc Test Pattern:**
```javascript
// test-api.js pattern
const config = require("./config");

async function test() {
  // Setup
  const listRes = await fetch("https://dolphin-anty-api.com/browser_profiles?limit=1", {
    headers: { "Authorization": "Bearer " + config.dolphinToken }
  });

  // Execute & Log
  const listData = await listRes.json();
  console.log("Found profile:", profileId, profileName);

  // More operations...
  console.log("Start response:", JSON.stringify(startData, null, 2));
}

test().catch(e => console.error("Error:", e.message));
```

**Socket Test Pattern:**
```javascript
// test-socket.js pattern
const { io } = require("socket.io-client");
const config = require("./config");

const socket = io("http://localhost:3001", {
  transports: ["websocket"],
  auth: { token: config.dolphinToken }
});

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("getBrowserProfiles", {}, (response) => {
    console.log("Profiles response:", response);
  });
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});

// Auto-cleanup
setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 5000);
```

## Mocking

**Framework:** None

**Patterns:**
- No mocking infrastructure
- Tests run against live Dolphin Anty instance

**What to Mock (if implementing):**
- Dolphin Anty API responses
- Browser page interactions
- Network requests

**What NOT to Mock:**
- Configuration loading (uses real config.js)

## Fixtures and Factories

**Test Data:**
- No fixture files
- Test data inline in test scripts

**Location:**
- N/A (not implemented)

## Coverage

**Requirements:** None enforced

**View Coverage:**
- N/A (no coverage tooling)

## Test Types

**Unit Tests:**
- Not implemented
- Functions like `checkDailyLimit()`, `getWarmupMultiplier()` are unit-testable

**Integration Tests:**
- Manual integration testing documented in `TESTING.md`
- Requires running Dolphin Anty instance

**E2E Tests:**
- Manual via interactive CLI with `--dry-run` flag
- Comprehensive checklist in `TESTING.md`

## Manual Testing Protocol

**Location:** `TESTING.md`

**Structure:**
1. Pre-test checklist (Dolphin running, profile exists, etc.)
2. Test tables by category (Connection, Navigation, Extraction, Actions, etc.)
3. Issues log
4. Selector issues tracking
5. Config adjustments log

**Test Categories (from TESTING.md):**

| Category | Test Count | Commands Tested |
|----------|------------|-----------------|
| Connection & Profiles | 4 | profiles, connect, status, disconnect |
| Navigation | 6 | subreddit, home, search, user, back, url |
| Content Extraction | 7 | posts, clickpost, postcontent, comments, subinfo, userinfo |
| Actions (Dry Run) | 3 | upvote, comment, dryrun |
| Actions (Live) | 6 | upvote, undo, save, unsave, join, leave |
| Rate Limiting | 6 | limits, checksession, checkban, checkcaptcha, checkratelimit |
| Account Features | 6 | account, saved, myposts, mycomments, notifications, messages |
| Screenshots & Logging | 4 | screenshot, log verification |
| Advanced | 3 | createpost, reply, sendmsg |

## Dry Run Mode

**Purpose:** Safe testing without executing actions

**Enable:**
```bash
# CLI flag
node browse-reddit.js --dry-run

# Interactive command
> dryrun on
```

**Behavior:**
- Actions are logged but not executed
- Returns `{ success: true, dryRun: true }`
- Visual indicator in prompt: `[ProfileName][DRY]>`

## Common Patterns

**Async Testing:**
```javascript
async function test() {
  // async/await pattern
  const result = await someAsyncOperation();
  console.log(result);
}
test().catch(e => console.error("Error:", e.message));
```

**Error Testing:**
```javascript
socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});
```

**Timeout Pattern:**
```javascript
setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 5000);
```

## Selector Tracking

**Location:** `TESTING.md` selector issues table

**Tracked Selectors:**
| Feature | Selector |
|---------|----------|
| Post container | `shreddit-post` |
| Upvote button | `button[aria-label*="upvote"]` |
| Comment box | `div[contenteditable="true"]` |
| Join button | `shreddit-join-button button` |
| User menu | `[data-testid="user-drawer-button"]` |

## Recommendations for Formal Testing

**Suggested Framework:**
- Vitest or Jest for unit tests
- Playwright for E2E (browser automation testing)

**Unit Test Targets:**
- `checkDailyLimit()` - rate limiting logic
- `checkCooldown()` - cooldown calculations
- `getWarmupMultiplier()` - warmup multiplier logic
- `processCommand()` - command parsing

**Integration Test Targets:**
- API connectivity (`dolphinFetch()`)
- Browser connection (`connectToProfile()`)

**Files needing tests:**
- `browse-reddit.js` - All command functions
- `config.js` - Validation of config structure

---

*Testing analysis: 2026-01-19*
