import type { Metadata } from 'next'
import { Space_Grotesk, DM_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-E7EFDZDLTQ'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'Reachh - Find Customers on Reddit',
  description: 'Discover Reddit threads where people are asking for products like yours. Get 250 comment opportunities per month for $499.',
  keywords: ['reddit marketing', 'reddit monitoring', 'social listening', 'reddit lead generation', 'reddit comments'],
  authors: [{ name: 'Reachh' }],
  creator: 'Reachh',
  metadataBase: new URL('https://reachh.com'),
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reachh.com',
    siteName: 'Reachh',
    title: 'Reachh - Find Customers on Reddit',
    description: 'Discover Reddit threads where people are asking for products like yours. Get 250 comment opportunities per month.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Reachh - Reddit Marketing Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reachh - Find Customers on Reddit',
    description: 'Discover Reddit threads where people are asking for products like yours.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable}`}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
