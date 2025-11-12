import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'
import { createErrorResponse } from '@/utils/api-helpers'
import { Analytics } from '@/lib/analytics'
import { Logger } from '@/lib/logger'
import { validateAdminToken } from '@/utils/auth'

export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createErrorResponse('Unauthorized', 401)
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'overview'
    const siteId = url.searchParams.get('site_id')
    const timeRange = url.searchParams.get('range') || '24h'
    const format = url.searchParams.get('format') || 'json'

    let analyticsData: any

    switch (type) {
      case 'overview':
        analyticsData = getOverviewAnalytics(timeRange)
        break
      
      case 'consent':
        if (!siteId) {
          return createErrorResponse('site_id parameter required for consent analytics', 400)
        }
        analyticsData = Analytics.getConsentAnalytics(siteId, timeRange)
        break
      
      case 'usage':
        analyticsData = Analytics.getUsageMetrics(timeRange)
        break
      
      case 'events':
        const eventType = url.searchParams.get('event_type')
        const limit = parseInt(url.searchParams.get('limit') || '100')
        analyticsData = {
          events: Analytics.getEvents(eventType || undefined, limit),
          eventCounts: Analytics.getEventCounts()
        }
        break
      
      case 'export':
        return handleDataExport(format as 'json' | 'csv')
      
      default:
        return createErrorResponse(`Unknown analytics type: ${type}`, 400)
    }

    return createSuccessResponse({
      type,
      timeRange,
      timestamp: new Date().toISOString(),
      data: analyticsData
    })

  } catch (error) {
    Logger.error('Failed to fetch analytics data', error as Error, {
      endpoint: '/api/admin/analytics'
    })
    
    return createErrorResponse('Failed to fetch analytics data', 500)
  }
}

function getOverviewAnalytics(timeRange: string) {
  const usageMetrics = Analytics.getUsageMetrics(timeRange)
  const eventCounts = Analytics.getEventCounts()
  
  // Get top sites by activity
  const recentEvents = Analytics.getEvents(undefined, 1000)
  const siteActivity = new Map<string, number>()
  
  recentEvents.forEach(event => {
    if (event.siteId) {
      siteActivity.set(event.siteId, (siteActivity.get(event.siteId) || 0) + 1)
    }
  })
  
  const topSites = Array.from(siteActivity.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([siteId, activity]) => ({ siteId, activity }))

  // Calculate consent trends
  const consentEvents = Analytics.getEvents('consent_decision', 500)
  const consentTrends = calculateConsentTrends(consentEvents)

  return {
    summary: {
      totalSites: usageMetrics.totalSites,
      totalConsents: usageMetrics.totalConsents,
      totalScans: usageMetrics.totalScans,
      apiCalls: usageMetrics.apiCalls.total,
      errorRate: usageMetrics.apiCalls.errorRate,
      averageResponseTime: usageMetrics.performance.averageResponseTime
    },
    topSites,
    consentTrends,
    eventCounts,
    performance: usageMetrics.performance
  }
}

function calculateConsentTrends(consentEvents: any[]) {
  const trends = {
    acceptAll: 0,
    rejectAll: 0,
    customize: 0,
    totalDecisions: consentEvents.length
  }

  consentEvents.forEach(event => {
    const decision = event.properties?.decision
    if (decision === 'accept_all') trends.acceptAll++
    else if (decision === 'reject_all') trends.rejectAll++
    else if (decision === 'customize') trends.customize++
  })

  // Calculate percentages
  if (trends.totalDecisions > 0) {
    return {
      acceptAllRate: (trends.acceptAll / trends.totalDecisions) * 100,
      rejectAllRate: (trends.rejectAll / trends.totalDecisions) * 100,
      customizeRate: (trends.customize / trends.totalDecisions) * 100,
      totalDecisions: trends.totalDecisions
    }
  }

  return {
    acceptAllRate: 0,
    rejectAllRate: 0,
    customizeRate: 0,
    totalDecisions: 0
  }
}

function handleDataExport(format: 'json' | 'csv') {
  try {
    const exportData = Analytics.exportData(format)
    
    if (format === 'csv') {
      return new Response(exportData as string, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vision-privacy-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return createSuccessResponse(exportData)
  } catch (error) {
    Logger.error('Failed to export analytics data', error as Error)
    return createErrorResponse('Failed to export data', 500)
  }
}

// Track analytics events via POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, properties, siteId, userId, metadata } = body

    if (!event) {
      return createErrorResponse('Event name is required', 400)
    }

    // Track the event
    Analytics.track(event, properties, siteId, userId, metadata)

    Logger.info('Analytics event tracked', { event, siteId, userId })

    return createSuccessResponse({
      message: 'Event tracked successfully',
      event,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    Logger.error('Failed to track analytics event', error as Error, {
      endpoint: '/api/admin/analytics'
    })
    
    return createErrorResponse('Failed to track event', 500)
  }
}