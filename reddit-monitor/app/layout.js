import './globals.css'

export const metadata = {
  title: 'Reddit Monitor - Reachh',
  description: 'Find and track Reddit opportunities',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
