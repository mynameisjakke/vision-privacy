import type { Metadata } from 'next'
import * as Sentry from '@sentry/nextjs'

export function generateMetadata(): Metadata {
  return {
    title: 'Vision Privacy API',
    description: 'Centralized privacy and cookie policy management for WordPress sites',
    other: {
      ...Sentry.getTraceData()
    }
  }
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