import { NextRequest, NextResponse } from 'next/server'
import { CacheManager } from './cache'

/**
 * Performance monitoring and metrics collection
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, {
    count: number
    totalTime: number
    minTime: number
    maxTime: number
    lastUpdated: number
  }>()

  /**
   * Record API endpoint performance
   */
  static recordEndpoint(endpoint: string, duration: number) {
    const existing = this.metrics.get(endpoint)
    
    if (existing) {
      existing.count++
      existing.totalTime += duration
      existing.minTime = Math.min(existing.minTime, duration)
      existing.maxTime = Math.max(existing.maxTime, duration)
      existing.lastUpdated = Date.now()
    } else {
      this.metrics.set(endpoint, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        lastUpdated: Date.now()
      })
    }
  }

  /**
   * Get performance metrics for an endpoint
   */
  static getEndpointMetrics(endpoint: string) {
    const metrics = this.metrics.get(endpoint)
    if (!metrics) return null

    return {
      endpoint,
      requests: metrics.count,
      averageTime: metrics.totalTime / metrics.count,
      minTime: metrics.minTime,
      maxTime: metrics.maxTime,
      totalTime: metrics.totalTime,
      lastUpdated: new Date(metrics.lastUpdated).toISOString()
    }
  }

  /**
   * Get all performance metrics
   */
  static getAllMetrics() {
    const results = []
    for (const [endpoint, metrics] of Array.from(this.metrics.entries())) {
      results.push({
        endpoint,
        requests: metrics.count,
        averageTime: metrics.totalTime / metrics.count,
        minTime: metrics.minTime,
        maxTime: metrics.maxTime,
        totalTime: metrics.totalTime,
        lastUpdated: new Date(metrics.lastUpdated).toISOString()
      })
    }
    return results.sort((a, b) => b.requests - a.requests)
  }

  /**
   * Reset metrics (useful for testing)
   */
  static reset() {
    this.metrics.clear()
  }

  /**
   * Clean old metrics (older than 24 hours)
   */
  static cleanup() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    for (const [endpoint, metrics] of Array.from(this.metrics.entries())) {
      if (metrics.lastUpdated < oneDayAgo) {
        this.metrics.delete(endpoint)
      }
    }
  }
}

/**
 * Performance middleware wrapper
 */
export function withPerformanceMonitoring<T extends any[], R>(
  endpoint: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now()
    
    try {
      const result = await handler(...args)
      const duration = performance.now() - startTime
      
      PerformanceMonitor.recordEndpoint(endpoint, duration)
      
      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow request detected: ${endpoint} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      PerformanceMonitor.recordEndpoint(`${endpoint}:error`, duration)
      throw error
    }
  }
}

/**
 * Database query performance monitoring
 */
export class DatabaseMonitor {
  private static queryMetrics = new Map<string, {
    count: number
    totalTime: number
    minTime: number
    maxTime: number
    errors: number
    lastUpdated: number
  }>()

  /**
   * Record database query performance
   */
  static recordQuery(query: string, duration: number, isError: boolean = false) {
    // Normalize query for grouping (remove specific values)
    const normalizedQuery = this.normalizeQuery(query)
    const existing = this.queryMetrics.get(normalizedQuery)
    
    if (existing) {
      existing.count++
      existing.totalTime += duration
      existing.minTime = Math.min(existing.minTime, duration)
      existing.maxTime = Math.max(existing.maxTime, duration)
      existing.lastUpdated = Date.now()
      if (isError) existing.errors++
    } else {
      this.queryMetrics.set(normalizedQuery, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        errors: isError ? 1 : 0,
        lastUpdated: Date.now()
      })
    }
  }

  /**
   * Normalize SQL query for grouping
   */
  private static normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\b\d+\b/g, '?') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase()
  }

  /**
   * Get database query metrics
   */
  static getQueryMetrics() {
    const results = []
    for (const [query, metrics] of Array.from(this.queryMetrics.entries())) {
      results.push({
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        requests: metrics.count,
        averageTime: metrics.totalTime / metrics.count,
        minTime: metrics.minTime,
        maxTime: metrics.maxTime,
        totalTime: metrics.totalTime,
        errors: metrics.errors,
        errorRate: (metrics.errors / metrics.count) * 100,
        lastUpdated: new Date(metrics.lastUpdated).toISOString()
      })
    }
    return results.sort((a, b) => b.averageTime - a.averageTime)
  }

  /**
   * Reset query metrics
   */
  static reset() {
    this.queryMetrics.clear()
  }
}

/**
 * Response optimization utilities
 */
export class ResponseOptimizer {
  /**
   * Add performance headers to response
   */
  static addPerformanceHeaders(
    response: Response, 
    startTime: number,
    cacheHit: boolean = false
  ): Response {
    const duration = performance.now() - startTime
    
    // Clone response to modify headers
    const optimizedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    // Add performance headers
    optimizedResponse.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
    optimizedResponse.headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS')
    optimizedResponse.headers.set('X-Timestamp', new Date().toISOString())

    // Add cache headers for static content
    if (cacheHit) {
      optimizedResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    }

    return optimizedResponse
  }

  /**
   * Compress response if applicable
   */
  static async compressResponse(response: Response): Promise<Response> {
    // Check if response should be compressed
    const contentType = response.headers.get('content-type')
    if (!contentType || !this.shouldCompress(contentType)) {
      return response
    }

    // For now, we'll rely on Vercel's automatic compression
    // In a custom implementation, you could add gzip compression here
    return response
  }

  /**
   * Check if content type should be compressed
   */
  private static shouldCompress(contentType: string): boolean {
    const compressibleTypes = [
      'application/json',
      'application/javascript',
      'text/css',
      'text/html',
      'text/plain',
      'text/xml'
    ]
    
    return compressibleTypes.some(type => contentType.includes(type))
  }

  /**
   * Add CDN headers for static assets
   */
  static addCDNHeaders(response: Response, maxAge: number = 86400): Response {
    const cdnResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    // Add CDN-friendly headers
    cdnResponse.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`)
    cdnResponse.headers.set('Vary', 'Accept-Encoding')
    cdnResponse.headers.set('X-CDN-Cache', 'ENABLED')

    return cdnResponse
  }
}

/**
 * Health check utilities
 */
export class HealthChecker {
  /**
   * Check system health
   */
  static async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: string; latency?: number; error?: string }>
    timestamp: string
  }> {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {}
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check database connectivity
    try {
      const dbStart = performance.now()
      // This would be a simple query to test DB connectivity
      // await supabaseAdmin.from('sites').select('count').limit(1).single()
      checks.database = {
        status: 'healthy',
        latency: performance.now() - dbStart
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      overallStatus = 'unhealthy'
    }

    // Check Redis connectivity
    try {
      const redisStart = performance.now()
      await CacheManager.set('health:check', 'ok', 10)
      await CacheManager.get('health:check')
      checks.redis = {
        status: 'healthy',
        latency: performance.now() - redisStart
      }
    } catch (error) {
      checks.redis = {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Redis unavailable'
      }
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }

    // Check memory usage
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage()
      const memUsageMB = memUsage.heapUsed / 1024 / 1024
      
      checks.memory = {
        status: memUsageMB < 500 ? 'healthy' : memUsageMB < 800 ? 'degraded' : 'unhealthy',
        latency: memUsageMB
      }
      
      if (memUsageMB > 800 && overallStatus !== 'unhealthy') {
        overallStatus = 'unhealthy'
      } else if (memUsageMB > 500 && overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString()
    }
  }
}

// Clean up old metrics periodically
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') { // Only run on server, not in tests
  setInterval(() => {
    PerformanceMonitor.cleanup()
  }, 60 * 60 * 1000) // Clean up every hour
}