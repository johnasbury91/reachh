import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Credit packages - adjust pricing as needed
export const CREDIT_PACKAGES = [
  {
    id: 'credits_10',
    name: '10 Credits',
    credits: 10,
    price: 1900, // $19.00 in cents
    priceDisplay: '$19',
    pricePerCredit: '$1.90',
    popular: false,
  },
  {
    id: 'credits_25',
    name: '25 Credits',
    credits: 25,
    price: 3900, // $39.00 in cents
    priceDisplay: '$39',
    pricePerCredit: '$1.56',
    popular: true,
    savings: '18% off',
  },
  {
    id: 'credits_50',
    name: '50 Credits',
    credits: 50,
    price: 6900, // $69.00 in cents
    priceDisplay: '$69',
    pricePerCredit: '$1.38',
    popular: false,
    savings: '27% off',
  },
  {
    id: 'credits_100',
    name: '100 Credits',
    credits: 100,
    price: 11900, // $119.00 in cents
    priceDisplay: '$119',
    pricePerCredit: '$1.19',
    popular: false,
    savings: '37% off',
  },
]

export function getPackageById(id: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id)
}
