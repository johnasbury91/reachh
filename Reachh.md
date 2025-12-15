# reachh.com — Reddit Marketing Agency Website

## Project Overview

Build a single-page marketing website for reachh.com, a Reddit marketing agency targeting growing tech companies. The site needs to **educate through visuals**, not walls of text. Cool illustrations and subtle animations explain the value proposition to people who don't understand Reddit marketing.

**Core message:** Reddit content flows into Google rankings AND AI training data. This is both an opportunity (get recommended) and a risk (negative threads become AI's "truth" about you). We help brands control that narrative.

---

## Design Philosophy

### References
- **artifacts.is** — Small, elegant typography. Numbered lists. Extreme restraint. Whitespace as a feature.
- **floqer.com** — Clean agency SaaS aesthetic, form-forward
- **linear.app** — Subtle animations, dark accents, premium feel
- **vercel.com** — Technical credibility, beautiful diagrams

### Typography
- Small body text: 12-14px
- Generous letter-spacing
- Clean sans-serif (Inter, Geist, or similar)
- Sparse copy—let visuals carry the message
- Headers don't need to be huge

### Colors
- White/off-white background
- Near-black text (#0a0a0a or similar)
- One subtle accent (consider muted orange or avoid Reddit orange entirely—keep it sophisticated)
- Dark sections for contrast/emphasis

### Spacing
- Generous whitespace everywhere
- One idea per viewport
- Let it breathe

### What to Avoid
- Gradients
- Stock photos
- Testimonial carousels
- "Trusted by 500+ companies" badges
- Marketing fluff copy
- Walls of text explaining things

---

## Site Structure

### 1. Hero

**Concept:** Intriguing, slightly ominous, creates curiosity

**Copy approach (sparse):**
```
AI is already talking about you.

Reddit trains Google. ChatGPT. Perplexity.
Every thread. Every comment. Every recommendation.

What are they saying?

[Book a call]
```

**Animation idea:** Abstract, subtle. Perhaps:
- Flowing particles/lines connecting nodes
- Or a typing effect revealing an AI response
- Keep it geometric and minimal, not literal

---

### 2. The Opportunity + The Risk (Two Panels)

**Concept:** Show the double-edged sword visually. Same diagram, two outcomes.

**Left panel (light/positive):**
- Animated diagram: Your content → flows to Google, AI, brand searches
- Result: "You're the answer"
- Green/positive accent

**Right panel (dark/warning):**
- Same diagram but: Negative thread → spreads everywhere
- Result: "Or someone else is"
- Red/muted accent

**Single line beneath:** *"This works both ways."*

No paragraphs. The visual IS the explanation.

---

### 3. The Flywheel — "One Post, Five Channels"

**Concept:** Animated diagram showing how one piece of Reddit activity compounds across channels.

**Visual:** Center node (Reddit post) with animated lines branching to:
1. **Google SERP** — "Ranks for 'best [product] reddit'"
2. **AI Overview** — "Appears in Google's AI answers"
3. **ChatGPT/Perplexity** — "Cited in AI recommendations"  
4. **Reddit Search** — "Top result in subreddit"
5. **Brand Search** — "People Google you directly"

Lines animate in sequence (1→2→3→4→5), showing the cascade effect.

**Tiny caption:** *"Evergreen. Compounding. Automated word-of-mouth."*

---

### 4. User Journey — "How Sarah Finds You"

**Concept:** Walk through a real scenario with minimal, elegant illustration.

**Horizontal scroll or vertical sequence:**

```
1. Sarah wants a password manager
   [illustration: search bar]

2. She Googles "best password manager reddit"
   → Your thread is #1
   [illustration: SERP with highlight]

3. She asks ChatGPT for recommendations
   → It mentions your brand
   [illustration: chat interface]

4. She browses r/cybersecurity
   → Sees you mentioned organically
   [illustration: reddit thread snippet]

5. She Googles your brand directly
   → Converts
   [illustration: your landing page]
```

**Caption:** *"That's not luck. That's strategy."*

Each step is a small illustration with one line. No paragraphs.

---

### 5. What We Actually Do

**Concept:** Simple numbered list (artifacts.is style)

```
1  Subreddit research & mapping
   Find where your customers ask for recommendations

2  Authentic engagement
   Real conversations, not spam. No fake accounts.

3  Content that ranks
   Posts optimized for Reddit AND Google

4  LLM optimization  
   Get cited when AI answers questions

5  Reputation monitoring
   Know what's being said. Respond before it spreads.

6  Reddit Ads
   Targeted campaigns in high-intent communities
```

Small type. Generous spacing between items. Maybe subtle number styling.

---

### 6. Why Reddit? Why Now?

**Concept:** Stats that create urgency. Animated counting numbers on scroll.

**Visual:** Minimal stat blocks, small type, big numbers

```
$60M
Google-Reddit deal for AI training data

97.5%
of Google product searches show Reddit results

+191%  
Reddit's search visibility growth (2024)

#1
Most-cited source in LLM responses

600M+
Monthly Google searches end on Reddit
```

**Single line:** *"Reddit is where AI learns what to recommend."*

---

### 7. Companies We Work With

**Concept:** Logo strip/grid. Understated. Establishes credibility.

**Heading:** "We work with ambitious tech companies" (or similar, keep it simple)

**Logos via logo.dev:**
- Ledger
- Trezor
- Binance
- Koinly
- HubSpot
- Dreamways
- Cloudways
- Hostinger
- NordVPN
- Surfshark
- ProtonVPN

**Layout:** Single row with subtle scroll, or 2-row grid. Grayscale or muted, color on hover.

---

### 8. CTA + Contact

**Concept:** Clean, single focus. No competing options.

**Option A — Calendly embed:**
```
Ready to own your narrative?

[Embedded Calendly scheduler]
```

**Option B — Simple form:**
```
Let's talk.

[Name]
[Email]  
[Company]
[What are you looking to achieve?]

[Send]
```

Keep it minimal. One path forward.

---

### 9. Footer

Minimal. Just:
- reachh.com
- Email address
- Maybe LinkedIn
- © 2025

No massive footer with 40 links.

---

## Technical Specs

### Stack
- React (single page, can use Vite)
- Tailwind CSS
- Framer Motion for animations
- Intersection Observer for scroll-triggered animations

### Animations
- Subtle, purposeful, not distracting
- Fade-in on scroll for sections
- Number count-up for stats
- Diagram lines drawing in sequence
- Smooth hover states
- Keep it under 60fps, performant

### Integrations
- **Calendly:** Embed inline or popup
- **logo.dev:** For company logos (use their CDN/API)
- **Form:** Formspree, Netlify Forms, or simple mailto for MVP

### Responsive
- Mobile-first
- Single column on mobile
- Diagrams simplify/stack on small screens
- Touch-friendly tap targets

---

## Illustrations Style Guide

**Aesthetic:**
- Line-based, geometric
- Minimal color (mostly monochrome with one accent)
- Abstract representations, not literal
- Think: technical diagrams meet editorial illustration
- Clean, vector-based

**What to illustrate:**
- The flywheel/ecosystem diagram (most important)
- Search result mockups (stylized, not screenshots)
- Chat interface mockups (AI responses)
- Reddit thread snippets (abstracted)
- Connection lines, nodes, flow

**What NOT to do:**
- 3D renders
- Illustrated people/characters
- Busy, detailed scenes
- Stock illustration style
- Gradients and glows

---

## Differentiation (for copy reference)

**What competitors say:**
- "We understand Reddit culture"
- "Authentic engagement"
- "No spam"

**Our angle (subtle, don't over-explain):**
- We built tools that analyze Reddit sentiment at scale
- We understand how Reddit data flows into AI training
- We optimize for Google SERP + AI citations, not just Reddit karma
- Data-driven, not just "we get Reddit vibes"

Don't belabor this. Let the sophistication of the site speak to our credibility.

---

## Build Order

1. **Start with layout/typography system** — Get the small type, spacing, and overall feel right first
2. **Hero section** — Nail the first impression
3. **One key diagram** — The flywheel animation (this is the centerpiece)
4. **Build out remaining sections** — Keep each focused
5. **Add micro-animations** — Polish pass
6. **Responsive pass** — Make sure mobile works
7. **Integrations** — Calendly, form, logos

---

## Final Notes

- **Less is more.** When in doubt, remove copy.
- **Visuals explain.** If you need a paragraph, you need a better illustration.
- **Sophistication = restraint.** Premium feel comes from what you don't do.
- **One idea per scroll.** Don't cram multiple concepts.
- **The diagrams are the product.** Spend time making them beautiful and clear.

---

*Build incrementally. Show hero + one diagram first before continuing.*
