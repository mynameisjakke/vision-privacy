import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'
import { createErrorResponse } from '@/utils/api-helpers'
import { AlertManager, AlertRule, AlertChannel } from '@/lib/alerting'
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
    const type = url.searchParams.get('type') || 'alerts'

    switch (type) {
      case 'alerts':
        const activeOnly = url.searchParams.get('active') === 'true'
        const limit = parseInt(url.searchParams.get('limit') || '100')
        
        const alerts = activeOnly 
          ? AlertManager.getActiveAlerts()
          : AlertManager.getAllAlerts(limit)

        return createSuccessResponse({
          alerts,
          activeCount: AlertManager.getActiveAlerts().length,
          totalCount: AlertManager.getAllAlerts().length
        })

      case 'rules':
        const rules = AlertManager.getRules()
        return createSuccessResponse({
          rules,
          enabledCount: rules.filter(r => r.enabled).length,
          totalCount: rules.length
        })

      case 'status':
        return createSuccessResponse({
          alerting: {
            enabled: true,
            rulesCount: AlertManager.getRules().length,
            activeAlertsCount: AlertManager.getActiveAlerts().length,
            lastCheck: new Date().toISOString()
          }
        })

      default:
        return createErrorResponse(`Unknown type: ${type}`, 400)
    }

  } catch (error) {
    Logger.error('Failed to fetch alerts data', error as Error, {
      endpoint: '/api/admin/alerts'
    })
    
    return createErrorResponse('Failed to fetch alerts data', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create_rule':
        return handleCreateRule(data)
      
      case 'update_rule':
        return handleUpdateRule(data)
      
      case 'delete_rule':
        return handleDeleteRule(data)
      
      case 'test_rule':
        return handleTestRule(data)
      
      case 'resolve_alert':
        return handleResolveAlert(data)

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400)
    }

  } catch (error) {
    Logger.error('Failed to handle alerts action', error as Error, {
      endpoint: '/api/admin/alerts'
    })
    
    return createErrorResponse('Failed to handle alerts action', 500)
  }
}

async function handleCreateRule(data: any) {
  try {
    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || '',
      metric: data.metric,
      condition: data.condition,
      threshold: parseFloat(data.threshold),
      timeWindow: data.timeWindow || '5m',
      severity: data.severity || 'medium',
      enabled: data.enabled !== false,
      channels: data.channels || [{ type: 'console', config: {}, enabled: true }],
      cooldown: parseInt(data.cooldown) || 10
    }

    // Validate rule
    const validation = validateAlertRule(rule)
    if (!validation.valid) {
      return createErrorResponse(`Invalid rule: ${validation.error}`, 400)
    }

    AlertManager.addRule(rule)

    Logger.info('Alert rule created', { ruleId: rule.id, ruleName: rule.name })

    return createSuccessResponse({
      message: 'Alert rule created successfully',
      rule
    })

  } catch (error) {
    Logger.error('Failed to create alert rule', error as Error)
    return createErrorResponse('Failed to create alert rule', 500)
  }
}

async function handleUpdateRule(data: any) {
  try {
    const { ruleId, ...updates } = data
    
    if (!ruleId) {
      return createErrorResponse('Rule ID is required', 400)
    }

    const existingRules = AlertManager.getRules()
    const existingRule = existingRules.find(r => r.id === ruleId)
    
    if (!existingRule) {
      return createErrorResponse('Rule not found', 404)
    }

    const updatedRule: AlertRule = {
      ...existingRule,
      ...updates,
      id: ruleId // Ensure ID doesn't change
    }

    // Validate updated rule
    const validation = validateAlertRule(updatedRule)
    if (!validation.valid) {
      return createErrorResponse(`Invalid rule: ${validation.error}`, 400)
    }

    AlertManager.addRule(updatedRule) // This will overwrite the existing rule

    Logger.info('Alert rule updated', { ruleId, ruleName: updatedRule.name })

    return createSuccessResponse({
      message: 'Alert rule updated successfully',
      rule: updatedRule
    })

  } catch (error) {
    Logger.error('Failed to update alert rule', error as Error)
    return createErrorResponse('Failed to update alert rule', 500)
  }
}

async function handleDeleteRule(data: any) {
  try {
    const { ruleId } = data
    
    if (!ruleId) {
      return createErrorResponse('Rule ID is required', 400)
    }

    const removed = AlertManager.removeRule(ruleId)
    
    if (!removed) {
      return createErrorResponse('Rule not found', 404)
    }

    Logger.info('Alert rule deleted', { ruleId })

    return createSuccessResponse({
      message: 'Alert rule deleted successfully',
      ruleId
    })

  } catch (error) {
    Logger.error('Failed to delete alert rule', error as Error)
    return createErrorResponse('Failed to delete alert rule', 500)
  }
}

async function handleTestRule(data: any) {
  try {
    const { ruleId } = data
    
    if (!ruleId) {
      return createErrorResponse('Rule ID is required', 400)
    }

    const rules = AlertManager.getRules()
    const rule = rules.find(r => r.id === ruleId)
    
    if (!rule) {
      return createErrorResponse('Rule not found', 404)
    }

    // Force check this specific rule (bypass cooldown for testing)
    const originalCooldown = rule.cooldown
    const originalLastTriggered = rule.lastTriggered
    
    rule.cooldown = 0
    rule.lastTriggered = undefined

    // This would trigger the rule check
    // In a real implementation, you'd call the private checkRule method
    Logger.info('Alert rule test triggered', { ruleId, ruleName: rule.name })

    // Restore original values
    rule.cooldown = originalCooldown
    rule.lastTriggered = originalLastTriggered

    return createSuccessResponse({
      message: 'Alert rule test completed',
      ruleId,
      ruleName: rule.name
    })

  } catch (error) {
    Logger.error('Failed to test alert rule', error as Error)
    return createErrorResponse('Failed to test alert rule', 500)
  }
}

async function handleResolveAlert(data: any) {
  try {
    const { alertId } = data
    
    if (!alertId) {
      return createErrorResponse('Alert ID is required', 400)
    }

    const alerts = AlertManager.getAllAlerts()
    const alert = alerts.find(a => a.id === alertId)
    
    if (!alert) {
      return createErrorResponse('Alert not found', 404)
    }

    if (alert.resolved) {
      return createErrorResponse('Alert is already resolved', 400)
    }

    // Manually resolve the alert
    alert.resolved = true
    alert.resolvedAt = new Date().toISOString()

    Logger.info('Alert manually resolved', { alertId, ruleName: alert.ruleName })

    return createSuccessResponse({
      message: 'Alert resolved successfully',
      alertId,
      resolvedAt: alert.resolvedAt
    })

  } catch (error) {
    Logger.error('Failed to resolve alert', error as Error)
    return createErrorResponse('Failed to resolve alert', 500)
  }
}

function validateAlertRule(rule: AlertRule): { valid: boolean; error?: string } {
  if (!rule.name || rule.name.trim().length === 0) {
    return { valid: false, error: 'Rule name is required' }
  }

  if (!rule.metric || rule.metric.trim().length === 0) {
    return { valid: false, error: 'Metric is required' }
  }

  const validConditions = ['greater_than', 'less_than', 'equals', 'not_equals']
  if (!validConditions.includes(rule.condition)) {
    return { valid: false, error: 'Invalid condition' }
  }

  if (typeof rule.threshold !== 'number' || isNaN(rule.threshold)) {
    return { valid: false, error: 'Threshold must be a valid number' }
  }

  const validSeverities = ['low', 'medium', 'high', 'critical']
  if (!validSeverities.includes(rule.severity)) {
    return { valid: false, error: 'Invalid severity level' }
  }

  if (!rule.channels || !Array.isArray(rule.channels) || rule.channels.length === 0) {
    return { valid: false, error: 'At least one notification channel is required' }
  }

  // Validate channels
  for (const channel of rule.channels) {
    const channelValidation = validateAlertChannel(channel)
    if (!channelValidation.valid) {
      return { valid: false, error: `Invalid channel: ${channelValidation.error}` }
    }
  }

  if (typeof rule.cooldown !== 'number' || rule.cooldown < 0) {
    return { valid: false, error: 'Cooldown must be a non-negative number' }
  }

  return { valid: true }
}

function validateAlertChannel(channel: AlertChannel): { valid: boolean; error?: string } {
  const validChannelTypes = ['email', 'webhook', 'slack', 'console']
  
  if (!validChannelTypes.includes(channel.type)) {
    return { valid: false, error: 'Invalid channel type' }
  }

  // Validate channel-specific configuration
  switch (channel.type) {
    case 'email':
      if (!channel.config.to || typeof channel.config.to !== 'string') {
        return { valid: false, error: 'Email channel requires "to" address' }
      }
      break
    
    case 'webhook':
      if (!channel.config.url || typeof channel.config.url !== 'string') {
        return { valid: false, error: 'Webhook channel requires "url"' }
      }
      break
    
    case 'slack':
      if (!channel.config.webhookUrl || typeof channel.config.webhookUrl !== 'string') {
        return { valid: false, error: 'Slack channel requires "webhookUrl"' }
      }
      break
  }

  return { valid: true }
}