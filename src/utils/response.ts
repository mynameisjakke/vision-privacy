import { NextResponse } from 'next/server'
import { APIError, ErrorCodes } from '@/types'

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  code: ErrorCodes,
  status: number = 400,
  details?: any
): NextResponse {
  const errorResponse: APIError = {
    error,
    message,
    code,
    ...(details && { details })
  }
  
  return NextResponse.json(errorResponse, { status })
}

/**
 * Handle validation errors
 */
export function createValidationErrorResponse(message: string): NextResponse {
  return createErrorResponse(
    'Validation Error',
    message,
    ErrorCodes.VALIDATION_ERROR,
    400
  )
}

/**
 * Handle authentication errors
 */
export function createAuthErrorResponse(message: string = 'Unauthorized'): NextResponse {
  return createErrorResponse(
    'Authentication Error',
    message,
    ErrorCodes.UNAUTHORIZED,
    401
  )
}

/**
 * Handle not found errors
 */
export function createNotFoundResponse(resource: string): NextResponse {
  return createErrorResponse(
    'Not Found',
    `${resource} not found`,
    ErrorCodes.INVALID_SITE_ID,
    404
  )
}

/**
 * Handle rate limiting errors
 */
export function createRateLimitResponse(): NextResponse {
  return createErrorResponse(
    'Rate Limit Exceeded',
    'Too many requests. Please try again later.',
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    429
  )
}

/**
 * Handle database errors
 */
export function createDatabaseErrorResponse(message: string = 'Database operation failed'): NextResponse {
  return createErrorResponse(
    'Database Error',
    message,
    ErrorCodes.DATABASE_ERROR,
    500
  )
}

/**
 * Handle method not allowed errors
 */
export function createMethodNotAllowedResponse(allowedMethods: string[]): NextResponse {
  return NextResponse.json(
    { error: 'Method Not Allowed', allowed_methods: allowedMethods },
    { 
      status: 405,
      headers: { 'Allow': allowedMethods.join(', ') }
    }
  )
}