// Email Templates for Reachh

interface TemplateData {
  [key: string]: string | number | string[] | undefined
}

function replaceVariables(template: string, data: TemplateData): string {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '')
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), stringValue)
  }
  return result
}

// ============================================
// TRANSACTIONAL EMAILS
// ============================================

export function welcomeEmail(data: { firstName: string; dashboardUrl: string }): { subject: string; html: string } {
  return {
    subject: "Welcome to Reachh — let's get you set up",
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Welcome to Reachh! You're now ready to get your brand mentioned in the Reddit threads that rank on Google.</p>

      <p><strong>Here's what to do next:</strong></p>

      <p><strong>1. Add your keywords</strong><br>
      Tell us what people search before buying your product.</p>

      <p><strong>2. Find opportunities</strong><br>
      We'll show you Reddit threads where your brand should be.</p>

      <p><strong>3. Request comments</strong><br>
      Pick threads and we'll post authentic, human-written comments.</p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Go to Dashboard →</a>
      </p>

      <p class="muted">Quick tip: Start with 3-5 high-intent keywords like "best [your product category]" or "[competitor] alternative".</p>

      <hr class="divider">

      <p class="muted">Questions? Just reply to this email.</p>
      <p>— The Reachh Team</p>
    `, data),
  }
}

export function passwordResetEmail(data: { firstName: string; resetUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Reset your password',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>We received a request to reset your password. Click the button below to create a new one:</p>

      <p style="margin: 24px 0;">
        <a href="{{resetUrl}}" class="btn">Reset Password →</a>
      </p>

      <p class="muted">This link expires in 1 hour.</p>
      <p class="muted">If you didn't request this, you can safely ignore this email. Your password won't change unless you click the link above.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

// ============================================
// ONBOARDING SEQUENCE
// ============================================

export function onboardingDay1Email(data: {
  firstName: string
  projectName: string
  dashboardUrl: string
  exampleSubreddit: string
  productCategory: string
}): { subject: string; html: string } {
  return {
    subject: 'Your first Reddit opportunity is waiting',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>You created your project "{{projectName}}" but haven't searched for opportunities yet.</p>

      <p>Right now, people are asking Reddit for recommendations in your space. These threads rank on Google for years.</p>

      <p><strong>Here's what a typical opportunity looks like:</strong></p>

      <div class="thread-card">
        <div class="thread-meta">r/{{exampleSubreddit}} · 234 upvotes · 45 comments</div>
        <div class="thread-title">"Best {{productCategory}} for beginners?"</div>
        <div class="thread-meta">Looking for recommendations. Budget is around $500...</div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Search for Opportunities →</a>
      </p>

      <p class="muted">Takes 30 seconds. Your keywords are already saved.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function onboardingDay2Email(data: {
  firstName: string
  productCategory: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: '97.5% of product searches show Reddit',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Quick stat: <strong>97.5% of product-related Google searches</strong> now show Reddit results.</p>

      <p>That means when someone searches "best {{productCategory}}", they're seeing Reddit threads — not your website.</p>

      <p>The brands winning right now are the ones getting mentioned in those threads.</p>

      <p><strong>One of our clients saw this:</strong></p>
      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">Reddit comments</span>
          <span class="stats-value">12</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Clicks to site</span>
          <span class="stats-value highlight">2,847</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">ROI in 90 days</span>
          <span class="stats-value highlight">340%</span>
        </div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Find Your Opportunities →</a>
      </p>

      <p class="muted">P.S. Reddit threads rank for 3-5+ years. Every comment is a long-term asset.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function onboardingDay4Email(data: {
  firstName: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'How Reachh comments actually work',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Wanted to explain exactly what happens when you request a comment:</p>

      <p><strong>1. You pick a thread</strong><br>
      Browse opportunities and add the best ones to your queue.</p>

      <p><strong>2. We write the comment</strong><br>
      Human writers (not AI) craft an authentic, helpful response that naturally mentions your brand.</p>

      <p><strong>3. We post from aged accounts</strong><br>
      Comments go up from real Reddit accounts with history. No bot patterns. No bans.</p>

      <p><strong>4. You track results</strong><br>
      See exactly where your brand is mentioned with direct links.</p>

      <p class="muted">Most clients start with 5 comments to test. Average cost: $10-15 per comment.</p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Browse Your Queue →</a>
      </p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function onboardingDay7Email(data: {
  firstName: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'How NordVPN got 340% ROI from Reddit',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Quick case study on what strategic Reddit marketing looks like:</p>

      <p><strong>THE CHALLENGE</strong><br>
      NordVPN was invisible in "best VPN" Reddit threads — their competitors were getting all the organic mentions.</p>

      <p><strong>THE APPROACH</strong></p>
      <ul style="color: #a1a1aa; margin: 16px 0;">
        <li>Identified 50 high-traffic threads asking for VPN recommendations</li>
        <li>Posted authentic, helpful comments from established accounts</li>
        <li>Focused on threads ranking on Google page 1</li>
      </ul>

      <p><strong>THE RESULTS</strong></p>
      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">ROI within 90 days</span>
          <span class="stats-value highlight">340%</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Comments still driving traffic</span>
          <span class="stats-value">2+ years later</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Account bans</span>
          <span class="stats-value" style="color: #22c55e;">Zero</span>
        </div>
      </div>

      <p>The same playbook works for any product people research on Reddit.</p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Start Your Campaign →</a>
      </p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function onboardingDay14Email(data: {
  firstName: string
  senderName: string
}): { subject: string; html: string } {
  return {
    subject: 'Quick question about Reachh',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>I noticed you signed up for Reachh a couple weeks ago but haven't placed an order yet.</p>

      <p>Totally fine — but I'm curious: what's holding you back?</p>

      <p style="color: #fafafa;">
        <strong>A)</strong> Not sure if Reddit marketing works for my product<br>
        <strong>B)</strong> Pricing is too high<br>
        <strong>C)</strong> Don't have time to review opportunities<br>
        <strong>D)</strong> Something else
      </p>

      <p>Just reply with a letter (or tell me more). I read every response.</p>

      <p>If there's something we can do better, I want to know.</p>

      <p>— {{senderName}}<br>
      <span class="muted">Founder, Reachh</span></p>
    `, data),
  }
}

// ============================================
// ACTIVITY EMAILS
// ============================================

export function commentPostedEmail(data: {
  firstName: string
  threadTitle: string
  subreddit: string
  threadUrl: string
  commentUrl: string
  threadUpvotes: number
  creditsRemaining: number
}): { subject: string; html: string } {
  return {
    subject: `✓ Your comment is live on ${data.subreddit}`,
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Good news — your comment is now live!</p>

      <div class="thread-card">
        <span class="success-badge">✓ Posted</span>
        <div class="thread-title" style="margin-top: 12px;">{{threadTitle}}</div>
        <div class="thread-meta">r/{{subreddit}} · {{threadUpvotes}} upvotes</div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{threadUrl}}" class="btn">View Thread →</a>
        <a href="{{commentUrl}}" class="btn btn-secondary" style="margin-left: 8px;">View Comment →</a>
      </p>

      <p class="muted">Remaining credits: <strong>{{creditsRemaining}}</strong></p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function creditsLowEmail(data: {
  firstName: string
  queueCount: number
  creditsUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'You have 1 credit remaining',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Quick heads up — you have <strong>1 comment credit</strong> remaining.</p>

      <p>Your current queue has <strong>{{queueCount}} opportunities</strong> waiting. To keep your momentum going, grab more credits:</p>

      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">5 credits</span>
          <span class="stats-value">$75 <span class="muted">($15 each)</span></span>
        </div>
        <div class="stats-row">
          <span class="stats-label">15 credits</span>
          <span class="stats-value">$180 <span class="muted">($12 each)</span></span>
        </div>
        <div class="stats-row">
          <span class="stats-label">30 credits</span>
          <span class="stats-value">$300 <span class="muted">($10 each)</span></span>
        </div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{creditsUrl}}" class="btn">Buy Credits →</a>
      </p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function creditsEmptyEmail(data: {
  firstName: string
  totalComments: number
  totalSubreddits: number
  creditsUrl: string
}): { subject: string; html: string } {
  return {
    subject: "You're out of credits",
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>You've used all your comment credits.</p>

      <p>So far, you've posted <strong>{{totalComments}} comments</strong> across <strong>{{totalSubreddits}} subreddits</strong>. Those threads are now working for you 24/7.</p>

      <p><strong>Ready to keep going?</strong></p>

      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">5 credits</span>
          <span class="stats-value">$75 <span class="muted">($15/comment)</span></span>
        </div>
        <div class="stats-row">
          <span class="stats-label">15 credits ← Most popular</span>
          <span class="stats-value highlight">$180 <span class="muted">($12/comment)</span></span>
        </div>
        <div class="stats-row">
          <span class="stats-label">30 credits</span>
          <span class="stats-value">$300 <span class="muted">($10/comment)</span></span>
        </div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{creditsUrl}}" class="btn">Buy More Credits →</a>
      </p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function weeklySummaryEmail(data: {
  firstName: string
  projectName: string
  commentsPosted: number
  queueCount: number
  creditsRemaining: number
  totalComments: number
  totalSubreddits: number
  newOpportunities?: number
  topOpportunityUpvotes?: number
  dashboardUrl: string
}): { subject: string; html: string } {
  let opportunitiesSection = ''
  if (data.newOpportunities && data.newOpportunities > 0) {
    opportunitiesSection = `
      <hr class="divider">
      <p><strong>NEW THIS WEEK</strong></p>
      <p>We found <strong>${data.newOpportunities} new threads</strong> matching your keywords. The top one has <strong>${data.topOpportunityUpvotes} upvotes</strong>.</p>
      <p style="margin: 16px 0;">
        <a href="${data.dashboardUrl}" class="btn">View Opportunities →</a>
      </p>
    `
  }

  return {
    subject: `Your Reachh week: ${data.commentsPosted} comments posted`,
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Here's your weekly summary for <strong>{{projectName}}</strong>:</p>

      <div class="stats-box">
        <p style="margin: 0 0 12px 0; color: #52525b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">THIS WEEK</p>
        <div class="stats-row">
          <span class="stats-label">Comments posted</span>
          <span class="stats-value">{{commentsPosted}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Threads in queue</span>
          <span class="stats-value">{{queueCount}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Credits remaining</span>
          <span class="stats-value">{{creditsRemaining}}</span>
        </div>
      </div>

      <div class="stats-box">
        <p style="margin: 0 0 12px 0; color: #52525b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">ALL TIME</p>
        <div class="stats-row">
          <span class="stats-label">Total comments</span>
          <span class="stats-value highlight">{{totalComments}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Subreddits reached</span>
          <span class="stats-value">{{totalSubreddits}}</span>
        </div>
      </div>

      ${opportunitiesSection}

      <p>— The Reachh Team</p>
    `, data),
  }
}

// ============================================
// LIFECYCLE EMAILS
// ============================================

export function reengagement30DaysEmail(data: {
  firstName: string
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: `{{firstName}}, your competitors are on Reddit`,
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>It's been a month since you logged into Reachh.</p>

      <p>In that time:</p>
      <ul style="color: #a1a1aa; margin: 16px 0;">
        <li>~4,000 new Reddit threads were created asking for product recommendations</li>
        <li>Your competitors may have been mentioned in dozens of them</li>
        <li>Those threads are now ranking on Google</li>
      </ul>

      <p><strong>Reddit doesn't sleep. Neither does your competition.</strong></p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">See What You're Missing →</a>
      </p>

      <p class="muted">Your keywords are still saved. One search takes 30 seconds.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function reengagement60DaysEmail(data: {
  firstName: string
  projectName: string
  dashboardUrl: string
  senderName: string
}): { subject: string; html: string } {
  return {
    subject: 'Should we delete your Reachh account?',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>You haven't logged into Reachh in 2 months.</p>

      <p>I wanted to check in:</p>

      <p><strong>1.</strong> If Reddit marketing isn't right for your business, no worries. Just let me know and I'll remove your account.</p>

      <p><strong>2.</strong> If you're just busy, your project "{{projectName}}" and all your data is still here whenever you're ready.</p>

      <p><strong>3.</strong> If something about Reachh didn't work for you, I'd genuinely love to hear what. Just reply to this email.</p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Log Back In →</a>
      </p>

      <p>— {{senderName}}<br>
      <span class="muted">Founder, Reachh</span></p>
    `, data),
  }
}

export function winback90DaysEmail(data: {
  firstName: string
  dashboardUrl: string
  senderName: string
}): { subject: string; html: string } {
  return {
    subject: '2 free comments to try Reachh again',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>It's been a while. I'd love to get you back.</p>

      <p>Here's the deal: I've added <strong>2 free comment credits</strong> to your account. No strings attached.</p>

      <p>Use them to:</p>
      <ul style="color: #a1a1aa; margin: 16px 0;">
        <li>Test a new product you're launching</li>
        <li>Target a subreddit you've been eyeing</li>
        <li>See if Reddit marketing fits your current strategy</li>
      </ul>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Claim Your 2 Free Credits →</a>
      </p>

      <p class="muted">They're yours for the next 30 days.</p>

      <p>— {{senderName}}<br>
      <span class="muted">Founder, Reachh</span></p>
    `, data),
  }
}

// ============================================
// PURCHASE EMAILS
// ============================================

export function purchaseConfirmationEmail(data: {
  firstName: string
  orderId: string
  purchaseDate: string
  creditsPurchased: number
  amount: number
  creditsTotal: number
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Receipt for your Reachh purchase',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>Thanks for your purchase! Here are your details:</p>

      <div class="stats-box">
        <p style="margin: 0 0 4px 0; color: #52525b; font-size: 12px;">ORDER #{{orderId}}</p>
        <p style="margin: 0 0 16px 0; color: #52525b; font-size: 12px;">{{purchaseDate}}</p>
        <div class="stats-row">
          <span class="stats-label">{{creditsPurchased}} comment credits</span>
          <span class="stats-value">\${{amount}}</span>
        </div>
        <hr class="divider" style="margin: 12px 0;">
        <div class="stats-row">
          <span class="stats-label" style="color: #fafafa; font-weight: 600;">TOTAL</span>
          <span class="stats-value">\${{amount}}</span>
        </div>
      </div>

      <p>Your new credit balance: <strong class="highlight">{{creditsTotal}}</strong></p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Go to Dashboard →</a>
      </p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function subscriptionConfirmationEmail(data: {
  firstName: string
  planName: string
  amount: number
  commentsPerMonth: number
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Welcome to Reachh Pro!',
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>You're now a <strong class="highlight">Reachh Pro</strong> member! 🎉</p>

      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">Plan</span>
          <span class="stats-value">{{planName}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Monthly comments</span>
          <span class="stats-value">{{commentsPerMonth}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Monthly price</span>
          <span class="stats-value">\${{amount}}</span>
        </div>
      </div>

      <p>Your subscription is now active. Start finding Reddit opportunities and adding them to your comment list.</p>

      <p style="margin: 24px 0;">
        <a href="{{dashboardUrl}}" class="btn">Go to Dashboard →</a>
      </p>

      <p class="muted">You can manage your subscription anytime from the dashboard.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

export function paymentFailedEmail(data: {
  firstName: string
  amount: number
  checkoutUrl: string
}): { subject: string; html: string } {
  return {
    subject: "Your payment didn't go through",
    html: replaceVariables(`
      <h1>Hey {{firstName}},</h1>
      <p>We tried to process your payment of <strong>\${{amount}}</strong> but it didn't go through.</p>

      <p>This usually happens when:</p>
      <ul style="color: #a1a1aa; margin: 16px 0;">
        <li>Card expired or has insufficient funds</li>
        <li>Bank declined the transaction</li>
        <li>Billing address doesn't match</li>
      </ul>

      <p style="margin: 24px 0;">
        <a href="{{checkoutUrl}}" class="btn">Try Again →</a>
      </p>

      <p class="muted">If you keep having issues, reply to this email and we'll help sort it out.</p>

      <p>— The Reachh Team</p>
    `, data),
  }
}

// ============================================
// ADMIN/INTERNAL EMAILS
// ============================================

export function newUserSignupEmail(data: {
  email: string
  fullName: string
  signupDate: string
  projectName: string
  keywords: string[]
  adminUrl: string
}): { subject: string; html: string } {
  return {
    subject: `New signup: ${data.email}`,
    html: replaceVariables(`
      <h1>NEW USER SIGNUP</h1>

      <div class="stats-box">
        <div class="stats-row">
          <span class="stats-label">Email</span>
          <span class="stats-value">{{email}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Name</span>
          <span class="stats-value">{{fullName}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Signed up</span>
          <span class="stats-value">{{signupDate}}</span>
        </div>
        <hr class="divider">
        <div class="stats-row">
          <span class="stats-label">Project</span>
          <span class="stats-value">{{projectName}}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Keywords</span>
          <span class="stats-value">${data.keywords.join(', ')}</span>
        </div>
      </div>

      <p style="margin: 24px 0;">
        <a href="{{adminUrl}}" class="btn">View in Admin →</a>
      </p>
    `, data),
  }
}
