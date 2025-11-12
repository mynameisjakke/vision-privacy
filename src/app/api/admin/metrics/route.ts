import { NextRequest } from 'next/server'
import { withAuthMiddleware, createAuthenticatedResponse } from '@/lib/auth-middleware'
import { PerformanceMonitor, DatabaseMonitor } from '@/lib/performance'

/**
 * GET /api/admin/metrics - Get performance metrics
 */
export async function GET(request: NextRequest) {
  // Apply authentication middleware with admin requirement
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true,
    requireAdmin: true,
    rateLimitType: 'admin',
    allowedMethods: ['GET', 'DELETE'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    const metrics: any = {}

    if (type === 'all' || type === 'endpoints') {
      const endpointMetrics = PerformanceMonitor.getAllMetrics()
      metrics.endpoints = endpointMetrics.slice(0, limit)
      metrics.endpoint_summary = {
        total_endpoints: endpointMetrics.length,
        total_requests: endpointMetrics.reduce((sum, m) => sum + m.requests, 0),
        average_response_time: endpointMetrics.length > 0 
          ? endpointMetrics.reduce((sum, m) => sum + m.averageTime, 0) / endpointMetrics.length 
          : 0,
        slowest_endpoint: endpointMetrics[0] || null
      }
    }

    if (type === 'all' || type === 'database') {
      const dbMetrics = DatabaseMonitor.getQueryMetrics()
      metrics.database = dbMetrics.slice(0, limit)
      metrics.database_summary = {
        total_queries: dbMetrics.length,
        total_executions: dbMetrics.reduce((sum, m) => sum + m.requests, 0),
        average_query_time: dbMetrics.length > 0 
          ? dbMetrics.reduce((sum, m) => sum + m.averageTime, 0) / dbMetrics.length 
          : 0,
        total_errors: dbMetrics.reduce((sum, m) => sum + m.errors, 0),
        slowest_query: dbMetrics[0] || null
      }
    }

    if (type === 'all' || type === 'system') {
      metrics.system = {
        uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
        memory_usage: process.memoryUsage ? {
          heap_used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heap_total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
        } : 'unavailable',
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    return createAuthenticatedResponse(
      {
        metrics,
        filters: {
          type,
          limit
        },
        timestamp: new Date().toISOString(),
        message: 'Performance metrics retrieved successfully'
      },
      200,
      context,
      '*',
      request
    )

  } catch (error) {
    console.error('Metrics retrieval failed:', error)
    return createAuthenticatedResponse(
      {
        error: 'Internal error',
        message: 'Failed to retrieve performance metrics',
        code: 1005,
      },
      500,
      context,
      '*',
      request
    )
  }
}

/**
 * DELETE /api/admin/metrics - Reset performance metrics
 */
export async function DELETE(request: NextRequest) {
  // Apply authentication middleware with admin requirement
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true,
    requireAdmin: true,
    rateLimitType: 'admin',
    allowedMethods: ['GET', 'DELETE'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const operations: string[] = []

    if (type === 'all' || type === 'endpoints') {
      PerformanceMonitor.reset()
      operations.push('endpoint metrics')
    }

    if (type === 'all' || type === 'database') {
      DatabaseMonitor.reset()
      operations.push('database metrics')
    }

    return createAuthenticatedResponse(
      {
        success: true,
        operations,
        message: `Metrics reset successfully: ${operations.join(', ')}`,
        timestamp: new Date().toISOString()
      },
      200,
      context,
      '*',
      request
    )

  } catch (error) {
    console.error('Metrics reset failed:', error)
    return createAuthenticatedResponse(
      {
        error: 'Internal error',
        message: 'Failed to reset metrics',
        code: 1005,
      },
      500,
      context,
      '*',
      request
    )
  }
}

export async function POST() {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'Use GET to view metrics or DELETE to reset metrics',
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, DELETE',
      },
    }
  )
}

export async function PUT() {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      message: 'Use GET to view metrics or DELETE to reset metrics',
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, DELETE',
      },
    }
  )
}