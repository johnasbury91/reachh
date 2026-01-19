# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- kebab-case for JavaScript files: `browse-reddit.js`, `test-api.js`, `test-socket.js`
- Single-word lowercase for config: `config.js`

**Functions:**
- camelCase for all functions: `connectToProfile`, `extractPosts`, `humanType`
- Prefixes by purpose:
  - `get*` for data retrieval: `getStatus()`, `getLimits()`, `getAccountInfo()`
  - `check*` for validation: `checkForBan()`, `checkCooldown()`, `checkDailyLimit()`
  - `extract*` for DOM scraping: `extractPosts()`, `extractComments()`
  - `goto*` for navigation: `goto()`, `gotoSubreddit()`, `gotoUser()`
  - `record*` for tracking: `recordAction()`
  - `reset*` for state management: `resetDailyCountsIfNeeded()`

**Variables:**
- camelCase for all variables: `currentProfileId`, `sessionValid`, `lastActions`
- Boolean prefixes: `is*`, `has*` patterns used in page.evaluate returns

**Constants:**
- No separate constants file; configuration values in `config.js`
- Inline numeric literals for timeouts with comments

## Code Style

**Formatting:**
- 2-space indentation
- No explicit formatter configured (no Prettier/ESLint in package.json)
- Semicolons used consistently
- Single quotes for strings

**Line Length:**
- No enforced limit; some lines exceed 100 characters
- Long selector strings kept on single line

**Braces:**
- Same-line opening braces for functions and control structures
- No braces for single-statement if/else (inconsistent)

## Import Organization

**Order:**
1. Built-in Node.js modules: `readline`, `fs`, `path`
2. External npm packages: `puppeteer-core`, `socket.io-client`
3. Local modules: `./config`

**Pattern:**
```javascript
const puppeteer = require('puppeteer-core');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const config = require('./config');
```

**Path Aliases:**
- None used; relative paths only (`./config`)

## Error Handling

**Patterns:**
- Try-catch blocks with error message extraction:
```javascript
try {
  // operation
} catch (e) {
  return { error: e.message };
}
```

- Graceful failure with default returns:
```javascript
catch (e) {
  return { valid: false, reason: e.message };
}
```

- Error state tracking via `state.consecutiveErrors` counter
- Automatic screenshot on errors when configured:
```javascript
if (config.safety.screenshotOnError) {
  await screenshot(`error-${Date.now()}.png`);
}
```

**Error Response Format:**
- Objects with `success: false` and `error` or `reason` field
- Example: `{ success: false, error: 'No browser connected' }`

## Logging

**Framework:** Custom logging system using console + file output

**Log Levels:**
- `debug` - Detailed operational info
- `info` - Normal operations
- `warn` - Warning conditions
- `error` - Error conditions
- `action` - User actions (always logged)

**Pattern:**
```javascript
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, profile, message, ...data };
  // Console with ANSI colors
  // File append as JSON lines
}
```

**Colored Console Output:**
```javascript
const prefix = {
  debug: '\x1b[90m[DEBUG]\x1b[0m',
  info: '\x1b[36m[INFO]\x1b[0m',
  warn: '\x1b[33m[WARN]\x1b[0m',
  error: '\x1b[31m[ERROR]\x1b[0m',
  action: '\x1b[32m[ACTION]\x1b[0m',
};
```

**Action Logging:**
```javascript
function logAction(action, details = {}, success = true) {
  return log('action', `${success ? '✓' : '✗'} ${action}`, { action, success, details });
}
```

**File Logging:**
- JSON Lines format to `logs/actions-YYYY-MM-DD.log`
- Each entry is a single JSON object per line

## Comments

**Section Headers:**
- Block comment separators using `// ===...===`:
```javascript
// ============================================
// STATE MANAGEMENT
// ============================================
```

**Inline Comments:**
- Sparse; mainly for complex logic or configuration explanations
- Comments in config.js explain each setting

**JSDoc/TSDoc:**
- Not used; no type annotations

## Function Design

**Size:**
- Most functions 10-50 lines
- Largest functions are command handlers (~100 lines)

**Parameters:**
- Default parameters used: `function delay(min = config.delays.minAction, max = config.delays.maxAction)`
- Optional parameters with `?` notation in command definitions
- Object destructuring not heavily used

**Return Values:**
- Consistent object returns: `{ success: boolean, ...details }`
- Error returns: `{ error: string }` or `{ success: false, reason: string }`
- Data returns: Plain objects or arrays

**Async Pattern:**
- All browser interaction functions are async
- Consistent use of async/await (no raw Promises)
- No Promise.all for parallel operations

## Module Design

**Exports:**
- Single `module.exports = { ... }` in `config.js`
- Main script `browse-reddit.js` has no exports (entry point)

**Barrel Files:**
- Not used; single-file architecture

**State Management:**
- Global `state` object at module scope:
```javascript
const state = {
  browser: null,
  page: null,
  currentProfileId: null,
  // ...
};
```

## Configuration Pattern

**Location:** `config.js` as single config module

**Structure:**
- Nested objects for logical grouping: `delays`, `dailyLimits`, `safety`, `paths`
- Environment variable fallback: `process.env.DOLPHIN_TOKEN || 'default'`

**Usage:**
- Imported as `const config = require('./config')`
- Accessed as `config.delays.minAction`

## Dry Run Pattern

**Implementation:**
- Global `state.dryRun` flag
- Checked at start of action functions:
```javascript
if (state.dryRun) {
  logAction('upvote', { dryRun: true }, true);
  return { success: true, dryRun: true };
}
```

## Rate Limiting Pattern

**Checks before actions:**
```javascript
const check = await canPerformAction('upvote');
if (!check.allowed) return { success: false, ...check };
```

**Multi-layer limits:**
1. Activity hours check
2. Daily limit check
3. Hourly limit check
4. Cooldown check

## Command Pattern

**Command Registry:**
```javascript
const commands = {
  goto: { fn: goto, args: ['url'], desc: 'Navigate to URL' },
  // ...
};
```

**Argument Parsing:**
- Space-separated, quoted strings supported:
```javascript
const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
const cmd = parts[0]?.toLowerCase();
const args = parts.slice(1).map(a => a.replace(/^"|"$/g, ''));
```

---

*Convention analysis: 2026-01-19*
