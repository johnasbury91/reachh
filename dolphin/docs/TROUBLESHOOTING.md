# Troubleshooting: Banned and Suspended Accounts

This guide helps diagnose why Reddit accounts are banned or restricted and provides recovery steps where possible.

## Quick Diagnosis

| Symptom | Likely Cause | Section |
|---------|--------------|---------|
| "Account suspended" message | TOS violation or spam | [Suspended](#suspended-accounts) |
| Profile shows 404 | Deleted or shadowbanned | [Not Found](#not-found-accounts) |
| Posts don't appear to others | Shadowban or low CQS | [Shadowban](#shadowban-detection) |
| Comments removed | Automod or spam filter | [Content Filtering](#content-filtering) |
| Multiple accounts banned together | Shared proxy | [Proxy-Related](#proxy-related-bans) |

---

## Suspended Accounts

### What Happened

Reddit suspended the account for Terms of Service violation. The account page shows "This account has been suspended."

### Common Causes

1. **Vote manipulation** - Upvoting own content from other accounts
2. **Ban evasion** - Creating account to bypass subreddit ban
3. **Spam** - Promotional content, repeated messages, link spamming
4. **Multiple accounts on same IP** - Without distinct behavior patterns
5. **Automated behavior** - Bot-like posting patterns detected

### What to Check

- Was the account too active too fast? (Check warmup tier vs actual activity)
- Were multiple accounts used on same proxy session?
- Was there any promotional content before day 30?
- Did the account participate in vote manipulation?
- Was the account used to evade a subreddit ban?

### Recovery Options

**For legitimate errors:**
1. File appeal at reddit.com/appeals
2. Keep appeal brief and factual
3. Wait 24-72 hours for response
4. If denied, the suspension is final

**For confirmed violations:**
- Suspensions are permanent in most cases
- Mark profile as "suspended" in Dolphin notes
- Retire the proxy session (don't reuse on new accounts)
- Review what activity triggered the ban

---

## Not Found Accounts

### What Happened

Account returns 404 error when visiting the profile page. Could be deleted, suspended, or never created.

### Diagnosis Steps

1. Visit reddit.com/u/{username} in an incognito browser
2. Check what message appears:
   - "Sorry, nobody on Reddit goes by that name" = Deleted or never existed
   - Page loads but empty = Possible shadowban
   - "This account has been suspended" = See Suspended section

### Common Causes

- Account deleted by user (intentional or accidental)
- Account never created despite Dolphin profile existing
- Hard suspension (account completely removed by Reddit)
- Username typo in Dolphin configuration

### Recovery Options

**If account was never created:**
1. Check Dolphin notes - is there a "need to create" flag?
2. Create the Reddit account using the profile
3. Follow warmup schedule from day 1

**If account was deleted/suspended:**
1. Retire the Dolphin profile (mark as inactive)
2. Create new profile with new proxy session
3. Create new Reddit account

---

## Shadowban Detection

### What is a Shadowban

Account appears active to the owner but all content is invisible to other users. Reddit doesn't notify you - you just think nobody is engaging.

### How to Check

**Method 1: Incognito test**
1. Open incognito/private browser window
2. Visit reddit.com/u/{username}
3. If 404 in incognito but works when logged in = Shadowbanned

**Method 2: r/ShadowBan**
1. Post anything in r/ShadowBan
2. Bot automatically checks and responds
3. Gives clear yes/no answer

**Method 3: Comments test**
1. Post a comment on any thread
2. Log out and view the thread
3. If comment invisible = Shadowbanned

### Common Causes

- Spam behavior (even unintentional)
- Posting same link to multiple subreddits
- Participating in vote manipulation
- Using flagged/datacenter IP addresses
- Rapid commenting patterns

### Recovery Options

1. File appeal at reddit.com/appeals
2. Explain situation briefly, be polite
3. Admit no wrongdoing you're aware of
4. Wait for response (can take days)

**If appeal approved:**
- Get confirmation email from Reddit
- After recovery: Use different proxy session
- Follow warmup schedule strictly

**If appeal denied:**
- Shadowban is permanent
- Retire the Dolphin profile
- Create new account with new proxy

---

## Content Filtering

### Symptoms

- Comments/posts don't appear publicly (but show when logged in)
- No upvotes or replies on content that should get engagement
- "Your post is awaiting approval" messages
- Post appears then disappears

### Causes

| Cause | Diagnosis | Solution |
|-------|-----------|----------|
| Low CQS | Check r/WhatismyCQS | Verify email, remove bio links |
| Automod | Check subreddit rules | Meet requirements |
| Karma gate | Check sidebar | Build karma elsewhere |
| Account age | Check sidebar | Wait for account age requirement |
| Spam filter | Post contains flagged terms | Rewrite without spam phrases |

### Low CQS Solutions

**Immediate fixes:**
1. Verify email (jumps from Lowest to Low immediately)
2. Remove ALL links from profile bio
3. Add profile avatar
4. Remove any promotional text from bio

**Long-term fixes:**
1. Diverse subreddit engagement
2. Positive karma ratio
3. Consistent activity over weeks
4. Avoid deleted content

### Automod/Karma Gate Solutions

1. Read subreddit rules thoroughly (sidebar, wiki)
2. Check for karma requirements ("minimum 100 karma to post")
3. Check for account age requirements ("accounts must be 7 days old")
4. Build karma in other subreddits first
5. Message moderators if you believe filter was incorrect

---

## Proxy-Related Bans

### Symptoms

- Multiple accounts banned around same time
- New accounts banned within hours of creation
- "Suspicious activity" messages on login
- Accounts flagged immediately after first post

### Common Causes

1. **Shared proxy session** - Multiple accounts on same proxy
2. **Datacenter IP detected** - Not residential proxy
3. **IP range flagged** - Previous abuse from same range
4. **Too many accounts per IP** - Even with different sessions

### Diagnosis

1. Run audit to check proxy configuration:
   ```bash
   cd /Users/johnasbury/Reachh/dolphin
   python audit_profiles.py
   ```

2. Look for these issues:
   - `shared_session` - Multiple profiles on one proxy
   - `rotating_proxy` - Port 823 on DataImpulse
   - `no_proxy` - Profile has no proxy configured
   - `no_geo` - Missing geo-targeting

3. Verify proxy is residential (not datacenter):
   - Check provider dashboard
   - Test IP at ipinfo.io - should say "ISP" not "Hosting"

### Solutions

1. **Each account needs unique sticky session**
   - DataImpulse: Different ports (10001, 10002, 10003...)
   - Decodo: Different session IDs in username

2. **Use residential proxies only**
   - Datacenter IPs are flagged by Reddit
   - Mobile proxies work but are expensive

3. **Spread accounts across IP ranges**
   - Don't put all accounts in same city
   - Vary states/regions

4. **See [PROXY_SETUP.md](./PROXY_SETUP.md) for configuration details**

---

## Prevention Checklist

### Before Creating New Account

- [ ] Unique sticky proxy session configured
- [ ] Proxy health check passes
- [ ] Timezone in Dolphin matches proxy location
- [ ] Browser fingerprint is unique
- [ ] No other accounts using same proxy session

### First Week (Days 1-7)

- [ ] Email verified by day 2
- [ ] Following lurker mode (3 comments max/day)
- [ ] No posts, no links
- [ ] CQS checked by day 7
- [ ] Activity within warmup limits

### Ongoing Maintenance

- [ ] Activity stays within tier limits
- [ ] Warmup alerts addressed promptly
- [ ] No promotional content before day 30
- [ ] Regular proxy health checks
- [ ] Tracker running daily

---

## When to Retire an Account

**Immediate retirement (don't attempt recovery):**
- Permanent suspension for vote manipulation
- Suspension for ban evasion
- Multiple suspensions on same account
- IP permanently flagged

**Attempt recovery first:**
- Shadowban (appeal may work)
- Content filtering (CQS may improve)
- Single temporary suspension

**Mark in Dolphin:**
1. Add note: "RETIRED - [reason] - [date]"
2. Change status to inactive
3. Don't delete profile (keeps audit history)
4. Retire the proxy session too

---

## Related Documentation

- [WARMUP_PLAYBOOK.md](./WARMUP_PLAYBOOK.md) - Warmup schedule to prevent bans
- [PROXY_SETUP.md](./PROXY_SETUP.md) - Proxy configuration
- [DOLPHIN_CONFIG.md](./DOLPHIN_CONFIG.md) - Profile setup

---

*For warmup limit enforcement, see `dolphin/warmup.py` and the tracker's warmup status columns.*
