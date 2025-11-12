import { NextRequest } from 'next/server'
import { SitesDB } from '@/lib/database'

/**
 * Extract API token from request headers
 */
export function extractApiToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  
  return parts[1]
}

/**
 * Validate API token and return associated site
 */
export async function validateApiToken(token: string): Promise<{
  valid: boolean
  site?: any
  error?: string
}> {
  try {
    if (!token || token.length < 32) {
      return { valid: false, error: 'Invalid token format' }
    }

    const site = await SitesDB.findByToken(token)
    if (!site) {
      return { valid: false, error: 'Invalid token' }
    }

    if (site.status !== 'active') {
      return { valid: false, error: 'Site is not active' }
    }

    return { valid: true, site }
  } catch (error) {
    console.error('Token validation error:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}

/**
 * Validate admin token (simplified for testing)
 */
export async function validateAdminToken(request: NextRequest): Promise<{
  valid: boolean
  user?: string
  error?: string
}> {
  try {
    const token = extractApiToken(request)
    if (!token) {
      return { valid: false, error: 'Admin token is required' }
    }

    // In a real implementation, this would check against admin tokens
    // For now, we'll use a simple check
    if (token.startsWith('admin-token-')) {
      return { valid: true, user: 'admin-user' }
    }

    return { valid: false, error: 'Invalid admin token' }
  } catch (error) {
    console.error('Admin token validation error:', error)
    return { valid: false, error: 'Admin token validation failed' }
  }
}

/**
 * Extract visitor IP address from request headers
 */
export function extractVisitorIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || remoteAddr || 'unknown'
}

/**
 * Check if origin is allowed for CORS
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || []
  
  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true
    }
  }
  
  return allowedOrigins.some(allowed => 
    allowed.trim() === origin || 
    (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1)))
  )
}