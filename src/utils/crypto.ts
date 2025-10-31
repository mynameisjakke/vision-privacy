import { createHash, randomBytes } from 'crypto'

/**
 * Generate a secure random API token
 */
export function generateApiToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a unique site ID (UUID v4 format)
 */
export function generateSiteId(): string {
  const bytes = randomBytes(16)
  
  // Set version (4) and variant bits according to RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variant 10
  
  // Format as UUID string
  const hex = bytes.toString('hex')
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-')
}

/**
 * Hash visitor information for privacy compliance
 * Combines IP address and User Agent for unique identification
 */
export function hashVisitorInfo(ipAddress: string, userAgent: string): string {
  const combined = `${ipAddress}:${userAgent}`
  return createHash('sha256').update(combined).digest('hex')
}

/**
 * Hash user agent for storage
 */
export function hashUserAgent(userAgent: string): string {
  return createHash('sha256').update(userAgent).digest('hex')
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  try {
    const url = new URL(domain)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Generate consent expiration date (12 months from now)
 */
export function generateConsentExpiration(): Date {
  const expiration = new Date()
  expiration.setFullYear(expiration.getFullYear() + 1)
  return expiration
}