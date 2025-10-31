import { NextRequest } from 'next/server'
import { createSuccessResponse, createValidationErrorResponse, createNotFoundResponse, createMethodNotAllowedResponse, createDatabaseErrorResponse } from '@/utils/response'
import { validateRequest, consentRequestSchema } from '@/lib/validation'
import { hashVisitorInfo, hashUserAgent, generateConsentExpiration } from '@/utils/crypto'
import { SitesDB, ConsentRecordsDB } from '@/lib/database'
import { withAuthMiddleware, InputSanitizer, createAuthenticatedResponse } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  // Apply authentication and rate limiting middleware
  const authResult = await withAuthMiddleware(request, {
    requireAuth: false, // Consent doesn't require auth token
    rateLimitType: 'consent',
    allowedMethods: ['POST'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult

  try {
    const body = await request.json()
    
    // Sanitize input data
    const sanitizedBody = InputSanitizer.sanitizeJson(body)
    
    // Validate request data
    const validation = validateRequest(consentRequestSchema, sanitizedBody)
    if (!validation.success) {
      return createAuthenticatedResponse(
        {
          error: 'Validation failed',
          message: validation.error,
          code: 1004,
        },
        400,
        context,
        '*',
        request
      )
    }
    
    const { site_id, visitor_hash, consent_categories, timestamp, user_agent } = validation.data
    
    // Verify site exists and is active
    const site = await SitesDB.getById(site_id)
    if (!site) {
      return createNotFoundResponse('Site not found')
    }
    
    if (site.status !== 'active') {
      return createValidationErrorResponse('Site is not active')
    }
    
    // Get client IP for visitor identification
    const clientIP = getClientIP(request)
    
    // Generate visitor hash from IP and User Agent for privacy compliance
    const visitorHash = hashVisitorInfo(clientIP, user_agent)
    const userAgentHash = hashUserAgent(user_agent)
    
    // Generate consent expiration (12 months from now)
    const expiresAt = generateConsentExpiration()
    
    // Check if consent already exists for this visitor
    const existingConsent = await ConsentRecordsDB.getByVisitorHash(site_id, visitorHash)
    
    if (existingConsent) {
      // Update existing consent
      const updatedConsent = await ConsentRecordsDB.update(existingConsent.id, {
        consent_categories,
        consent_timestamp: new Date(timestamp).toISOString(),
        expires_at: expiresAt.toISOString(),
        user_agent_hash: userAgentHash
      })
      
      if (!updatedConsent) {
        return createDatabaseErrorResponse('Failed to update consent')
      }
      
      return createAuthenticatedResponse(
        {
          consent_id: updatedConsent.id,
          expires_at: expiresAt.toISOString(),
          updated: true
        },
        200,
        context,
        '*',
        request
      )
    } else {
      // Create new consent record
      const newConsent = await ConsentRecordsDB.create({
        site_id,
        visitor_hash: visitorHash,
        consent_categories,
        consent_timestamp: new Date(timestamp).toISOString(),
        expires_at: expiresAt.toISOString(),
        user_agent_hash: userAgentHash
      })
      
      if (!newConsent) {
        return createDatabaseErrorResponse('Failed to create consent record')
      }
      
      return createAuthenticatedResponse(
        {
          consent_id: newConsent.id,
          expires_at: expiresAt.toISOString(),
          created: true
        },
        201,
        context,
        '*',
        request
      )
    }
    
  } catch (error) {
    console.error('Consent tracking failed:', error)
    return createDatabaseErrorResponse('Consent tracking failed')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')
    const userAgent = request.headers.get('user-agent') || ''
    
    if (!siteId) {
      return createValidationErrorResponse('site_id parameter is required')
    }
    
    // Verify site exists and is active
    const site = await SitesDB.getById(siteId)
    if (!site) {
      return createNotFoundResponse('Site not found')
    }
    
    if (site.status !== 'active') {
      return createValidationErrorResponse('Site is not active')
    }
    
    // Get client IP for visitor identification
    const clientIP = getClientIP(request)
    
    // Generate visitor hash from IP and User Agent
    const visitorHash = hashVisitorInfo(clientIP, userAgent)
    
    // Get existing consent for this visitor
    const consent = await ConsentRecordsDB.getByVisitorHash(siteId, visitorHash)
    
    if (!consent) {
      return createSuccessResponse({
        has_consent: false,
        consent_required: true
      })
    }
    
    // Check if consent has expired
    const now = new Date()
    const expiresAt = new Date(consent.expires_at)
    
    if (now > expiresAt) {
      return createSuccessResponse({
        has_consent: false,
        consent_required: true,
        expired: true
      })
    }
    
    return createSuccessResponse({
      has_consent: true,
      consent_required: false,
      consent_categories: consent.consent_categories,
      consent_timestamp: consent.consent_timestamp,
      expires_at: consent.expires_at
    })
    
  } catch (error) {
    console.error('Consent retrieval failed:', error)
    return createDatabaseErrorResponse('Consent retrieval failed')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')
    const userAgent = request.headers.get('user-agent') || ''
    
    if (!siteId) {
      return createValidationErrorResponse('site_id parameter is required')
    }
    
    // Verify site exists and is active
    const site = await SitesDB.getById(siteId)
    if (!site) {
      return createNotFoundResponse('Site not found')
    }
    
    // Get client IP for visitor identification
    const clientIP = getClientIP(request)
    
    // Generate visitor hash from IP and User Agent
    const visitorHash = hashVisitorInfo(clientIP, userAgent)
    
    // Delete consent record for this visitor
    const deleted = await ConsentRecordsDB.deleteByVisitorHash(siteId, visitorHash)
    
    if (!deleted) {
      return createNotFoundResponse('No consent record found for this visitor')
    }
    
    return createSuccessResponse({
      deleted: true,
      message: 'Consent record deleted successfully'
    })
    
  } catch (error) {
    console.error('Consent deletion failed:', error)
    return createDatabaseErrorResponse('Consent deletion failed')
  }
}

export async function PUT() {
  return createMethodNotAllowedResponse(['GET', 'POST', 'DELETE'])
}

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 */
function getClientIP(request: NextRequest): string {
  // Check various headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  
  // x-forwarded-for can contain multiple IPs, take the first one
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0]
  }
  
  // Try other headers
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (vercelForwardedFor) return vercelForwardedFor
  
  // Fallback to a default value (should not happen in production)
  return '127.0.0.1'
}