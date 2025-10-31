import { NextRequest } from 'next/server'
import { withAuthMiddleware, createAuthenticatedResponse } from '@/lib/auth-middleware'

/**
 * Admin authentication endpoint
 * Validates admin tokens and returns admin user info
 */
export async function GET(request: NextRequest) {
  // Apply authentication middleware with admin requirement
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true,
    requireAdmin: true,
    rateLimitType: 'admin',
    allowedMethods: ['GET'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult

  return createAuthenticatedResponse(
    {
      authenticated: true,
      user: context.user,
      permissions: ['admin'],
      message: 'Admin authentication successful'
    },
    200,
    context,
    '*',
    request
  )
}

export async function POST() {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'Use GET to check admin authentication status',
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
    }
  )
}

export async function PUT() {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'Use GET to check admin authentication status',
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
    }
  )
}

export async function DELETE() {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'Use GET to check admin authentication status',
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
    }
  )
}