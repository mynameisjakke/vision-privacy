import { Redis } from '@upstash/redis'

// Initialize Redis client for caching
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Fallback in-memory cache for development
const memoryCache = new Map<string, { data: any; expires: number }>()

// Cache key prefixes
export const CACHE_KEYS = {
  WIDGET_CONFIG: 'widget:config:',
  SITE_DATA: 'site:data:',
  POLICY_TEMPLATE: 'policy:template:',
  COOKIE_CATEGORIES: 'cookie:categories',
  CONSENT_DATA: 'consent:data:',
  SCAN_RESULTS: 'scan:results:',
} as const

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  WIDGET_CONFIG: 300, // 5 minutes
  SITE_DATA: 600, // 10 minutes
  POLICY_TEMPLATE: 1800, // 30 minutes
  COOKIE_CATEGORIES: 3600, // 1 hour
  CONSENT_DATA: 86400, // 24 hours
  SCAN_RESULTS: 1800, // 30 minutes
} as const

/**
 * Cache interface for consistent caching operations
 */
export class CacheManager {
  /**
   * Get data from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (redis) {
        const data = await redis.get(key)
        return data as T
      }
      
      // Fallback to memory cache
      const cached = memoryCache.get(key)
      if (cached && Date.now() < cached.expires) {
        return cached.data as T
      }
      
      // Remove expired entry
      if (cached) {
        memoryCache.delete(key)
      }
      
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set data in cache with TTL
   */
  static async set(key: string, data: any, ttlSeconds: number): Promise<boolean> {
    try {
      if (redis) {
        await redis.setex(key, ttlSeconds, JSON.stringify(data))
        return true
      }
      
      // Fallback to memory cache
      memoryCache.set(key, {
        data,
        expires: Date.now() + (ttlSeconds * 1000)
      })
      
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete data from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      if (redis) {
        await redis.del(key)
        return true
      }
      
      // Fallback to memory cache
      return memoryCache.delete(key)
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      if (redis) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
        return keys.length
      }
      
      // Fallback to memory cache
      let deletedCount = 0
      const regex = new RegExp(pattern.replace('*', '.*'))
      
      for (const key of Array.from(memoryCache.keys())) {
        if (regex.test(key)) {
          memoryCache.delete(key)
          deletedCount++
        }
      }
      
      return deletedCount
    } catch (error) {
      console.error('Cache delete pattern error:', error)
      return 0
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (redis) {
        const exists = await redis.exists(key)
        return exists === 1
      }
      
      // Fallback to memory cache
      const cached = memoryCache.get(key)
      return cached !== undefined && Date.now() < cached.expires
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  static async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // Execute function to get fresh data
      const freshData = await fetchFunction()
      
      // Cache the result
      await this.set(key, freshData, ttlSeconds)
      
      return freshData
    } catch (error) {
      console.error('Cache getOrSet error:', error)
      // If caching fails, still return the fresh data
      return await fetchFunction()
    }
  }

  /**
   * Increment a counter in cache
   */
  static async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (redis) {
        const result = await redis.incr(key)
        if (ttlSeconds && result === 1) {
          // Set TTL only on first increment
          await redis.expire(key, ttlSeconds)
        }
        return result
      }
      
      // Fallback to memory cache
      const cached = memoryCache.get(key)
      const currentValue = (cached?.data as number) || 0
      const newValue = currentValue + 1
      
      const expires = ttlSeconds 
        ? Date.now() + (ttlSeconds * 1000)
        : (cached?.expires || Date.now() + 3600000) // Default 1 hour
      
      memoryCache.set(key, { data: newValue, expires })
      return newValue
    } catch (error) {
      console.error('Cache increment error:', error)
      return 1
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    redis_connected: boolean
    memory_cache_size: number
    memory_cache_keys: string[]
  }> {
    return {
      redis_connected: redis !== null,
      memory_cache_size: memoryCache.size,
      memory_cache_keys: Array.from(memoryCache.keys())
    }
  }
}

/**
 * Specific cache utilities for common operations
 */
export class WidgetCache {
  static async getConfig(siteId: string) {
    const key = `${CACHE_KEYS.WIDGET_CONFIG}${siteId}`
    return await CacheManager.get(key)
  }

  static async setConfig(siteId: string, config: any) {
    const key = `${CACHE_KEYS.WIDGET_CONFIG}${siteId}`
    return await CacheManager.set(key, config, CACHE_TTL.WIDGET_CONFIG)
  }

  static async invalidateConfig(siteId: string) {
    const key = `${CACHE_KEYS.WIDGET_CONFIG}${siteId}`
    return await CacheManager.delete(key)
  }

  static async invalidateAllConfigs() {
    const pattern = `${CACHE_KEYS.WIDGET_CONFIG}*`
    return await CacheManager.deletePattern(pattern)
  }
}

export class SiteCache {
  static async getData(siteId: string) {
    const key = `${CACHE_KEYS.SITE_DATA}${siteId}`
    return await CacheManager.get(key)
  }

  static async setData(siteId: string, data: any) {
    const key = `${CACHE_KEYS.SITE_DATA}${siteId}`
    return await CacheManager.set(key, data, CACHE_TTL.SITE_DATA)
  }

  static async invalidateData(siteId: string) {
    const key = `${CACHE_KEYS.SITE_DATA}${siteId}`
    return await CacheManager.delete(key)
  }
}

export class PolicyCache {
  static async getTemplate(type: string) {
    const key = `${CACHE_KEYS.POLICY_TEMPLATE}${type}`
    return await CacheManager.get(key)
  }

  static async setTemplate(type: string, template: any) {
    const key = `${CACHE_KEYS.POLICY_TEMPLATE}${type}`
    return await CacheManager.set(key, template, CACHE_TTL.POLICY_TEMPLATE)
  }

  static async invalidateTemplate(type: string) {
    const key = `${CACHE_KEYS.POLICY_TEMPLATE}${type}`
    return await CacheManager.delete(key)
  }

  static async invalidateAllTemplates() {
    const pattern = `${CACHE_KEYS.POLICY_TEMPLATE}*`
    return await CacheManager.deletePattern(pattern)
  }
}

export class CookieCache {
  static async getCategories() {
    return await CacheManager.get(CACHE_KEYS.COOKIE_CATEGORIES)
  }

  static async setCategories(categories: any) {
    return await CacheManager.set(CACHE_KEYS.COOKIE_CATEGORIES, categories, CACHE_TTL.COOKIE_CATEGORIES)
  }

  static async invalidateCategories() {
    return await CacheManager.delete(CACHE_KEYS.COOKIE_CATEGORIES)
  }
}

// Clean up expired entries from memory cache periodically
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of Array.from(memoryCache.entries())) {
      if (now >= entry.expires) {
        memoryCache.delete(key)
      }
    }
  }, 60000) // Clean up every minute
}