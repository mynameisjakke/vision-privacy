/**
 * Centralized logging and error tracking system for Vision Privacy
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  requestId?: string
  userId?: string
  siteId?: string
  endpoint?: string
  userAgent?: string
  ip?: string
}

export interface ErrorMetrics {
  total: number
  byLevel: Record<LogLevel, number>
  byEndpoint: Record<string, number>
  recent: LogEntry[]
  topErrors: Array<{
    message: string
    count: number
    lastSeen: string
  }>
}

/**
 * Logger class with structured logging and error tracking
 */
export class Logger {
  private static logs: LogEntry[] = []
  private static maxLogs = 1000
  private static errorCounts = new Map<string, { count: number; lastSeen: string }>()

  /**
   * Log a debug message
   */
  static debug(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.DEBUG, message, context, undefined, requestId)
  }

  /**
   * Log an info message
   */
  static info(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.INFO, message, context, undefined, requestId)
  }

  /**
   * Log a warning message
   */
  static warn(message: string, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.WARN, message, context, undefined, requestId)
  }

  /**
   * Log an error message
   */
  static error(message: string, error?: Error, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.ERROR, message, context, error, requestId)
    
    // Track error frequency
    const errorKey = error ? `${message}:${error.name}` : message
    const existing = this.errorCounts.get(errorKey)
    if (existing) {
      existing.count++
      existing.lastSeen = new Date().toISOString()
    } else {
      this.errorCounts.set(errorKey, {
        count: 1,
        lastSeen: new Date().toISOString()
      })
    }
  }

  /**
   * Log a fatal error message
   */
  static fatal(message: string, error?: Error, context?: Record<string, any>, requestId?: string) {
    this.log(LogLevel.FATAL, message, context, error, requestId)
    
    // For fatal errors, also log to console immediately
    console.error('FATAL ERROR:', message, error, context)
  }

  /**
   * Core logging method
   */
  private static log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    requestId?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      requestId
    }

    // Add to in-memory logs
    this.logs.push(entry)

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry)
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && level >= LogLevel.ERROR) {
      this.logToExternalService(entry)
    }
  }

  /**
   * Log to console with appropriate formatting
   */
  private static logToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp
    const levelName = LogLevel[entry.level]
    const prefix = `[${timestamp}] ${levelName}:`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context)
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context)
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.error, entry.context)
        break
    }
  }

  /**
   * Send logs to external service (placeholder for production)
   */
  private static async logToExternalService(entry: LogEntry) {
    // In a real implementation, you might send to:
    // - Sentry for error tracking
    // - DataDog for logging
    // - LogRocket for session replay
    // - Custom webhook endpoint
    
    try {
      // Example: Send to webhook endpoint
      if (process.env.LOG_WEBHOOK_URL) {
        await fetch(process.env.LOG_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOG_WEBHOOK_TOKEN}`
          },
          body: JSON.stringify({
            service: 'vision-privacy',
            environment: process.env.NODE_ENV,
            ...entry
          })
        })
      }
    } catch (error) {
      // Don't let logging errors break the application
      console.error('Failed to send log to external service:', error)
    }
  }

  /**
   * Get recent logs
   */
  static getRecentLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level)
    }
    
    return filteredLogs.slice(-limit).reverse()
  }

  /**
   * Get error metrics
   */
  static getErrorMetrics(): ErrorMetrics {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    }

    const byEndpoint: Record<string, number> = {}
    let total = 0

    // Count logs by level and endpoint
    for (const log of this.logs) {
      byLevel[log.level]++
      total++
      
      if (log.endpoint) {
        byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] || 0) + 1
      }
    }

    // Get top errors
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get recent error logs
    const recent = this.logs
      .filter(log => log.level >= LogLevel.ERROR)
      .slice(-20)
      .reverse()

    return {
      total,
      byLevel,
      byEndpoint,
      recent,
      topErrors
    }
  }

  /**
   * Clear logs (useful for testing)
   */
  static clear() {
    this.logs = []
    this.errorCounts.clear()
  }

  /**
   * Create a request-scoped logger
   */
  static forRequest(requestId: string, endpoint?: string, userId?: string, siteId?: string) {
    return {
      debug: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.DEBUG, message, { ...context, endpoint, userId, siteId }, undefined, requestId),
      
      info: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.INFO, message, { ...context, endpoint, userId, siteId }, undefined, requestId),
      
      warn: (message: string, context?: Record<string, any>) =>
        this.log(LogLevel.WARN, message, { ...context, endpoint, userId, siteId }, undefined, requestId),
      
      error: (message: string, error?: Error, context?: Record<string, any>) =>
        this.log(LogLevel.ERROR, message, { ...context, endpoint, userId, siteId }, error, requestId),
      
      fatal: (message: string, error?: Error, context?: Record<string, any>) =>
        this.log(LogLevel.FATAL, message, { ...context, endpoint, userId, siteId }, error, requestId)
    }
  }
}

/**
 * Request ID generator for tracing
 */
export class RequestTracer {
  /**
   * Generate a unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Extract request information for logging
   */
  static extractRequestInfo(request: Request) {
    const url = new URL(request.url)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    return {
      method: request.method,
      path: url.pathname,
      query: url.search,
      userAgent,
      ip: this.hashIP(ip), // Hash IP for privacy
      referer: request.headers.get('referer') || undefined
    }
  }

  /**
   * Hash IP address for privacy compliance
   */
  private static hashIP(ip: string): string {
    // Simple hash for IP privacy - in production use crypto.subtle
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `ip_${Math.abs(hash).toString(16)}`
  }
}

/**
 * Performance and error tracking middleware
 */
export function withLogging<T extends any[], R>(
  endpoint: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const requestId = RequestTracer.generateRequestId()
    const logger = Logger.forRequest(requestId, endpoint)
    const startTime = performance.now()

    logger.info(`Request started`, { endpoint })

    try {
      const result = await handler(...args)
      const duration = performance.now() - startTime
      
      logger.info(`Request completed`, { 
        endpoint, 
        duration: `${duration.toFixed(2)}ms`,
        success: true
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      logger.error(`Request failed`, error as Error, {
        endpoint,
        duration: `${duration.toFixed(2)}ms`,
        success: false
      })

      throw error
    }
  }
}

// Clean up old error counts periodically
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') { // Only run on server, not in tests
  setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    // Clean up error counts older than 24 hours
    for (const [key, data] of Logger['errorCounts'].entries()) {
      if (new Date(data.lastSeen).getTime() < oneDayAgo) {
        Logger['errorCounts'].delete(key)
      }
    }
  }, 60 * 60 * 1000) // Clean up every hour
}