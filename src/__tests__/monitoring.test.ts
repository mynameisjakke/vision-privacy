/**
 * Tests for monitoring and observability features
 */

import { Logger, LogLevel } from '@/lib/logger'
import { Analytics } from '@/lib/analytics'
import { AlertManager } from '@/lib/alerting'
import { PerformanceMonitor } from '@/lib/performance'

describe('Monitoring System', () => {
  beforeEach(() => {
    // Clear all monitoring data before each test
    Logger.clear()
    Analytics.clear()
    AlertManager.clear()
    PerformanceMonitor.reset()
  })

  describe('Logger', () => {
    it('should log messages with different levels', () => {
      Logger.info('Test info message')
      Logger.warn('Test warning message')
      Logger.error('Test error message', new Error('Test error'))

      const logs = Logger.getRecentLogs(10)
      expect(logs).toHaveLength(3)
      expect(logs[0].level).toBe(LogLevel.ERROR)
      expect(logs[1].level).toBe(LogLevel.WARN)
      expect(logs[2].level).toBe(LogLevel.INFO)
    })

    it('should track error metrics', () => {
      Logger.error('Error 1', new Error('Test'))
      Logger.error('Error 2', new Error('Test'))
      Logger.warn('Warning 1')
      Logger.info('Info 1')

      const metrics = Logger.getErrorMetrics()
      expect(metrics.total).toBe(4)
      expect(metrics.byLevel[LogLevel.ERROR]).toBe(2)
      expect(metrics.byLevel[LogLevel.WARN]).toBe(1)
      expect(metrics.byLevel[LogLevel.INFO]).toBe(1)
    })

    it('should create request-scoped loggers', () => {
      const requestLogger = Logger.forRequest('req-123', '/api/test', 'user-456', 'site-789')
      
      requestLogger.info('Request started')
      requestLogger.error('Request failed', new Error('Test error'))

      const logs = Logger.getRecentLogs(10)
      expect(logs).toHaveLength(2)
      expect(logs[0].requestId).toBe('req-123')
      expect(logs[0].context?.endpoint).toBe('/api/test')
      expect(logs[0].context?.userId).toBe('user-456')
      expect(logs[0].context?.siteId).toBe('site-789')
    })
  })

  describe('Analytics', () => {
    it('should track events', () => {
      Analytics.track('test_event', { key: 'value' }, 'site-123')
      Analytics.track('another_event', { count: 5 })

      const events = Analytics.getEvents()
      expect(events).toHaveLength(2)
      expect(events[0].event).toBe('another_event')
      expect(events[1].event).toBe('test_event')
      expect(events[1].siteId).toBe('site-123')
    })

    it('should track widget loads', () => {
      Analytics.trackWidgetLoad('site-123', { userAgent: 'test-agent' })

      const events = Analytics.getEvents('widget_load')
      expect(events).toHaveLength(1)
      expect(events[0].siteId).toBe('site-123')
      expect(events[0].metadata?.userAgent).toBe('test-agent')
    })

    it('should track consent decisions', () => {
      Analytics.trackConsentDecision(
        'site-123',
        'accept_all',
        ['essential', 'analytics'],
        1500
      )

      const events = Analytics.getEvents('consent_decision')
      expect(events).toHaveLength(1)
      expect(events[0].properties?.decision).toBe('accept_all')
      expect(events[0].properties?.categories).toEqual(['essential', 'analytics'])
      expect(events[0].properties?.decisionTime).toBe(1500)
    })

    it('should calculate usage metrics', () => {
      // Track some API calls
      Analytics.trackAPICall('/api/widget/123', 'GET', 200, 150, 'site-123')
      Analytics.trackAPICall('/api/consent', 'POST', 200, 200, 'site-123')
      Analytics.trackAPICall('/api/widget/456', 'GET', 500, 300, 'site-456')

      const metrics = Analytics.getUsageMetrics('1h')
      expect(metrics.apiCalls.total).toBe(3)
      expect(metrics.apiCalls.errorRate).toBeCloseTo(33.33, 1)
      expect(metrics.totalSites).toBe(2) // site-123 and site-456
    })

    it('should export data in different formats', () => {
      Analytics.track('test_event', { key: 'value' })
      
      const jsonExport = Analytics.exportData('json')
      expect(jsonExport).toHaveProperty('events')
      expect(jsonExport).toHaveProperty('eventCounts')
      expect(jsonExport).toHaveProperty('exportedAt')

      const csvExport = Analytics.exportData('csv')
      expect(typeof csvExport).toBe('string')
      expect(csvExport).toContain('timestamp,event,siteId,userId,properties')
    })
  })

  describe('Performance Monitor', () => {
    it('should record endpoint performance', () => {
      PerformanceMonitor.recordEndpoint('/api/test', 150)
      PerformanceMonitor.recordEndpoint('/api/test', 200)
      PerformanceMonitor.recordEndpoint('/api/other', 100)

      const metrics = PerformanceMonitor.getAllMetrics()
      expect(metrics).toHaveLength(2)
      
      const testEndpoint = metrics.find(m => m.endpoint === '/api/test')
      expect(testEndpoint?.requests).toBe(2)
      expect(testEndpoint?.averageTime).toBe(175)
      expect(testEndpoint?.minTime).toBe(150)
      expect(testEndpoint?.maxTime).toBe(200)
    })

    it('should get metrics for specific endpoint', () => {
      PerformanceMonitor.recordEndpoint('/api/widget', 120)
      PerformanceMonitor.recordEndpoint('/api/widget', 180)

      const metrics = PerformanceMonitor.getEndpointMetrics('/api/widget')
      expect(metrics?.requests).toBe(2)
      expect(metrics?.averageTime).toBe(150)
    })
  })

  describe('Alert Manager', () => {
    it('should add and retrieve alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        metric: 'error_rate',
        condition: 'greater_than' as const,
        threshold: 5,
        timeWindow: '5m',
        severity: 'high' as const,
        enabled: true,
        channels: [{ type: 'console' as const, config: {}, enabled: true }],
        cooldown: 10
      }

      AlertManager.addRule(rule)
      
      const rules = AlertManager.getRules()
      expect(rules).toHaveLength(1)
      expect(rules[0].id).toBe('test-rule')
      expect(rules[0].name).toBe('Test Rule')
    })

    it('should remove alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        metric: 'error_rate',
        condition: 'greater_than' as const,
        threshold: 5,
        timeWindow: '5m',
        severity: 'high' as const,
        enabled: true,
        channels: [{ type: 'console' as const, config: {}, enabled: true }],
        cooldown: 10
      }

      AlertManager.addRule(rule)
      expect(AlertManager.getRules()).toHaveLength(1)

      const removed = AlertManager.removeRule('test-rule')
      expect(removed).toBe(true)
      expect(AlertManager.getRules()).toHaveLength(0)
    })

    it('should track active alerts', () => {
      // Initially no alerts
      expect(AlertManager.getActiveAlerts()).toHaveLength(0)
      expect(AlertManager.getAllAlerts()).toHaveLength(0)
    })
  })

  describe('Integration', () => {
    it('should work together for comprehensive monitoring', () => {
      // Track some activity
      Analytics.trackWidgetLoad('site-123')
      Analytics.trackConsentDecision('site-123', 'accept_all', ['essential'], 1000)
      
      // Log some events
      Logger.info('Widget loaded successfully', { siteId: 'site-123' })
      Logger.error('Failed to process consent', new Error('Database error'))

      // Record performance
      PerformanceMonitor.recordEndpoint('/api/widget/site-123', 150)
      PerformanceMonitor.recordEndpoint('/api/consent', 200)

      // Verify all systems have data
      expect(Analytics.getEvents()).toHaveLength(2)
      expect(Logger.getRecentLogs()).toHaveLength(2)
      expect(PerformanceMonitor.getAllMetrics()).toHaveLength(2)

      // Check error metrics
      const errorMetrics = Logger.getErrorMetrics()
      expect(errorMetrics.byLevel[LogLevel.ERROR]).toBe(1)
      expect(errorMetrics.byLevel[LogLevel.INFO]).toBe(1)

      // Check usage metrics
      const usageMetrics = Analytics.getUsageMetrics('1h')
      expect(usageMetrics.totalSites).toBe(1)
      expect(usageMetrics.totalConsents).toBe(1)
    })
  })
})