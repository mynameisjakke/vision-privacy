/**
 * Helper functions for API endpoints
 */

import { NextResponse } from 'next/server'
import { ErrorCodes } from '@/types'

/**
 * Create a simple error response (backward compatibility)
 */
export function createErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { 
      error: getErrorTypeFromStatus(status),
      message,
      code: getErrorCodeFromStatus(status)
    }, 
    { status }
  )
}

function getErrorTypeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'Bad Request'
    case 401: return 'Unauthorized'
    case 403: return 'Forbidden'
    case 404: return 'Not Found'
    case 429: return 'Rate Limit Exceeded'
    case 500: return 'Internal Server Error'
    default: return 'Error'
  }
}

function getErrorCodeFromStatus(status: number): ErrorCodes {
  switch (status) {
    case 400: return ErrorCodes.VALIDATION_ERROR
    case 401: return ErrorCodes.UNAUTHORIZED
    case 404: return ErrorCodes.INVALID_SITE_ID
    case 429: return ErrorCodes.RATE_LIMIT_EXCEEDED
    case 500: return ErrorCodes.DATABASE_ERROR
    default: return ErrorCodes.VALIDATION_ERROR
  }
}