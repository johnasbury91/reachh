# Proxy Setup for Reddit Account Farming

This guide explains how to configure proxies correctly for Reddit accounts in Dolphin Anty.

## Why Sticky Sessions Matter

Reddit tracks IP changes and flags accounts that switch IPs frequently. Using rotating proxies (which change IPs every request) will get your accounts flagged or banned.

**Always use sticky sessions** - these maintain the same IP for an extended period, mimicking normal user behavior.

---

## DataImpulse Setup

### Getting Credentials

1. Log into [DataImpulse Dashboard](https://app.dataimpulse.com/)
2. Navigate to Residential Proxies section
3. Note your username and password

> **API Reference:** Get available locations via API:
> https://documenter.getpostman.com/view/7041120/2sAY4rGRZC#99596afc-d7f7-4fb6-9992-60058f2dec0c

### Proxy Format

```
http://USERNAME__cr.us;state.california;city.losangeles:PASSWORD@gw.dataimpulse.com:PORT
```

### Port Selection (CRITICAL)

| Port | Type | Use for Reddit? |
|------|------|-----------------|
| **823** | Rotating | **NO** - Changes IP every request |
| **10000+** | Sticky | **YES** - Maintains same IP |

**IMPORTANT:** Port 823 is for rotating proxies. The audit found 1 profile using port 823 - this MUST be changed to a sticky session port (10000+).

### Geo Targeting Parameters

Add to username with double underscore prefix:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `__cr.XX` | `__cr.us` | Country (ISO 2-letter code) |
| `__state.XX` | `__state.california` | US state |
| `__city.XX` | `__city.losangeles` | City (lowercase, no spaces) |

**Full example:**
```
http://user123__cr.us;state.illinois;city.chicago:pass456@gw.dataimpulse.com:10001
```

---

## Decodo Setup

### Proxy Format

```
http://USERNAME-sessionduration-60:PASSWORD@gate.decodo.com:7000
```

### Session Duration

- **Minimum recommended:** 60 minutes
- **Why:** Reddit flags frequent IP changes
- Shorter sessions risk account flagging

### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `sessionduration` | 60+ | Minutes to maintain same IP |
| Port | 7000 | Standard Decodo port |

---

## Common Mistakes

### 1. Using Rotating Proxies

**Problem:** IP changes every request or every few minutes.

**Symptom:** Reddit sees your account logging in from different locations/IPs rapidly.

**Fix:** Switch to sticky sessions (DataImpulse port 10000+, Decodo sessionduration-60+).

**Audit finding:** 1 profile was using port 823 (rotating) instead of sticky.

### 2. Sharing Proxies Between Accounts

**Problem:** Multiple accounts using the same proxy session.

**Symptom:** Reddit links accounts together, leading to mass bans.

**Fix:** Each account needs its own unique proxy session.

**Audit finding:** 102 profiles are sharing only 32 proxy sessions. This is a major issue - each profile should have its own unique session.

### 3. Timezone Mismatch

**Problem:** Dolphin profile timezone doesn't match proxy geo location.

**Symptom:** Reddit sees inconsistent data (user claims CST but IP is from California).

**Fix:** Set Dolphin timezone to match proxy location:
- Illinois proxy = CST/CDT timezone
- California proxy = PST/PDT timezone
- New York proxy = EST/EDT timezone

**Audit finding:** 14 profiles have no geo-targeting configured.

### 4. No Proxy Configured

**Problem:** Profile has no proxy at all.

**Symptom:** Account uses your real IP, linking all accounts together.

**Fix:** Configure a unique sticky proxy for each profile.

**Audit finding:** 12 profiles have no proxy configured.

---

## Proxy Provider Comparison

| Feature | DataImpulse | Decodo |
|---------|-------------|--------|
| Sticky Sessions | Port 10000+ | sessionduration param |
| Rotating | Port 823 | Default without session |
| Geo Targeting | Username params | Dashboard config |
| Recommended | Yes | Yes |

---

## New Account Checklist

Before using a new account, verify:

- [ ] Unique sticky proxy assigned (not shared with other accounts)
- [ ] Correct port: DataImpulse 10000+ or Decodo with sessionduration-60+
- [ ] Geo-targeting configured (country, state, city)
- [ ] Dolphin profile timezone matches proxy geo location
- [ ] Proxy test passes in Dolphin ("Check Proxy" button)
- [ ] Fingerprint generated
- [ ] Account NOT sharing proxy with any other account

---

## Troubleshooting

### Proxy Test Fails

1. Verify credentials are correct
2. Check provider dashboard for usage limits
3. Try a different port/session
4. Ensure firewall allows outbound connections

### Account Flagged Despite Sticky Proxy

1. Check if proxy is shared with other accounts
2. Verify timezone matches proxy geo
3. Check session duration isn't too short
4. Review posting patterns (too fast = bot-like)

---

*Last updated based on audit findings: 12 no proxy, 1 rotating, 102 sharing 32 sessions, 14 no geo*
