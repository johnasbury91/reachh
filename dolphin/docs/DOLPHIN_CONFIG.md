# Dolphin Anty Profile Configuration

This guide explains how to create and configure Dolphin Anty profiles correctly for Reddit accounts.

## Creating a New Profile

### Step 1: Basic Setup

1. Click **"Create Profile"** in Dolphin Anty
2. Enter a descriptive name (e.g., account username or ID)
3. Select browser type (Chrome recommended)

### Step 2: Configure Timezone

**Critical:** Timezone MUST match your proxy geo location.

| Proxy Location | Timezone Setting |
|----------------|------------------|
| Illinois, Indiana, Wisconsin | CST/CDT (Central) |
| California, Oregon, Washington | PST/PDT (Pacific) |
| New York, Florida, Georgia | EST/EDT (Eastern) |
| Texas (most areas) | CST/CDT (Central) |
| Arizona | MST (no DST) |
| Colorado, Utah | MST/MDT (Mountain) |

**Why this matters:** Reddit can detect when your browser timezone doesn't match your IP location. This is a red flag that triggers account review.

### Step 3: Add Proxy

1. Click the **Proxy** section
2. Select proxy type: **HTTP**
3. Enter proxy details:
   - **Host:** `gw.dataimpulse.com` or `gate.decodo.com`
   - **Port:** `10001` (or assigned sticky port) for DataImpulse, `7000` for Decodo
   - **Username:** Your proxy username with geo params
   - **Password:** Your proxy password

4. Click **"Check Proxy"**
   - Verify IP location matches expected geo
   - Verify country/state/city are correct
   - If wrong location, adjust geo params in username

### Step 4: Generate Fingerprint

1. Click **Fingerprint** section
2. Click **"Get new fingerprint"**
3. Verify fingerprint details look reasonable
4. Each profile needs a UNIQUE fingerprint

### Step 5: Save and Launch

1. Click **"Create"** to save profile
2. Click **"Start"** to launch browser
3. Verify everything works:
   - Visit [whatismyipaddress.com](https://whatismyipaddress.com) - check IP location
   - Visit [browserleaks.com/timezone](https://browserleaks.com/timezone) - check timezone

---

## Cookie Settings

### Keep Cookies Between Sessions

- **DO NOT** clear cookies between sessions
- Clearing cookies = logging out = suspicious behavior
- Reddit expects returning users to have session cookies

### Export Cookies Before Risky Operations

Before doing anything risky (controversial posts, aggressive marketing):

1. Right-click profile > **Export cookies**
2. Save cookie file with date: `username_2026-01-19.cookies`
3. If account gets restricted, you have recovery option

### Import Cookies to Recover

If you need to restore a session:

1. Right-click profile > **Import cookies**
2. Select saved cookie file
3. Launch browser - you should be logged in

---

## Profile Verification Checklist

Before using any profile for Reddit, verify:

- [ ] **Timezone matches proxy location**
  - Central US proxy = CST/CDT timezone
  - West coast proxy = PST/PDT timezone
  - East coast proxy = EST/EDT timezone

- [ ] **Sticky session configured (not rotating)**
  - DataImpulse: Port 10000+ (NOT 823)
  - Decodo: sessionduration-60 or higher

- [ ] **Proxy test passes**
  - Click "Check Proxy" in profile
  - Verify location matches expected geo
  - No timeout or connection errors

- [ ] **Unique fingerprint generated**
  - Each profile has its own fingerprint
  - Don't copy fingerprints between profiles

- [ ] **Not sharing proxy with other accounts**
  - Run audit to check: `python audit_profiles.py`
  - Each account needs unique proxy session

---

## Common Configuration Errors

### Wrong Timezone

**Problem:** Profile timezone is "Auto" or doesn't match proxy.

**Fix:** Manually set timezone to match proxy geo location.

### Rotating Proxy Port

**Problem:** Using DataImpulse port 823.

**Fix:** Change to port 10001 or higher for sticky sessions.

### Shared Proxy Session

**Problem:** Multiple profiles using same proxy credentials.

**Fix:** Create unique proxy sessions:
- DataImpulse: Use different sticky ports (10001, 10002, etc.)
- Decodo: Add unique session ID to username

### Missing Geo Parameters

**Problem:** Proxy has no country/state/city targeting.

**Fix:** Add geo params to proxy username:
```
username__cr.us;state.illinois;city.chicago
```

---

## Bulk Profile Audit

To check all profiles for issues, run the audit script:

```bash
cd dolphin
python audit_profiles.py
```

This will check for:
- Profiles with no proxy
- Profiles using rotating proxies
- Profiles sharing proxy sessions
- Profiles missing geo-targeting

See [PROXY_SETUP.md](./PROXY_SETUP.md) for fixing identified issues.

---

## Quick Reference

| Setting | Correct Value | Why |
|---------|---------------|-----|
| Timezone | Match proxy geo | Reddit detects mismatch |
| Proxy Port (DataImpulse) | 10000+ | Sticky session |
| Proxy Port (Decodo) | 7000 + sessionduration-60 | Sticky session |
| Cookies | Keep between sessions | Stay logged in |
| Fingerprint | Unique per profile | Avoid linking |

---

*See [PROXY_SETUP.md](./PROXY_SETUP.md) for detailed proxy configuration*
