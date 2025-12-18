import { sendEmail } from './email'
import * as templates from './email-templates'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.reachh.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@reachh.com'
const SENDER_NAME = 'John' // Founder name for personal emails

interface User {
  id: string
  email: string
  full_name?: string
}

interface Project {
  id: string
  name: string
  keywords: string[]
}

interface Opportunity {
  id: string
  title: string
  subreddit: string
  url: string
  comment_url?: string
  score?: number
}

// Helper to get first name
function getFirstName(fullName?: string): string {
  return fullName?.split(' ')[0] || 'there'
}

// Helper to log email sent
async function logEmailSent(userId: string, emailType: string, metadata?: object) {
  try {
    const supabase = await createClient()
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error('Failed to log email:', error)
  }
}

// ============================================
// TRANSACTIONAL TRIGGERS
// ============================================

export async function sendWelcomeEmail(user: User) {
  const { subject, html } = templates.welcomeEmail({
    firstName: getFirstName(user.full_name),
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'welcome')

  // Also notify admin of new signup
  // await notifyAdminNewUser(user) // Uncomment when ready
}

export async function sendPasswordResetEmail(user: User, resetUrl: string) {
  const { subject, html } = templates.passwordResetEmail({
    firstName: getFirstName(user.full_name),
    resetUrl,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'password_reset')
}

// ============================================
// ACTIVITY TRIGGERS
// ============================================

export async function sendCommentPostedEmail(
  user: User,
  opportunity: Opportunity,
  creditsRemaining: number
) {
  const { subject, html } = templates.commentPostedEmail({
    firstName: getFirstName(user.full_name),
    threadTitle: opportunity.title,
    subreddit: opportunity.subreddit,
    threadUrl: opportunity.url,
    commentUrl: opportunity.comment_url || opportunity.url,
    threadUpvotes: opportunity.score || 0,
    creditsRemaining,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'comment_posted', { opportunity_id: opportunity.id })
}

export async function sendCreditsLowEmail(user: User, queueCount: number) {
  const { subject, html } = templates.creditsLowEmail({
    firstName: getFirstName(user.full_name),
    queueCount,
    creditsUrl: `${APP_URL}/settings#credits`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'credits_low')
}

export async function sendCreditsEmptyEmail(
  user: User,
  totalComments: number,
  totalSubreddits: number
) {
  const { subject, html } = templates.creditsEmptyEmail({
    firstName: getFirstName(user.full_name),
    totalComments,
    totalSubreddits,
    creditsUrl: `${APP_URL}/settings#credits`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'credits_empty')
}

export async function sendWeeklySummaryEmail(
  user: User,
  project: Project,
  stats: {
    commentsPosted: number
    queueCount: number
    creditsRemaining: number
    totalComments: number
    totalSubreddits: number
    newOpportunities?: number
    topOpportunityUpvotes?: number
  }
) {
  // Don't send if no activity
  if (stats.commentsPosted === 0 && stats.queueCount === 0) {
    return
  }

  const { subject, html } = templates.weeklySummaryEmail({
    firstName: getFirstName(user.full_name),
    projectName: project.name,
    ...stats,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'weekly_summary')
}

// ============================================
// ONBOARDING TRIGGERS
// ============================================

export async function sendOnboardingDay1Email(user: User, project: Project) {
  // Extract category from keywords for example
  const productCategory = project.keywords[0]?.split(' ').pop() || 'product'
  const exampleSubreddit = 'AskReddit' // Could be smarter based on project

  const { subject, html } = templates.onboardingDay1Email({
    firstName: getFirstName(user.full_name),
    projectName: project.name,
    dashboardUrl: `${APP_URL}/dashboard`,
    exampleSubreddit,
    productCategory,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'onboarding_day_1')
}

export async function sendOnboardingDay2Email(user: User, project: Project) {
  const productCategory = project.keywords[0]?.split(' ').pop() || 'product'

  const { subject, html } = templates.onboardingDay2Email({
    firstName: getFirstName(user.full_name),
    productCategory,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'onboarding_day_2')
}

export async function sendOnboardingDay4Email(user: User) {
  const { subject, html } = templates.onboardingDay4Email({
    firstName: getFirstName(user.full_name),
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'onboarding_day_4')
}

export async function sendOnboardingDay7Email(user: User) {
  const { subject, html } = templates.onboardingDay7Email({
    firstName: getFirstName(user.full_name),
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'onboarding_day_7')
}

export async function sendOnboardingDay14Email(user: User) {
  const { subject, html } = templates.onboardingDay14Email({
    firstName: getFirstName(user.full_name),
    senderName: SENDER_NAME,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'onboarding_day_14')
}

// ============================================
// LIFECYCLE TRIGGERS
// ============================================

export async function sendReengagement30DaysEmail(user: User) {
  const { subject, html } = templates.reengagement30DaysEmail({
    firstName: getFirstName(user.full_name),
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'reengagement_30d')
}

export async function sendReengagement60DaysEmail(user: User, project: Project) {
  const { subject, html } = templates.reengagement60DaysEmail({
    firstName: getFirstName(user.full_name),
    projectName: project.name,
    dashboardUrl: `${APP_URL}/dashboard`,
    senderName: SENDER_NAME,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'reengagement_60d')
}

export async function sendWinback90DaysEmail(user: User) {
  const { subject, html } = templates.winback90DaysEmail({
    firstName: getFirstName(user.full_name),
    dashboardUrl: `${APP_URL}/dashboard`,
    senderName: SENDER_NAME,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'winback_90d')
}

// ============================================
// PURCHASE TRIGGERS
// ============================================

export async function sendPurchaseConfirmationEmail(
  user: User,
  purchase: {
    id: string
    credits: number
    amount: number
  },
  creditsTotal: number
) {
  const { subject, html } = templates.purchaseConfirmationEmail({
    firstName: getFirstName(user.full_name),
    orderId: purchase.id,
    purchaseDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    creditsPurchased: purchase.credits,
    amount: purchase.amount,
    creditsTotal,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'purchase_confirmation', { order_id: purchase.id })
}

export async function sendPaymentFailedEmail(user: User, amount: number) {
  const { subject, html } = templates.paymentFailedEmail({
    firstName: getFirstName(user.full_name),
    amount,
    checkoutUrl: `${APP_URL}/settings#credits`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'payment_failed')
}

export async function sendSubscriptionConfirmationEmail(
  user: User,
  planName: string,
  amount: number,
  commentsPerMonth: number
) {
  const { subject, html } = templates.subscriptionConfirmationEmail({
    firstName: getFirstName(user.full_name),
    planName,
    amount,
    commentsPerMonth,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({ to: user.email, subject, html })
  await logEmailSent(user.id, 'subscription_confirmation')
}

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

export async function notifyAdminNewUser(user: User, project?: Project) {
  const { subject, html } = templates.newUserSignupEmail({
    email: user.email,
    fullName: user.full_name || 'Unknown',
    signupDate: new Date().toLocaleString(),
    projectName: project?.name || 'Not created yet',
    keywords: project?.keywords || [],
    adminUrl: `${APP_URL}/admin/users/${user.id}`,
  })

  await sendEmail({ to: ADMIN_EMAIL, subject, html })
}
