import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Test endpoint to verify Sentry error tracking
 * 
 * Usage:
 * - GET /api/test-error - Trigger a test error
 * - GET /api/test-error?type=warning - Trigger a warning
 * - GET /api/test-error?type=info - Trigger an info message
 * 
 * DELETE THIS FILE after testing is complete
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'error'
  
  try {
    // Set context for this error
    Sentry.setContext('test_context', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      test_type: type,
      sentry_enabled: process.env.SENTRY_ENABLED !== 'false'
    })
    
    // Set tags
    Sentry.setTags({
      test: true,
      endpoint: 'test-error',
      error_type: type,
      environment: process.env.NODE_ENV || 'development'
    })
    
    if (type === 'error') {
      // Trigger a test error
      throw new Error('🧪 Test Error: Sentry is working! This is a test error from Vision Privacy.')
    } else if (type === 'warning') {
      // Capture a warning
      Sentry.captureMessage('⚠️ Test Warning: This is a test warning message', 'warning')
    } else if (type === 'info') {
      // Capture an info message
      Sentry.captureMessage('ℹ️ Test Info: This is a test info message', 'info')
    }
    
    return NextResponse.json({
      success: true,
      message: `Test ${type} sent to Sentry!`,
      environment: process.env.NODE_ENV,
      sentry_enabled: process.env.SENTRY_ENABLED !== 'false',
      instructions: {
        check_dashboard: 'Go to https://sentry.io to see the event',
        test_types: {
          error: '/api/test-error',
          warning: '/api/test-error?type=warning',
          info: '/api/test-error?type=info'
        }
      }
    })
  } catch (error) {
    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        test: true,
        endpoint: 'test-error',
        caught: true
      },
      extra: {
        message: 'This is a test error to verify Sentry integration',
        error_type: type
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test error captured and sent to Sentry!',
      environment: process.env.NODE_ENV,
      sentry_enabled: process.env.SENTRY_ENABLED !== 'false',
      check: 'Go to your Sentry dashboard to see the error',
      dashboard_url: 'https://sentry.io/organizations/vision-media/issues/'
    })
  }
}
