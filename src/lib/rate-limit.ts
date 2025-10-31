import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { extractVisitorIP } from '@/utils/auth'

// Initialize Redis client for rate limiting
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Fallback in-memory rate limiting for development
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints
  api: {
    requests: 100,
    window: '1 m' as const,
  },
  // Site registration (more restrictive)
  registration: {
    requests: 5,
    window: '1 h' as const,
  },
  // Consent tracking (higher limit for user interactions)
  consent: {
    requests: 200,
    window: '1 m' as const,
  },
  // Widget configuration (cached, so lower limit)
  widget: {
    requests: 50,
    window: '1 m' as const,
  },
  // Client scanning
  scan: {
    requests: 30,
    window: '1 m' as const,
  },
  // Admin operations (very restrictive)
  admin: {
    requests: 20,
    window: '1 m' as const,
  },
} as const

// Create rate limiters
const createRateLimiter = (config: { requests: number; window: string }) => {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
      analytics: true,
    })
  }
  return null
}

// Rate limiter instances
export const rateLimiters = {
  api: createRateLimiter(RATE_LIMITS.api),
  registration: createRateLimiter(RATE_LIMITS.registration),
  consent: createRateLimiter(RATE_LIMITS.consent),
  widget: createRateLimiter(RATE_LIMITS.widget),
  scan: createRateLimiter(RATE_LIMITS.scan),
  admin: createRateLimiter(RATE_LIMITS.admin),
}

// Fallback in-memory rate limiting
function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: Date } {
  const now = Date.now()
  const key = identifier
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    memoryStore.set(key, { count: 1, resetTime: now + windowMs })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: new Date(now + windowMs),
    }
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: new Date(entry.resetTime),
    }
  }

  entry.count++
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: new Date(entry.resetTime),
  }
}

// Convert window string to milliseconds
function windowToMs(window: string): number {
  const match = window.match(/^(\d+)\s*([smhd])$/)
  if (!match) return 60000 // Default to 1 minute

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 60000
  }
}

// Rate limit check function
export async function checkRateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiters
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}> {
  const identifier = extractVisitorIP(request)
  const rateLimiter = rateLimiters[type]
  const config = RATE_LIMITS[type]

  if (rateLimiter) {
    // Use Upstash rate limiter
    try {
      const result = await rateLimiter.limit(identifier)
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
        retryAfter: result.success ? undefined : Math.ceil((new Date(result.reset).getTime() - Date.now()) / 1000),
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fallback to memory-based rate limiting
    }
  }

  // Fallback to in-memory rate limiting
  const windowMs = windowToMs(config.window)
  const result = checkMemoryRateLimit(identifier, config.requests, windowMs)
  
  return {
    ...result,
    retryAfter: result.success ? undefined : Math.ceil((result.reset.getTime() - Date.now()) / 1000),
  }
}

// Rate limit middleware function
export async function withRateLimit<T>(
  request: NextRequest,
  type: keyof typeof rateLimiters,
  handler: () => Promise<T>
): Promise<T | Response> {
  const rateLimit = await checkRateLimit(request, type)

  if (!rateLimit.success) {
    const response = new Response(
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
        },
      }
    )
    return response
  }

  // Add rate limit headers to successful responses
  const result = await handler()
  
  if (result instanceof Response) {
    result.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    result.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    result.headers.set('X-RateLimit-Reset', rateLimit.reset.toISOString())
  }

  return result
}

// Clean up expired entries from memory store (for development)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key)
    }
  }
}, 60000) // Clean up every minute