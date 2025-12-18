import Stripe from 'stripe'

// Lazy-loaded Stripe instance to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    // Trim the key to remove any whitespace/newlines from env var
    const apiKey = (process.env.STRIPE_SECRET_KEY || '').trim()

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    stripeInstance = new Stripe(apiKey, {
      typescript: true,
    })
  }
  return stripeInstance
}

// Export as stripe for backwards compatibility (use getStripe() in new code)
export const stripe = {
  get checkout() { return getStripe().checkout },
  get webhooks() { return getStripe().webhooks },
  get billingPortal() { return getStripe().billingPortal },
  get customers() { return getStripe().customers },
}

// Subscription plan
export const SUBSCRIPTION_PLAN = {
  id: 'pro_monthly',
  name: 'Pro',
  price: 49900, // $499.00 in cents
  priceDisplay: '$499',
  interval: 'month' as const,
  commentsPerMonth: 250,
  features: [
    '250 comments per month',
    'Unlimited keyword tracking',
    'AI-powered comment suggestions',
    'Priority support',
  ],
}

// Keep for backwards compatibility during migration
export const CREDIT_PACKAGES = [SUBSCRIPTION_PLAN]

export function getPackageById(id: string) {
  return id === SUBSCRIPTION_PLAN.id ? SUBSCRIPTION_PLAN : null
}
