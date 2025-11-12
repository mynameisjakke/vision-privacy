import { NextRequest, NextResponse } from 'next/server'
import { validateApiToken, extractVisitorIP, isAllowedOrigin } from '@/utils/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateRequest, apiTokenSchema } from '@/lib/validation'

export interface AuthContext {
  isAuthenticated: boolean
  isAdmin: boolean
  site?: {
    id: string
    domain: string
    status: string
  }
  user?: string
  rateLimitInfo: {
    limit: number
    remaining: number
    reset: Date
  }
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  rateLimitType?: 'api' | 'registration' | 'consent' | 'widget' | 'scan' | 'admin'
  allowedMethods?: string[]
  corsOrigins?: string[] | '*'
  validateOrigin?: boolean
}

/**
 * Authentication and security middleware
 */
export async function withAuthMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ success: true; context: AuthContext } | { success: false; response: Response }> {
  const {
    requireAuth = false,
    requireAdmin = false,
    rateLimitType = 'api',
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    corsOrigins = '*',
    validateOrigin = false,
  } = options

  // Check HTTP method
  if (!allowedMethods.includes(request.method)) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: `Method ${request.method} is not allowed for this endpoint`,
          code: 1006,
          allowed_methods: allowedMethods,
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Allow': allowedMethods.join(', '),
          },
        }
      ),
    }
  }

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(corsOrigins, request)
    return {
      success: false,
      response: new Response(null, {
        status: 200,
        headers: corsHeaders,
      }),
    }
  }

  // Rate limiting check
  const rateLimit = await checkRateLimit(request, rateLimitType)
  if (!rateLimit.success) {
    const corsHeaders = getCorsHeaders(corsOrigins, request)
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${rateLimit.retryAfter} seconds.`,
          code: 1003,
          details: {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            reset: rateLimit.reset.toISOString(),
            retryAfter: rateLimit.retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toISOString(),
            'Retry-After': rateLimit.retryAfter?.toString() || '60',
            ...corsHeaders,
          },
        }
      ),
    }
  }

  // Initialize auth context
  const authContext: AuthContext = {
    isAuthenticated: false,
    isAdmin: false,
    rateLimitInfo: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
    },
  }

  // Authentication check
  if (requireAuth || requireAdmin) {
    if (requireAdmin) {
      // Admin authentication
      const adminAuth = await validateAdminToken(request)
      if (!adminAuth.valid) {
        const corsHeaders = getCorsHeaders(corsOrigins, request)
        return {
          success: false,
          response: new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: adminAuth.error || 'Invalid admin credentials',
              code: 1002,
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'WWW-Authenticate': 'Bearer',
                ...corsHeaders,
              },
            }
          ),
        }
      }
      authContext.isAuthenticated = true
      authContext.isAdmin = true
      authContext.user = adminAuth.user
    } else {
      // Site authentication
      const token = extractApiToken(request)
      if (!token) {
        const corsHeaders = getCorsHeaders(corsOrigins, request)
        return {
          success: false,
          response: new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: 'API token is required',
              code: 1001,
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'WWW-Authenticate': 'Bearer',
                ...corsHeaders,
              },
            }
          ),
        }
      }

      // Validate token format
      const tokenValidation = validateRequest(apiTokenSchema, { token })
      if (!tokenValidation.success) {
        const corsHeaders = getCorsHeaders(corsOrigins, request)
        return {
          success: false,
          response: new Response(
            JSON.stringify({
              error: 'Invalid token format',
              message: tokenValidation.error,
              code: 1002,
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          ),
        }
      }

      const siteAuth = await validateApiToken(token)
      if (!siteAuth.valid) {
        const corsHeaders = getCorsHeaders(corsOrigins, request)
        return {
          success: false,
          response: new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: siteAuth.error || 'Invalid API token',
              code: 1002,
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          ),
        }
      }
      authContext.isAuthenticated = true
      authContext.site = siteAuth.site
    }
  }

  // Origin validation (for authenticated requests)
  if (validateOrigin && authContext.isAuthenticated && authContext.site) {
    if (!isAllowedOrigin(request, authContext.site.domain)) {
      const corsHeaders = getCorsHeaders(corsOrigins, request)
      return {
        success: false,
        response: new Response(
          JSON.stringify({
            error: 'Forbidden',
            message: 'Request origin does not match registered domain',
            code: 1007,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        ),
      }
    }
  }

  return { success: true, context: authContext }
}

/**
 * Extract API token from request
 */
function extractApiToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check for token in query params for GET requests
  const token = request.nextUrl.searchParams.get('token')
  return token
}

/**
 * Generate CORS headers
 */
function getCorsHeaders(corsOrigins: string[] | '*', request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Admin-User',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }

  if (corsOrigins === '*') {
    headers['Access-Control-Allow-Origin'] = '*'
  } else if (Array.isArray(corsOrigins) && origin) {
    if (corsOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
    }
  }

  return headers
}

/**
 * Create authenticated response with proper headers
 */
export function createAuthenticatedResponse(
  data: any,
  status: number = 200,
  authContext: AuthContext,
  corsOrigins: string[] | '*' = '*',
  request?: NextRequest
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': authContext.rateLimitInfo.limit.toString(),
    'X-RateLimit-Remaining': authContext.rateLimitInfo.remaining.toString(),
    'X-RateLimit-Reset': authContext.rateLimitInfo.reset.toISOString(),
  }

  // Add CORS headers
  if (request) {
    const corsHeaders = getCorsHeaders(corsOrigins, request)
    Object.assign(headers, corsHeaders)
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  })
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
  }

  /**
   * Sanitize HTML content (basic)
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(input: string): string {
    try {
      const url = new URL(input)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol')
      }
      return url.toString()
    } catch {
      throw new Error('Invalid URL format')
    }
  }

  /**
   * Sanitize domain input
   */
  static sanitizeDomain(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '') // Only allow alphanumeric, dots, and hyphens
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input)
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key)
        sanitized[sanitizedKey] = this.sanitizeJson(value)
      }
      return sanitized
    }
    
    return input
  }
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: Response): Response {
  // Clone the response to modify headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  // Add security headers
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-XSS-Protection', '1; mode=block')
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy for API responses
  newResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  )

  return newResponse
}