import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'
import { createErrorResponse } from '@/utils/api-helpers'
import { Logger } from '@/lib/logger'
import { PerformanceMonitor, DatabaseMonitor, HealthChecker } from '@/lib/performance'
import { CacheManager } from '@/lib/cache'
import { validateAdminToken } from '@/utils/auth'

export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createErrorResponse('Unauthorized', 401)
    }

    const url = new URL(request.url)
    const metric = url.searchParams.get('metric')
    const timeRange = url.searchParams.get('range') || '1h'

    // Get comprehensive monitoring data
    const monitoringData = await getMonitoringData(metric, timeRange)

    return createSuccessResponse(monitoringData)

  } catch (error) {
    Logger.error('Failed to fetch monitoring data', error as Error, {
      endpoint: '/api/admin/monitoring'
    })
    
    return createErrorResponse('Failed to fetch monitoring data', 500)
  }
}

async function getMonitoringData(metric?: string | null, timeRange: string = '1h') {
  const data: any = {
    timestamp: new Date().toISOString(),
    timeRange
  }

  // If specific metric requested, return only that
  if (metric) {
    switch (metric) {
      case 'health':
        data.health = await HealthChecker.checkHealth()
        break
      case 'performance':
        data.performance = getPerformanceMetrics()
        break
      case 'errors':
        data.errors = Logger.getErrorMetrics()
        break
      case 'cache':
        data.cache = await CacheManager.getStats()
        break
      case 'database':
        data.database = DatabaseMonitor.getQueryMetrics()
        break
      default:
        throw new Error(`Unknown metric: ${metric}`)
    }
    return data
  }

  // Return all monitoring data
  data.health = await HealthChecker.checkHealth()
  data.performance = getPerformanceMetrics()
  data.errors = Logger.getErrorMetrics()
  data.cache = await CacheManager.getStats()
  data.database = DatabaseMonitor.getQueryMetrics()
  data.system = getSystemMetrics()

  return data
}

function getPerformanceMetrics() {
  const allMetrics = PerformanceMonitor.getAllMetrics()
  
  return {
    endpoints: allMetrics.slice(0, 20), // Top 20 endpoints
    summary: {
      totalRequests: allMetrics.reduce((sum, m) => sum + m.requests, 0),
      averageResponseTime: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.averageTime, 0) / allMetrics.length 
        : 0,
      slowestEndpoint: allMetrics.length > 0 
        ? allMetrics.reduce((prev, curr) => prev.averageTime > curr.averageTime ? prev : curr)
        : null,
      fastestEndpoint: allMetrics.length > 0
        ? allMetrics.reduce((prev, curr) => prev.averageTime < curr.averageTime ? prev : curr)
        : null
    }
  }
}

function getSystemMetrics() {
  const metrics: any = {
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV
  }

  // Memory usage (if available)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage()
    metrics.memory = {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`
    }
  }

  // CPU usage (basic approximation)
  if (typeof process !== 'undefined' && process.cpuUsage) {
    const cpuUsage = process.cpuUsage()
    metrics.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    }
  }

  return metrics
}

// Real-time monitoring endpoint (Server-Sent Events)
export async function POST(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case 'alert':
        return handleAlertConfiguration(config)
      case 'reset':
        return handleMetricsReset(config)
      default:
        return createErrorResponse('Unknown action', 400)
    }

  } catch (error) {
    Logger.error('Failed to handle monitoring action', error as Error, {
      endpoint: '/api/admin/monitoring'
    })
    
    return createErrorResponse('Failed to handle monitoring action', 500)
  }
}

async function handleAlertConfiguration(config: any) {
  // Store alert configuration (in a real implementation, this would be in database)
  Logger.info('Alert configuration updated', { config })
  
  return createSuccessResponse({
    message: 'Alert configuration updated',
    config
  })
}

async function handleMetricsReset(config: any) {
  const { metrics } = config

  if (metrics.includes('performance')) {
    PerformanceMonitor.reset()
  }
  
  if (metrics.includes('errors')) {
    Logger.clear()
  }
  
  if (metrics.includes('database')) {
    DatabaseMonitor.reset()
  }

  Logger.info('Metrics reset', { resetMetrics: metrics })
  
  return createSuccessResponse({
    message: 'Metrics reset successfully',
    resetMetrics: metrics
  })
}