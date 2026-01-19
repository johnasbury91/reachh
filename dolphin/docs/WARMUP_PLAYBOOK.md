# Reddit Account Warmup Playbook

This guide documents the day-by-day warmup process for new Reddit accounts to avoid anti-spam detection and build Contributor Quality Score (CQS).

## Why Warmup Matters

Reddit aggressively filters new accounts. Without proper warmup:
- Posts are silently hidden (shadowban-like behavior)
- Low CQS causes content to be invisible
- Rapid activity triggers account suspension
- Spam filters catch promotional content

**Goal:** Graduate accounts from "untrusted new user" to "established contributor" over 30 days.

---

## Quick Reference

| Tier | Days | Comments/Day | Posts/Day | Target Karma |
|------|------|--------------|-----------|--------------|
| New | 1-7 | 3 | 0 | 15 |
| Warming | 8-14 | 5 | 1 | 100 |
| Ready | 15-30 | 8 | 2 | 250 |
| Established | 30+ | 15 | 3 | 500 |

These limits are enforced by `warmup.py` - the tracker alerts when accounts approach 80% of their daily limit.

---

## Day-by-Day Schedule

### Days 1-7: Lurker Mode (Tier: New)

**Goal:** Build trust, establish cookies, verify email.

**Session length:** 15-20 minutes

**Daily actions:**
- Browse front page and subscribed subreddits
- Upvote 5-10 posts (natural browsing pattern)
- Subscribe to 5-10 relevant subreddits
- 0-3 short comments (casual, conversational)
- NO posts
- NO external links

**Mandatory:**
- Email verification by day 2 (critical for CQS)
- CQS check by day 7 (post to r/WhatismyCQS)

**Comment examples for day 1-7:**
- "Thanks for sharing this!"
- "That's a great point, hadn't thought of it that way"
- "Same experience here. The [topic] really helped."

**What to avoid:**
- Posting anything (wait until day 8)
- Links of any kind (internal or external)
- Long detailed comments (too much effort looks suspicious)
- Commenting on multiple posts rapidly

---

### Days 8-14: Light Engagement (Tier: Warming)

**Goal:** Build comment karma, establish posting history.

**Session length:** 20-30 minutes

**Daily actions:**
- Continue browsing patterns
- 3-5 thoughtful comments
- 1-2 text posts total across the week (not per day)
- NO external links still

**Post guidelines:**
- Text-only posts (no links, no images)
- Questions work well ("What's your experience with...")
- Observations ("I noticed that..." or "TIL...")
- Post to beginner-friendly subreddits first

**CQS checkpoint:**
- Post to r/WhatismyCQS by day 10
- Target: At least "Low" CQS (email verified helps)
- If "Lowest": Check profile for red flags

---

### Days 15-30: Building Consistency (Tier: Ready)

**Goal:** Reach posting requirements for most subreddits.

**Session length:** 20-30 minutes

**Daily actions:**
- 5-8 comments per day
- 2-4 posts per week
- Can include internal Reddit links (r/subreddit, u/user)
- Minimal external links (only when highly relevant)

**Focus areas:**
- Join karma-gated subreddits you'll need later
- Build reputation in target niches
- Diversify subreddit activity
- Maintain positive karma ratio

**Link guidelines:**
- Internal links OK (linking to other Reddit posts)
- External links: 1 per week max, must add value
- Never link to your own sites/products yet

---

### Days 30+: Established

**Goal:** Normal activity, can begin light promotion.

**Daily actions:**
- 10-15 comments per day max
- 3-5 posts per week
- Follow 80/20 rule (8 non-promotional : 1 promotional max)

**Promotional content guidelines:**
- Never more than 10% of total activity
- Must be genuinely helpful, not just advertising
- Disclose affiliations when relevant
- Respond to comments on your promotional posts

---

## Activity Guidelines

### What Makes a Good Comment

**Structure:**
- Reply to existing discussions (don't start new threads via comments)
- Add value: experience, insight, humor, clarification
- 1-3 sentences typical (match subreddit norms)

**Good patterns:**
- Answer questions with personal experience
- Add a relevant detail the post missed
- Agree/disagree with brief reasoning
- Ask a follow-up question

**Avoid:**
- Copy-paste templates (triggers spam filters)
- Generic "Nice!" or "Thanks!" (low effort)
- Long essays on simple questions (over-investment)
- Same comment structure repeatedly

### What Makes a Good Post

**Structure:**
- Clear title that invites discussion
- Body text that provides context
- Question or call for opinions

**Good post types:**
- Questions seeking advice
- Sharing interesting finds (no links initially)
- Discussion starters
- Personal experiences

**Avoid:**
- Low-effort image posts
- Link posts (until established)
- Self-promotional content (until day 30+)
- Controversial/political content

---

## Subreddit Selection

### Good Starter Subreddits

**Criteria:**
- Large, active communities (>100k subscribers)
- Discussion-based (not just memes/images)
- Friendly to new users
- Low karma requirements

**Examples:**
- r/AskReddit (great for comments)
- r/todayilearned (comment on interesting facts)
- r/explainlikeimfive (answer questions you know)
- r/CasualConversation (low-stakes chat)
- r/NoStupidQuestions (helpful community)

### Subreddits to Avoid Initially

**Criteria:**
- Heavily moderated
- High karma gates
- Anti-spam sensitive
- Your eventual promotional targets

**Avoid early:**
- r/science, r/history (strict moderation)
- r/news, r/worldnews (spam-sensitive)
- Political subreddits (controversial, moderated)
- Your target promotional subreddits (save for later)

### Building to Target Subreddits

1. Research your target subreddit's requirements
2. Check karma and age requirements in sidebar
3. Build to those thresholds in safer subreddits
4. Enter target subreddit as established contributor

---

## CQS (Contributor Quality Score)

### What is CQS

Reddit's internal trust score that affects post visibility. Not publicly visible, but impacts whether your content gets filtered.

### CQS Tiers

| Tier | Meaning | Impact |
|------|---------|--------|
| Lowest | Untrusted | Heavy filtering, posts often invisible |
| Low | Some trust | Occasional filtering |
| Moderate | Normal | Standard visibility (minimum target) |
| High | Trusted | Full visibility |
| Highest | Very trusted | Priority visibility |

### How to Check CQS

Post "check" to r/WhatismyCQS - you'll get an automated response with your tier.

### How to Improve CQS

**Quick wins:**
1. Verify email (Lowest -> Low immediately)
2. Remove links from profile bio
3. Add profile avatar

**Long-term:**
4. Diverse subreddit engagement (not just one community)
5. Positive upvote ratios on posts
6. Consistent activity over time
7. Avoid spam reports

**What hurts CQS:**
- Links in profile bio (especially promotional)
- Spam reports against your content
- Rapid posting/commenting
- Deleted content
- Using known spam phrases

---

## Tracker Integration

The Dolphin tracker monitors warmup status automatically.

### Columns in Google Sheet

| Column | Meaning |
|--------|---------|
| warmup_tier | Current tier (new/warming/ready/established) |
| limit_status | OK, WARNING (80%+), or EXCEEDED |
| comments_today | Number of comments today |
| posts_today | Number of posts today |

### How Alerts Work

1. **80% threshold:** WARNING alert fires (time to slow down)
2. **100% threshold:** EXCEEDED alert fires (stop immediately)
3. Alerts appear in Slack and tracker summary

### Responding to Alerts

**WARNING:**
- Slow down activity for the day
- Check what tier the account is in
- Verify you're following the schedule

**EXCEEDED:**
- Stop all activity on that account immediately
- Wait until next day for count reset
- Review what caused the over-activity

---

## Common Mistakes

### 1. Starting Too Fast

**Mistake:** Posting comments or content on day 1.

**Why it's bad:** Reddit expects new accounts to lurk first. Immediate activity is a spam signal.

**Fix:** Wait 24-48 hours before first comment. Browse and upvote first.

### 2. Ignoring Email Verification

**Mistake:** Not verifying email within first 48 hours.

**Why it's bad:** Unverified accounts are stuck at "Lowest" CQS - content is invisible.

**Fix:** Verify email immediately during account creation or by day 2 at latest.

### 3. Using Consistent Timing

**Mistake:** Logging in at exactly the same time every day.

**Why it's bad:** Bots have consistent schedules. Humans don't.

**Fix:** Vary session times by 1-2 hours. Some days skip entirely.

### 4. Copy-Paste Comments

**Mistake:** Using the same comment text across posts.

**Why it's bad:** Spam filters detect duplicate content.

**Fix:** Write unique comments for each interaction. Vary structure and length.

### 5. Promotional Links Early

**Mistake:** Posting external links in first 2-3 weeks.

**Why it's bad:** New accounts with external links are heavily filtered.

**Fix:** Wait until day 30+ for any promotional content. Wait until day 15+ for any external links.

### 6. Over-activity in One Subreddit

**Mistake:** Posting 10 comments in one subreddit in one session.

**Why it's bad:** Concentrated activity looks like brigading or spam.

**Fix:** Spread activity across 3-5 different subreddits per session.

### 7. Ignoring Warmup Alerts

**Mistake:** Continuing to post after WARNING alert.

**Why it's bad:** Exceeding limits increases ban risk significantly.

**Fix:** Treat WARNING as stop signal. Check tracker before posting.

---

## Warmup Completion Checklist

Before considering an account "warmed up":

- [ ] Account is 30+ days old
- [ ] Email verified
- [ ] CQS is "Moderate" or higher
- [ ] 250+ karma
- [ ] No suspensions or restrictions
- [ ] Activity across 10+ subreddits
- [ ] Consistent history of posts and comments
- [ ] No warmup alerts in past 2 weeks

---

## Related Documentation

- [PROXY_SETUP.md](./PROXY_SETUP.md) - Proxy configuration for account safety
- [DOLPHIN_CONFIG.md](./DOLPHIN_CONFIG.md) - Profile setup and verification
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Ban diagnosis and recovery

---

*These limits match `dolphin/warmup.py` WARMUP_TIERS: new (3 comments/0 posts), warming (5/1), ready (8/2), established (15/3).*
