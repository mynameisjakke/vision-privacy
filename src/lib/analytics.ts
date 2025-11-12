/**
 * Analytics and usage tracking for Vision Privacy
 * Tracks system usage, consent patterns, and performance metrics
 */

import { Logger } from './logger'
import { CacheManager } from './cache'

export interface AnalyticsEvent {
  event: string
  timestamp: string
  siteId?: string
  userId?: string
  properties?: Record<string, any>
  metadata?: {
    userAgent?: string
    ip?: string
    referer?: string
    sessionId?: string
  }
}

export interface ConsentAnalytics {
  siteId: string
  totalVisitors: number
  consentRate: number
  acceptanceByCategory: Record<string, number>
  rejectionRate: number
  customizationRate: number
  averageDecisionTime: number
  topCountries?: string[]
  deviceTypes?: Record<string, number>
}

export interface UsageMetrics {
  totalSites: number
  activeSites: number
  totalConsents: number
  totalScans: number
  apiCalls: {
    total: number
    byEndpoint: Record<string, number>
    errorRate: number
  }
  performance: {
    averageResponseTime: number
    p95ResponseTime: number
    uptime: number
  }
}

/**
 * Analytics tracking system
 */
export class Analytics {
  private static events: AnalyticsEvent[] = []
  private static maxEvents = 10000
  private static eventCounts = new Map<string, number>()

  /**
   * Track an analytics event
   */
  static track(
    event: string,
    properties?: Record<string, any>,
    siteId?: string,
    userId?: string,
    metadata?: AnalyticsEvent['metadata']
  ) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      siteId,
      userId,
      properties,
      metadata
    }

    // Add to events array
    this.events.push(analyticsEvent)

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Update event counts
    const count = this.eventCounts.get(event) || 0
    this.eventCounts.set(event, count + 1)

    // Log important events
    if (this.isImportantEvent(event)) {
      Logger.info(`Analytics: ${event}`, { properties, siteId, userId })
    }

    // In production, you might want to send to external analytics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(analyticsEvent)
    }
  }

  /**
   * Track widget load event
   */
  static trackWidgetLoad(siteId: string, metadata?: AnalyticsEvent['metadata']) {
    this.track('widget_load', {
      loadTime: Date.now()
    }, siteId, undefined, metadata)
  }

  /**
   * Track consent decision
   */
  static trackConsentDecision(
    siteId: string,
    decision: 'accept_all' | 'reject_all' | 'customize',
    categories: string[],
    decisionTime: number,
    metadata?: AnalyticsEvent['metadata']
  ) {
    this.track('consent_decision', {
      decision,
      categories,
      decisionTime,
      categoryCount: categories.length
    }, siteId, undefined, metadata)
  }

  /**
   * Track site registration
   */
  static trackSiteRegistration(siteId: string, properties: {
    domain: string
    wpVersion: string
    pluginCount: number
    formCount: number
  }) {
    this.track('site_registration', properties, siteId)
  }

  /**
   * Track client scan
   */
  static trackClientScan(siteId: string, properties: {
    scriptsDetected: number
    cookiesDetected: number
    newServices: number
    scanDuration: number
  }) {
    this.track('client_scan', properties, siteId)
  }

  /**
   * Track API usage
   */
  static trackAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    siteId?: string
  ) {
    this.track('api_call', {
      endpoint,
      method,
      statusCode,
      responseTime,
      success: statusCode < 400
    }, siteId)
  }

  /**
   * Get events by type
   */
  static getEvents(eventType?: string, limit: number = 100): AnalyticsEvent[] {
    let filteredEvents = this.events

    if (eventType) {
      filteredEvents = this.events.filter(event => event.event === eventType)
    }

    return filteredEvents.slice(-limit).reverse()
  }

  /**
   * Get event counts
   */
  static getEventCounts(): Record<string, number> {
    return Object.fromEntries(this.eventCounts)
  }

  /**
   * Get consent analytics for a site
   */
  static getConsentAnalytics(siteId: string, timeRange: string = '24h'): ConsentAnalytics {
    const cutoffTime = this.getTimeRangeCutoff(timeRange)
    
    const consentEvents = this.events.filter(event => 
      event.event === 'consent_decision' &&
      event.siteId === siteId &&
      new Date(event.timestamp) > cutoffTime
    )

    const widgetLoads = this.events.filter(event =>
      event.event === 'widget_load' &&
      event.siteId === siteId &&
      new Date(event.timestamp) > cutoffTime
    ).length

    const totalVisitors = widgetLoads
    const totalConsents = consentEvents.length
    const consentRate = totalVisitors > 0 ? (totalConsents / totalVisitors) * 100 : 0

    // Analyze consent decisions
    const acceptAll = consentEvents.filter(e => e.properties?.decision === 'accept_all').length
    const rejectAll = consentEvents.filter(e => e.properties?.decision === 'reject_all').length
    const customize = consentEvents.filter(e => e.properties?.decision === 'customize').length

    const rejectionRate = totalConsents > 0 ? (rejectAll / totalConsents) * 100 : 0
    const customizationRate = totalConsents > 0 ? (customize / totalConsents) * 100 : 0

    // Calculate average decision time
    const decisionTimes = consentEvents
      .map(e => e.properties?.decisionTime)
      .filter(time => typeof time === 'number')
    const averageDecisionTime = decisionTimes.length > 0
      ? decisionTimes.reduce((sum, time) => sum + time, 0) / decisionTimes.length
      : 0

    // Analyze category acceptance
    const acceptanceByCategory: Record<string, number> = {}
    consentEvents.forEach(event => {
      if (event.properties?.categories && Array.isArray(event.properties.categories)) {
        event.properties.categories.forEach((category: string) => {
          acceptanceByCategory[category] = (acceptanceByCategory[category] || 0) + 1
        })
      }
    })

    return {
      siteId,
      totalVisitors,
      consentRate,
      acceptanceByCategory,
      rejectionRate,
      customizationRate,
      averageDecisionTime
    }
  }

  /**
   * Get overall usage metrics
   */
  static getUsageMetrics(timeRange: string = '24h'): UsageMetrics {
    const cutoffTime = this.getTimeRangeCutoff(timeRange)
    
    const recentEvents = this.events.filter(event => 
      new Date(event.timestamp) > cutoffTime
    )

    // Count unique sites
    const uniqueSites = new Set(
      recentEvents
        .filter(event => event.siteId)
        .map(event => event.siteId)
    ).size

    // Count API calls
    const apiCalls = recentEvents.filter(event => event.event === 'api_call')
    const totalApiCalls = apiCalls.length
    const errorCalls = apiCalls.filter(event => !event.properties?.success).length
    const errorRate = totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0

    // API calls by endpoint
    const byEndpoint: Record<string, number> = {}
    apiCalls.forEach(event => {
      const endpoint = event.properties?.endpoint
      if (endpoint) {
        byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1
      }
    })

    // Performance metrics
    const responseTimes = apiCalls
      .map(event => event.properties?.responseTime)
      .filter(time => typeof time === 'number')
      .sort((a, b) => a - b)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p95ResponseTime = responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0

    return {
      totalSites: uniqueSites,
      activeSites: uniqueSites, // For now, same as total
      totalConsents: recentEvents.filter(e => e.event === 'consent_decision').length,
      totalScans: recentEvents.filter(e => e.event === 'client_scan').length,
      apiCalls: {
        total: totalApiCalls,
        byEndpoint,
        errorRate
      },
      performance: {
        averageResponseTime,
        p95ResponseTime,
        uptime: 99.9 // Placeholder - would be calculated from health checks
      }
    }
  }

  /**
   * Get time range cutoff
   */
  private static getTimeRangeCutoff(timeRange: string): Date {
    const now = new Date()
    
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000)
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Check if event is important enough to log
   */
  private static isImportantEvent(event: string): boolean {
    const importantEvents = [
      'site_registration',
      'consent_decision',
      'client_scan',
      'error',
      'security_violation'
    ]
    return importantEvents.includes(event)
  }

  /**
   * Send event to external analytics service
   */
  private static async sendToExternalService(event: AnalyticsEvent) {
    try {
      // In production, you might send to:
      // - Google Analytics
      // - Mixpanel
      // - Amplitude
      // - Custom analytics endpoint
      
      if (process.env.ANALYTICS_WEBHOOK_URL) {
        await fetch(process.env.ANALYTICS_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ANALYTICS_WEBHOOK_TOKEN}`
          },
          body: JSON.stringify({
            service: 'vision-privacy',
            environment: process.env.NODE_ENV,
            ...event
          })
        })
      }
    } catch (error) {
      // Don't let analytics errors break the application
      Logger.error('Failed to send analytics event', error as Error, {
        event: event.event
      })
    }
  }

  /**
   * Clear analytics data (useful for testing)
   */
  static clear() {
    this.events = []
    this.eventCounts.clear()
  }

  /**
   * Export analytics data
   */
  static exportData(format: 'json' | 'csv' = 'json') {
    if (format === 'json') {
      return {
        events: this.events,
        eventCounts: Object.fromEntries(this.eventCounts),
        exportedAt: new Date().toISOString()
      }
    }

    // CSV export (simplified)
    const csvHeaders = 'timestamp,event,siteId,userId,properties\n'
    const csvRows = this.events.map(event => 
      `${event.timestamp},${event.event},${event.siteId || ''},${event.userId || ''},"${JSON.stringify(event.properties || {})}"`
    ).join('\n')

    return csvHeaders + csvRows
  }
}

/**
 * Middleware to automatically track API calls
 */
export function withAnalytics<T extends any[], R>(
  endpoint: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now()
    let statusCode = 200
    let siteId: string | undefined

    try {
      // Extract site ID from request if available
      if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
        const url = new URL((args[0] as any).url)
        siteId = url.searchParams.get('site_id') || undefined
      }

      const result = await handler(...args)
      const responseTime = performance.now() - startTime

      // Track successful API call
      Analytics.trackAPICall(endpoint, 'GET', statusCode, responseTime, siteId)

      return result
    } catch (error) {
      const responseTime = performance.now() - startTime
      statusCode = 500

      // Track failed API call
      Analytics.trackAPICall(endpoint, 'GET', statusCode, responseTime, siteId)

      throw error
    }
  }
}

// Clean up old events periodically
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') { // Only run on server, not in tests
  setInterval(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Keep only events from the last 24 hours for memory efficiency
    Analytics['events'] = Analytics['events'].filter(event => 
      new Date(event.timestamp) > oneDayAgo
    )
  }, 60 * 60 * 1000) // Clean up every hour
}