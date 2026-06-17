import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Garden Inn – Hotel Management',
  description: 'Internal hotel management and accounting system for Garden Inn. Manage bookings, track services, and generate financial reports.',
  keywords: ['hotel', 'booking', 'management', 'accounting', 'Garden Inn'],
  robots: 'noindex, nofollow', // internal tool – don't index
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
