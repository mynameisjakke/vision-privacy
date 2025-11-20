import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Test endpoint to verify Sentry error tracking
 * DELETE THIS FILE after testing
 */
export async function GET() {
  try {
    // Trigger a test error
    throw new Error('Test error from Vision Privacy - Sentry is working! 🎉')
  } catch (error) {
    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        test: true,
        endpoint: 'test-error'
      },
      extra: {
        message: 'This is a test error to verify Sentry integration'
      }
    })
    
    return NextResponse.json({
      message: 'Test error sent to Sentry!',
      check: 'Go to your Sentry dashboard to see the error'
    })
  }
}
