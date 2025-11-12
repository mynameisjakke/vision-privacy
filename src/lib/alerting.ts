/**
 * Alerting and notification system for Vision Privacy
 * Monitors system health and sends alerts when thresholds are exceeded
 */

import { Logger } from './logger'
import { PerformanceMonitor } from './performance'
import { Analytics } from './analytics'

export interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals'
  threshold: number
  timeWindow: string // e.g., '5m', '1h', '24h'
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  channels: AlertChannel[]
  cooldown: number // minutes between alerts
  lastTriggered?: string
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack' | 'console'
  config: Record<string, any>
  enabled: boolean
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  metric: string
  currentValue: number
  threshold: number
  resolved: boolean
  resolvedAt?: string
}

/**
 * Alert manager for monitoring and notifications
 */
export class AlertManager {
  private static rules: Map<string, AlertRule> = new Map()
  private static alerts: Alert[] = []
  private static maxAlerts = 1000

  /**
   * Add or update an alert rule
   */
  static addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule)
    Logger.info('Alert rule added', { ruleId: rule.id, ruleName: rule.name })
  }

  /**
   * Remove an alert rule
   */
  static removeRule(ruleId: string) {
    const removed = this.rules.delete(ruleId)
    if (removed) {
      Logger.info('Alert rule removed', { ruleId })
    }
    return removed
  }

  /**
   * Get all alert rules
   */
  static getRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  static getAllAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit).reverse()
  }

  /**
   * Check all alert rules and trigger alerts if needed
   */
  static async checkAlerts() {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue

      try {
        await this.checkRule(rule)
      } catch (error) {
        Logger.error('Failed to check alert rule', error as Error, {
          ruleId: rule.id,
          ruleName: rule.name
        })
      }
    }
  }

  /**
   * Check a specific alert rule
   */
  private static async checkRule(rule: AlertRule) {
    // Check cooldown period
    if (rule.lastTriggered) {
      const lastTriggeredTime = new Date(rule.lastTriggered).getTime()
      const cooldownMs = rule.cooldown * 60 * 1000
      if (Date.now() - lastTriggeredTime < cooldownMs) {
        return // Still in cooldown period
      }
    }

    // Get current metric value
    const currentValue = await this.getMetricValue(rule.metric, rule.timeWindow)
    if (currentValue === null) {
      Logger.warn('Could not get metric value for alert rule', {
        ruleId: rule.id,
        metric: rule.metric
      })
      return
    }

    // Check if alert condition is met
    const shouldAlert = this.evaluateCondition(currentValue, rule.condition, rule.threshold)
    
    if (shouldAlert) {
      await this.triggerAlert(rule, currentValue)
    } else {
      // Check if we should resolve any existing alerts for this rule
      this.resolveAlertsForRule(rule.id)
    }
  }

  /**
   * Get current value for a metric
   */
  private static async getMetricValue(metric: string, timeWindow: string): Promise<number | null> {
    try {
      switch (metric) {
        case 'error_rate':
          const errorMetrics = Logger.getErrorMetrics()
          const totalLogs = errorMetrics.total
          const errorLogs = errorMetrics.byLevel[3] + errorMetrics.byLevel[4] // ERROR + FATAL
          return totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0

        case 'response_time_avg':
          const perfMetrics = PerformanceMonitor.getAllMetrics()
          if (perfMetrics.length === 0) return 0
          const avgResponseTime = perfMetrics.reduce((sum, m) => sum + m.averageTime, 0) / perfMetrics.length
          return avgResponseTime

        case 'response_time_p95':
          const allMetrics = PerformanceMonitor.getAllMetrics()
          if (allMetrics.length === 0) return 0
          const responseTimes = allMetrics.map(m => m.averageTime).sort((a, b) => a - b)
          const p95Index = Math.floor(responseTimes.length * 0.95)
          return responseTimes[p95Index] || 0

        case 'memory_usage':
          if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage()
            return memUsage.heapUsed / 1024 / 1024 // MB
          }
          return 0

        case 'api_calls_per_minute':
          const usageMetrics = Analytics.getUsageMetrics('1h')
          return usageMetrics.apiCalls.total / 60 // Approximate calls per minute

        case 'consent_rate':
          const overallUsage = Analytics.getUsageMetrics(timeWindow)
          // This would need to be calculated based on widget loads vs consents
          return 0 // Placeholder

        case 'uptime':
          return process.uptime ? process.uptime() / 3600 : 0 // Hours

        default:
          Logger.warn('Unknown metric for alerting', { metric })
          return null
      }
    } catch (error) {
      Logger.error('Failed to get metric value', error as Error, { metric })
      return null
    }
  }

  /**
   * Evaluate alert condition
   */
  private static evaluateCondition(
    currentValue: number,
    condition: AlertRule['condition'],
    threshold: number
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return currentValue > threshold
      case 'less_than':
        return currentValue < threshold
      case 'equals':
        return currentValue === threshold
      case 'not_equals':
        return currentValue !== threshold
      default:
        return false
    }
  }

  /**
   * Trigger an alert
   */
  private static async triggerAlert(rule: AlertRule, currentValue: number) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      message: this.generateAlertMessage(rule, currentValue),
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      resolved: false
    }

    // Add to alerts array
    this.alerts.push(alert)
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts)
    }

    // Update rule's last triggered time
    rule.lastTriggered = alert.timestamp

    // Send notifications
    await this.sendNotifications(alert, rule.channels)

    Logger.error('Alert triggered', undefined, {
      alertId: alert.id,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      currentValue,
      threshold: rule.threshold
    })
  }

  /**
   * Generate alert message
   */
  private static generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const condition = rule.condition.replace('_', ' ')
    return `${rule.name}: ${rule.metric} is ${currentValue.toFixed(2)} (${condition} ${rule.threshold})`
  }

  /**
   * Resolve alerts for a rule
   */
  private static resolveAlertsForRule(ruleId: string) {
    const activeAlerts = this.alerts.filter(alert => 
      alert.ruleId === ruleId && !alert.resolved
    )

    activeAlerts.forEach(alert => {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
      
      Logger.info('Alert resolved', {
        alertId: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.ruleName
      })
    })
  }

  /**
   * Send notifications through configured channels
   */
  private static async sendNotifications(alert: Alert, channels: AlertChannel[]) {
    for (const channel of channels) {
      if (!channel.enabled) continue

      try {
        await this.sendNotification(alert, channel)
      } catch (error) {
        Logger.error('Failed to send alert notification', error as Error, {
          alertId: alert.id,
          channelType: channel.type
        })
      }
    }
  }

  /**
   * Send notification through a specific channel
   */
  private static async sendNotification(alert: Alert, channel: AlertChannel) {
    switch (channel.type) {
      case 'console':
        console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`)
        break

      case 'webhook':
        if (channel.config.url) {
          await fetch(channel.config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(channel.config.headers || {})
            },
            body: JSON.stringify({
              alert,
              service: 'vision-privacy',
              environment: process.env.NODE_ENV
            })
          })
        }
        break

      case 'email':
        // In a real implementation, you would integrate with an email service
        Logger.info('Email alert would be sent', {
          to: channel.config.to,
          subject: `Vision Privacy Alert: ${alert.ruleName}`,
          message: alert.message
        })
        break

      case 'slack':
        if (channel.config.webhookUrl) {
          const slackMessage = {
            text: `🚨 Vision Privacy Alert`,
            attachments: [{
              color: this.getSeverityColor(alert.severity),
              fields: [
                { title: 'Rule', value: alert.ruleName, short: true },
                { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
                { title: 'Metric', value: alert.metric, short: true },
                { title: 'Current Value', value: alert.currentValue.toString(), short: true },
                { title: 'Threshold', value: alert.threshold.toString(), short: true },
                { title: 'Time', value: alert.timestamp, short: true }
              ]
            }]
          }

          await fetch(channel.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackMessage)
          })
        }
        break

      default:
        Logger.warn('Unknown alert channel type', { channelType: channel.type })
    }
  }

  /**
   * Get color for Slack based on severity
   */
  private static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return 'good'
      case 'medium': return 'warning'
      case 'high': return 'danger'
      case 'critical': return '#ff0000'
      default: return 'warning'
    }
  }

  /**
   * Initialize default alert rules
   */
  static initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 5,
        timeWindow: '5m',
        severity: 'high',
        enabled: true,
        channels: [{ type: 'console', config: {}, enabled: true }],
        cooldown: 15
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Alert when average response time exceeds 2 seconds',
        metric: 'response_time_avg',
        condition: 'greater_than',
        threshold: 2000,
        timeWindow: '5m',
        severity: 'medium',
        enabled: true,
        channels: [{ type: 'console', config: {}, enabled: true }],
        cooldown: 10
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 800MB',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 800,
        timeWindow: '1m',
        severity: 'high',
        enabled: true,
        channels: [{ type: 'console', config: {}, enabled: true }],
        cooldown: 5
      }
    ]

    defaultRules.forEach(rule => this.addRule(rule))
    Logger.info('Default alert rules initialized', { ruleCount: defaultRules.length })
  }

  /**
   * Clear all alerts and rules (useful for testing)
   */
  static clear() {
    this.rules.clear()
    this.alerts = []
  }
}

// Initialize default rules and start monitoring
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') { // Only run on server, not in tests
  AlertManager.initializeDefaultRules()
  
  // Check alerts every minute
  setInterval(() => {
    AlertManager.checkAlerts()
  }, 60 * 1000)
}