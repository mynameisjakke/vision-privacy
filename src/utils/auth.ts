import { NextRequest } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

/**
 * Extract API token from request headers
 */
export function extractApiToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check for token in query params for GET requests
  const token = request.nextUrl.searchParams.get('token')
  return token
}

/**
 * Validate API token and return associated site
 */
export async function validateApiToken(token: string) {
  if (!token) {
    return { valid: false, error: 'No token provided' }
  }
  
  try {
    const { data: site, error } = await supabaseAdmin
      .from(TABLES.SITES)
      .select('id, domain, status')
      .eq('api_token', token)
      .eq('status', 'active')
      .single()
    
    if (error || !site) {
      return { valid: false, error: 'Invalid or inactive token' }
    }
    
    return { valid: true, site }
  } catch (error) {
    console.error('Token validation error:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}

/**
 * Extract visitor IP address from request
 */
export function extractVisitorIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  // Fallback to connection IP (may be proxy IP)
  return request.ip || '127.0.0.1'
}

/**
 * Extract user agent from request
 */
export function extractUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown'
}

/**
 * Check if request is from allowed origin
 */
export function isAllowedOrigin(request: NextRequest, allowedDomain: string): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  if (!origin && !referer) {
    // Allow requests without origin/referer (direct API calls)
    return true
  }
  
  try {
    const originDomain = origin ? new URL(origin).hostname : null
    const refererDomain = referer ? new URL(referer).hostname : null
    const allowed = new URL(allowedDomain).hostname
    
    return originDomain === allowed || refererDomain === allowed
  } catch {
    return false
  }
}

/**
 * Validate admin token for administrative operations
 */
export async function validateAdminToken(request: NextRequest) {
  const token = extractApiToken(request)
  
  if (!token) {
    return { valid: false, error: 'No admin token provided' }
  }
  
  // Check if token matches admin token from environment
  const adminToken = process.env.ADMIN_API_TOKEN
  if (!adminToken) {
    console.error('ADMIN_API_TOKEN not configured')
    return { valid: false, error: 'Admin authentication not configured' }
  }
  
  if (token !== adminToken) {
    return { valid: false, error: 'Invalid admin token' }
  }
  
  // Extract user info from headers (optional)
  const adminUser = request.headers.get('x-admin-user') || 'admin'
  
  return { valid: true, user: adminUser }
}

/**
 * Validate API token for general API access (both site and admin tokens)
 */
export async function validateGeneralApiToken(request: NextRequest) {
  const token = extractApiToken(request)
  
  if (!token) {
    return { valid: false, error: 'No token provided' }
  }
  
  // First try admin token
  const adminToken = process.env.ADMIN_API_TOKEN
  if (adminToken && token === adminToken) {
    return { valid: true, isAdmin: true, user: 'admin' }
  }
  
  // Then try site token
  try {
    const { data: site, error } = await supabaseAdmin
      .from(TABLES.SITES)
      .select('id, domain, status')
      .eq('api_token', token)
      .eq('status', 'active')
      .single()
    
    if (error || !site) {
      return { valid: false, error: 'Invalid or inactive token' }
    }
    
    return { valid: true, isAdmin: false, site }
  } catch (error) {
    console.error('Token validation error:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}