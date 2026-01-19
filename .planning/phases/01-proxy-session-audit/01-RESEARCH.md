# Phase 1 Research: Proxy & Session Audit

## DataImpulse Configuration

**Source:** [DataImpulse Tutorials](https://dataimpulse.com/tutorials/), [Dolphin Anty + DataImpulse Guide](https://dolphin-anty.com/blog/en/getting-started-with-dataimpulse/)

### Connection Details
- **Host:** `gw.dataimpulse.com`
- **Port:** `823` (rotating), `10000+` (sticky sessions)
- **Protocol:** HTTP or SOCKS5
- **Format:** `http://username:password@gw.dataimpulse.com:823`

### Session Types
- **Rotating:** Port 823 — IP changes on every request
- **Sticky:** Port 10000, 10001, etc. — each port number = different sticky session

### Username Parameters
DataImpulse supports geo-targeting via username parameters:
- Format: `username__cr.us;state.california;city.losangeles;zip.90003:password`
- Parameters are appended with double underscore `__`

### Current Issue Found
Looking at the Dolphin API response, proxies are stored as:
```
http://6bedabce678df1c53167__cr.us;state.illinois;city.chicago;zip.60602:e9d405b46163e5ee@gw.dataimpulse.com:10016
```

This is a **sticky session** (port 10016) with geo-targeting. The format appears correct.

---

## Decodo Configuration

**Source:** [Decodo Quick Start](https://help.decodo.com/docs/residential-proxy-quick-start), [Session Types](https://help.decodo.com/docs/residential-proxy-session-types)

### Connection Details
- **Host:** `gate.decodo.com`
- **Port:** `7000` (rotating)
- **Protocol:** HTTP, HTTPS, or SOCKS5
- **Format:** `http://username:password@gate.decodo.com:7000`

### Session Types
- **Rotating:** Port 7000 — IP changes on every request
- **Sticky:** Add `sessionduration` parameter to username (1-1440 minutes)
- **Custom sticky:** Use session ID in username for specific IP persistence

### Duration Parameter
```
user-sessionduration-30:password@gate.decodo.com:7000
```
This keeps the same IP for 30 minutes.

### Important Note
"The longer the session, the more chances the IP will rotate early due to the residential device going offline."

---

## Dolphin Anty Best Practices

**Source:** [Dolphin Anty Guide](https://www.rapidseedbox.com/blog/dolphin-anty-guide), [Proxy Integration](https://anyip.io/blog/how-to-use-proxy-with-dolphin-anty)

### Profile Isolation
- Each profile has isolated: fingerprint, cookies, cache, IP
- Never share proxies between profiles
- "Golden rule: log in from where the account was created"

### Cookie Persistence
- Cookies persist automatically between sessions within a profile
- Can import/export cookies via drag-and-drop
- Clear cookies before starting new account, but preserve for existing accounts

### Geographic Matching (Critical)
- **Timezone must match proxy location**
- **System language should match proxy region**
- If proxy is from Illinois, profile timezone should be CST/CDT

### Proxy Testing
- Always click "Check Proxy" before launching
- Verify country, city, and provider match what you purchased

---

## Root Cause Analysis

### Why Proxy Health Checks Are Failing

1. **Timeout Issue:** Current timeout is 10 seconds, but residential proxies can be slow
2. **Connection Issue:** Some proxies may be offline or congested
3. **Format Issue:** ✅ Format appears correct based on research

### Potential Account Ban Causes

Based on research, likely causes for new account bans:

1. **Timezone Mismatch:** If Dolphin profile timezone doesn't match proxy geo
2. **Session Type:** Using rotating IPs (port 823) instead of sticky for Reddit
3. **IP Overlap:** Multiple accounts sharing same proxy/session
4. **Activity Pattern:** Not following warmup schedule

---

## Recommendations

### For Reddit Account Farming

1. **Use Sticky Sessions:** Reddit expects consistent IPs for logged-in users
   - DataImpulse: Use port 10000+ (not 823)
   - Decodo: Use 60+ minute sticky sessions

2. **Match Timezone:** Dolphin profile timezone must match proxy geo-location

3. **One Proxy Per Account:** Never share proxy sessions between accounts

4. **Increase Timeout:** Set proxy health check timeout to 30+ seconds

5. **Verify Before Launch:** Always test proxy connectivity in Dolphin before using

---

## Action Items for Phase 1

1. **Audit current Dolphin profiles** — Check timezone vs proxy geo match
2. **Add DataImpulse provider** — Proper detection and normalization
3. **Increase health check timeout** — 30 seconds minimum
4. **Document proxy setup guide** — Step-by-step for team
5. **Verify session types** — Ensure sticky sessions are being used
