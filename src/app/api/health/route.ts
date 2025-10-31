import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'
import { supabase } from '@/lib/supabase'
import { HealthChecker, PerformanceMonitor } from '@/lib/performance'
import { CacheManager } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const healthStatus = await HealthChecker.checkHealth()
    
    // Test database connection (legacy check)
    const { error: dbError } = await supabase.from('sites').select('count').limit(1)
    
    // Get performance metrics
    const performanceMetrics = PerformanceMonitor.getAllMetrics()
    
    // Get cache statistics
    const cacheStats = await CacheManager.getStats()
    
    // Determine overall status
    const overallStatus = dbError ? 'unhealthy' : healthStatus.status
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    const response = createSuccessResponse({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
      database: dbError ? 'unhealthy' : 'healthy',
      checks: healthStatus.checks,
      performance: {
        endpoints: performanceMetrics.slice(0, 10), // Top 10 endpoints
        total_requests: performanceMetrics.reduce((sum, m) => sum + m.requests, 0)
      },
      cache: cacheStats,
      environment: {
        node_env: process.env.NODE_ENV,
        redis_enabled: !!process.env.UPSTASH_REDIS_REST_URL,
        rate_limiting_enabled: process.env.RATE_LIMIT_ENABLED === 'true'
      }
    }, statusCode)
    
    // Add cache headers for health check
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return createSuccessResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        system: {
          status: 'unhealthy',
          error: 'Health check system failure'
        }
      }
    }, 503)
  }
}