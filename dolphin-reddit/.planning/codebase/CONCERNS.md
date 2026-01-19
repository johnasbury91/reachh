# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Hardcoded API Token in Config:**
- Issue: JWT token hardcoded directly in `config.js` line 12
- Files: `config.js`
- Impact: Security vulnerability - token exposed in version control; token contains sensitive team/subscription data
- Fix approach: Move token to environment variable only, remove hardcoded fallback value

**Single Monolithic File:**
- Issue: All automation logic (1881 lines) in single `browse-reddit.js` file
- Files: `browse-reddit.js`
- Impact: Hard to maintain, test, and extend; difficult to isolate functionality
- Fix approach: Split into modules: `api.js` (Dolphin API), `reddit-actions.js`, `selectors.js`, `rate-limiter.js`, `state.js`

**Unused Configuration Properties:**
- Issue: `dolphinLocalApi` and `dolphinRemoteApi` defined but not used consistently
- Files: `config.js` (lines 6, 9), `browse-reddit.js` (line 455 uses `config.dolphinApi` which doesn't exist)
- Impact: Config confusion, `dolphinFetch` function uses undefined property
- Fix approach: Standardize API URL references, use correct property names

**State Stored in Memory Only:**
- Issue: Daily/hourly counts reset on script restart; no persistence
- Files: `browse-reddit.js` (lines 34-52)
- Impact: Rate limits ineffective across sessions; could trigger Reddit restrictions
- Fix approach: Persist counts to `data/` directory, load on startup

## Known Bugs

**Undefined Config Property:**
- Symptoms: API calls may fail silently or throw errors
- Files: `browse-reddit.js` line 455
- Trigger: Any call to `dolphinFetch()` - uses `config.dolphinApi` which doesn't exist (should be `config.dolphinRemoteApi`)
- Workaround: None; requires code fix

**Empty Catch Blocks Swallow Errors:**
- Symptoms: Navigation failures go undetected
- Files: `browse-reddit.js` lines 1185, 1340
- Trigger: `waitForNavigation` timeouts after clicking post or checking notifications
- Workaround: None; errors silently swallowed

**Count Key Mismatch:**
- Symptoms: Some daily counts may not track correctly
- Files: `browse-reddit.js` lines 292-300
- Trigger: `recordAction('upvote')` looks for `state.dailyCounts.upvotes` (adds 's') but action types are singular
- Workaround: Works for most actions due to existing plural keys, but fragile

## Security Considerations

**Exposed API Token:**
- Risk: JWT token in `config.js` line 12 contains team ID, subscription info, expiration date
- Files: `config.js`
- Current mitigation: Can use `DOLPHIN_TOKEN` env var, but hardcoded fallback defeats this
- Recommendations: Remove hardcoded token entirely; fail if env var not set; add `config.js` to `.gitignore`

**No Input Sanitization:**
- Risk: User-provided text for comments/posts passed directly to Reddit
- Files: `browse-reddit.js` (functions: `writeComment`, `createPost`, `sendMessage`)
- Current mitigation: Basic forbidden word check
- Recommendations: Add length validation, character filtering, XSS prevention for any stored content

**No HTTPS Enforcement for Local API:**
- Risk: Local API calls over plain HTTP
- Files: `config.js` line 9, `test-socket.js` line 4
- Current mitigation: Local-only traffic
- Recommendations: Document security implications; consider localhost-only binding verification

## Performance Bottlenecks

**Synchronous File Logging:**
- Problem: `fs.appendFileSync` blocks event loop on every action
- Files: `browse-reddit.js` line 99
- Cause: Synchronous I/O in main thread
- Improvement path: Use async `fs.appendFile` or batch writes; consider log rotation

**No Connection Pooling:**
- Problem: New fetch connection for each API call
- Files: `browse-reddit.js` function `dolphinFetch`
- Cause: No HTTP agent reuse
- Improvement path: Use keep-alive agent; consider caching profile list

## Fragile Areas

**Reddit Selector Dependency:**
- Files: `browse-reddit.js` (lines 600-729, 744-946)
- Why fragile: Reddit UI changes frequently; selectors like `shreddit-post`, `flair-badge` are custom elements that may change
- Safe modification: Test selectors in browser DevTools before deploying; add fallback selectors
- Test coverage: No automated selector validation tests exist

**Session Validation Logic:**
- Files: `browse-reddit.js` (lines 307-327)
- Why fragile: Uses `:contains()` pseudo-selector which isn't standard CSS; relies on specific element IDs
- Safe modification: Test against multiple Reddit page states; add multiple fallback checks
- Test coverage: None

**Activity Hours Logic:**
- Files: `browse-reddit.js` (lines 233-251)
- Why fragile: `flexChance` uses `Math.random()` without seed; inconsistent behavior
- Safe modification: Consider deterministic flex based on profile/date hash
- Test coverage: None

## Scaling Limits

**In-Memory State:**
- Current capacity: Single profile at a time
- Limit: Memory grows with undo stack; no cleanup mechanism
- Scaling path: Implement max undo stack size; consider LRU cache for state

**File-Based Logging:**
- Current capacity: Works for low-volume usage
- Limit: Single log file per day; no rotation or size limits
- Scaling path: Implement log rotation; consider structured logging to external service

## Dependencies at Risk

**puppeteer-core v24:**
- Risk: Major version updates may break CDP protocol compatibility
- Impact: Browser automation fails
- Migration plan: Pin version; test upgrades in staging

**socket.io-client:**
- Risk: Used in `test-socket.js` but actual implementation uses REST API
- Impact: Unused dependency adds bloat
- Migration plan: Remove if not needed for production

## Missing Critical Features

**No Automated Testing:**
- Problem: Zero test files; only manual `TESTING.md` checklist
- Blocks: Confident refactoring; CI/CD integration; regression detection

**No Error Recovery:**
- Problem: On errors, script logs but doesn't attempt recovery
- Blocks: Unattended operation; overnight runs

**No Profile Rotation:**
- Problem: Single profile per session; manual switching required
- Blocks: Multi-account management; load distribution

## Test Coverage Gaps

**All Core Functions Untested:**
- What's not tested: Every function in `browse-reddit.js` (voting, commenting, navigation, extraction)
- Files: `browse-reddit.js`
- Risk: Selector changes break silently; rate limit logic untested
- Priority: High

**Rate Limiting Logic:**
- What's not tested: Daily/hourly limits, warmup multipliers, cooldown enforcement
- Files: `browse-reddit.js` (lines 140-300)
- Risk: Could exceed limits and trigger Reddit anti-spam
- Priority: Critical

**Error Handling Paths:**
- What's not tested: Ban detection, captcha detection, rate limit response
- Files: `browse-reddit.js` (lines 330-443)
- Risk: Account suspension may go undetected
- Priority: High

## Code Duplication

**Repeated Page Evaluate Patterns:**
- Issue: Similar `state.page.evaluate()` patterns repeated throughout
- Files: `browse-reddit.js` (voting: 744-813, comments: 832-928, posts: 935-1037)
- Impact: Inconsistent error handling; duplicated selector logic
- Fix approach: Create helper function `evaluateWithRetry(selector, action)`

**Repeated Navigation Checks:**
- Issue: `checkForCaptcha()`, `checkForRateLimit()` called inconsistently after navigations
- Files: `browse-reddit.js` (lines 546-550 vs other navigation functions)
- Impact: Some pages don't get safety checks
- Fix approach: Wrap all navigation in consistent post-navigation check

## Missing Documentation

**No JSDoc/TSDoc:**
- Issue: No function documentation; parameter types undocumented
- Files: All `.js` files
- Impact: Harder for contributors to understand expected behavior

**No README:**
- Issue: Only spec and testing docs; no getting started guide
- Files: Project root
- Impact: Onboarding difficulty

---

*Concerns audit: 2026-01-19*
