import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vision Privacy API',
  description: 'Centralized privacy and cookie policy management for WordPress sites',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}