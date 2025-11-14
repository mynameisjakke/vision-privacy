import { supabaseAdmin } from './supabase'
import { SitesDB } from './database'

/**
 * Interface for detected cookies from database
 */
interface DetectedCookie {
  cookie_name: string
  cookie_domain: string
  cookie_category: string
  cookie_duration: string
  cookie_description?: string
}

/**
 * Interface for template variables that can be replaced
 */
export interface TemplateVariables {
  DOMAIN_NAME: string
  COMPANY_NAME: string
  COMPANY_NAME_OR_DOMAIN: string
  ORG_NUMBER: string
  COMPANY_ADDRESS: string
  CONTACT_EMAIL: string
  LAST_UPDATED_DATE: string
  ESSENTIAL_COOKIES_LIST: string
  FUNCTIONAL_COOKIES_LIST: string
  ANALYTICS_COOKIES_LIST: string
  ADVERTISING_COOKIES_LIST: string
  COOKIE_DETAILS_TABLE: string
  FORM_PLUGIN_NAME: string
  ECOM_PLUGIN_NAME: string
}

/**
 * Template cache entry
 */
interface TemplateCacheEntry {
  template: any
  timestamp: number
}

/**
 * PolicyTemplateEngine - Handles rendering of policy templates with dynamic data
 */
export class PolicyTemplateEngine {
  // In-memory cache for active templates
  private static templateCache: Map<string, TemplateCacheEntry> = new Map()
  private static readonly TEMPLATE_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

  // Compiled regex patterns for variable replacement (reused across renders)
  private static regexCache: Map<string, RegExp> = new Map()

  /**
   * Get or create a compiled regex pattern for a variable
   */
  private static getRegexPattern(key: string): RegExp {
    if (!this.regexCache.has(key)) {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      this.regexCache.set(key, new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'))
    }
    return this.regexCache.get(key)!
  }

  /**
   * Replace all template variables with actual data (optimized single-pass)
   */
  static renderTemplate(
    template: string,
    variables: Partial<TemplateVariables>
  ): string {
    // Single-pass replacement using pre-compiled regex patterns
    let rendered = template

    for (const [key, value] of Object.entries(variables)) {
      const replacement = value || ''
      const regex = this.getRegexPattern(key)
      rendered = rendered.replace(regex, replacement)
    }

    return rendered
  }

  /**
   * Get active template from cache or database
   */
  static async getActiveTemplate(templateType: 'banner' | 'policy' | 'cookie_notice'): Promise<any> {
    const cacheKey = `active:${templateType}`
    const cached = this.templateCache.get(cacheKey)

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < this.TEMPLATE_CACHE_TTL) {
      return cached.template
    }

    // Fetch from database
    const { PolicyTemplatesDB } = await import('./database')
    const template = await PolicyTemplatesDB.findActive(templateType)

    // Cache the template
    if (template) {
      this.templateCache.set(cacheKey, {
        template,
        timestamp: Date.now()
      })
    }

    return template
  }

  /**
   * Invalidate template cache for a specific type or all templates
   */
  static invalidateTemplateCache(templateType?: string): void {
    if (templateType) {
      const cacheKey = `active:${templateType}`
      this.templateCache.delete(cacheKey)
    } else {
      // Clear all template cache
      this.templateCache.clear()
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.templateCache.size,
      entries: Array.from(this.templateCache.keys())
    }
  }

  /**
   * Format date to DD-MM-YYYY format
   */
  static formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    
    return `${day}-${month}-${year}`
  }

  /**
   * Generate cookie list HTML for a specific category
   */
  static generateCookieList(
    cookies: DetectedCookie[],
    category: string
  ): string {
    // Filter cookies by category
    const categoryCookies = cookies.filter(
      (cookie) => cookie.cookie_category.toLowerCase() === category.toLowerCase()
    )

    // If no cookies found, return fallback text
    if (categoryCookies.length === 0) {
      return '<p><em>Inga cookies i denna kategori har upptäckts på webbplatsen.</em></p>'
    }

    // Generate HTML list
    const listItems = categoryCookies.map((cookie) => {
      const description = cookie.cookie_description 
        ? ` - ${cookie.cookie_description}` 
        : ''
      return `  <li><strong>${cookie.cookie_name}</strong> (${cookie.cookie_domain}, ${cookie.cookie_duration})${description}</li>`
    })

    return `<ul>\n${listItems.join('\n')}\n</ul>`
  }

  /**
   * Generate cookie details table HTML
   */
  static generateCookieTable(cookies: DetectedCookie[]): string {
    // If no cookies, return fallback message
    if (cookies.length === 0) {
      return '<p><em>Inga cookies har upptäckts på webbplatsen ännu.</em></p>'
    }

    // Generate table rows
    const rows = cookies.map((cookie) => {
      const categoryMap: Record<string, string> = {
        essential: 'Nödvändiga',
        functional: 'Funktionella',
        analytics: 'Analys',
        advertising: 'Marknadsföring'
      }
      
      const categoryLabel = categoryMap[cookie.cookie_category.toLowerCase()] || cookie.cookie_category
      
      return `    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${cookie.cookie_name}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${categoryLabel}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${cookie.cookie_duration}</td>
    </tr>`
    })

    return `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background: #f5f5f5;">
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Cookie-namn</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Kategori</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Lagringstid</th>
    </tr>
  </thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table>`
  }

  /**
   * Get site-specific variables from database
   */
  static async getSiteVariables(siteId: string): Promise<TemplateVariables> {
    // Fetch site data
    const site = await SitesDB.findById(siteId)
    
    if (!site) {
      throw new Error(`Site not found: ${siteId}`)
    }

    // Fetch all recent scans and use the one with most cookies detected
    const { data: recentScans } = await supabaseAdmin
      .from('client_scans')
      .select('detected_cookies')
      .eq('site_id', siteId)
      .eq('processed', true)
      .order('scan_timestamp', { ascending: false })
      .limit(10) // Get last 10 scans
    
    // Find the scan with the most cookies
    let latestScan = null
    if (recentScans && recentScans.length > 0) {
      latestScan = recentScans.reduce((best, current) => {
        const currentCount = Array.isArray(current.detected_cookies) ? current.detected_cookies.length : 0
        const bestCount = Array.isArray(best.detected_cookies) ? best.detected_cookies.length : 0
        return currentCount > bestCount ? current : best
      }, recentScans[0])
    }
    
    // Extract cookies from scan data and transform to our format
    const detectedCookies: DetectedCookie[] = []
    if (latestScan && latestScan.detected_cookies) {
      const cookiesArray = Array.isArray(latestScan.detected_cookies) 
        ? latestScan.detected_cookies 
        : []
      
      cookiesArray.forEach((cookie: any) => {
        detectedCookies.push({
          cookie_name: cookie.name || '',
          cookie_domain: cookie.domain || '',
          cookie_category: cookie.category || 'essential',
          cookie_duration: 'Session', // Default, could be enhanced
          cookie_description: cookie.description || ''
        })
      })
    }

    // Detect plugin names from installed_plugins
    const formPluginName = this.detectFormPlugin(site.installed_plugins || [])
    const ecomPluginName = this.detectEcommercePlugin(site.installed_plugins || [])

    // Build variables object with site metadata
    const variables: TemplateVariables = {
      DOMAIN_NAME: site.domain || '',
      COMPANY_NAME: site.company_name || '',
      COMPANY_NAME_OR_DOMAIN: site.company_name || site.domain || '',
      ORG_NUMBER: site.org_number || '',
      COMPANY_ADDRESS: site.company_address || '',
      CONTACT_EMAIL: site.contact_email || '',
      LAST_UPDATED_DATE: this.formatDate(new Date()),
      ESSENTIAL_COOKIES_LIST: this.generateCookieList(detectedCookies, 'essential'),
      FUNCTIONAL_COOKIES_LIST: this.generateCookieList(detectedCookies, 'functional'),
      ANALYTICS_COOKIES_LIST: this.generateCookieList(detectedCookies, 'analytics'),
      ADVERTISING_COOKIES_LIST: this.generateCookieList(detectedCookies, 'advertising'),
      COOKIE_DETAILS_TABLE: this.generateCookieTable(detectedCookies),
      FORM_PLUGIN_NAME: site.form_plugin || formPluginName,
      ECOM_PLUGIN_NAME: site.ecommerce_plugin || ecomPluginName
    }

    return variables
  }

  /**
   * Get demo variables for testing
   */
  static getDemoVariables(): TemplateVariables {
    // Create mock cookies for demo
    const demoCookies: DetectedCookie[] = [
      {
        cookie_name: 'vp_consent',
        cookie_domain: 'demo.visionprivacy.com',
        cookie_category: 'essential',
        cookie_duration: '12 månader',
        cookie_description: 'Lagrar dina cookie-preferenser'
      },
      {
        cookie_name: 'session_id',
        cookie_domain: 'demo.visionprivacy.com',
        cookie_category: 'essential',
        cookie_duration: 'Session',
        cookie_description: 'Identifierar din session'
      },
      {
        cookie_name: '_ga',
        cookie_domain: '.google.com',
        cookie_category: 'analytics',
        cookie_duration: '2 år',
        cookie_description: 'Google Analytics - spårar besökare'
      },
      {
        cookie_name: '_gid',
        cookie_domain: '.google.com',
        cookie_category: 'analytics',
        cookie_duration: '24 timmar',
        cookie_description: 'Google Analytics - identifierar användare'
      },
      {
        cookie_name: 'YSC',
        cookie_domain: '.youtube.com',
        cookie_category: 'functional',
        cookie_duration: 'Session',
        cookie_description: 'YouTube - videouppspelning'
      },
      {
        cookie_name: '_fbp',
        cookie_domain: '.facebook.com',
        cookie_category: 'advertising',
        cookie_duration: '3 månader',
        cookie_description: 'Facebook Pixel - spårning för annonser'
      }
    ]

    const variables: TemplateVariables = {
      DOMAIN_NAME: 'demo.visionprivacy.com',
      COMPANY_NAME: 'Demo Företag AB',
      COMPANY_NAME_OR_DOMAIN: 'Demo Företag AB',
      ORG_NUMBER: '556123-4567',
      COMPANY_ADDRESS: 'Demovägen 123, 123 45 Stockholm',
      CONTACT_EMAIL: 'info@demo.visionprivacy.com',
      LAST_UPDATED_DATE: this.formatDate(new Date()),
      ESSENTIAL_COOKIES_LIST: this.generateCookieList(demoCookies, 'essential'),
      FUNCTIONAL_COOKIES_LIST: this.generateCookieList(demoCookies, 'functional'),
      ANALYTICS_COOKIES_LIST: this.generateCookieList(demoCookies, 'analytics'),
      ADVERTISING_COOKIES_LIST: this.generateCookieList(demoCookies, 'advertising'),
      COOKIE_DETAILS_TABLE: this.generateCookieTable(demoCookies),
      FORM_PLUGIN_NAME: 'Contact Form 7',
      ECOM_PLUGIN_NAME: 'WooCommerce'
    }

    return variables
  }

  /**
   * Detect form plugin from installed plugins list
   */
  private static detectFormPlugin(installedPlugins: string[]): string {
    const formPlugins = [
      'Contact Form 7',
      'WPForms',
      'Gravity Forms',
      'Ninja Forms',
      'Formidable Forms',
      'Caldera Forms'
    ]

    for (const plugin of formPlugins) {
      if (installedPlugins.some(p => p.toLowerCase().includes(plugin.toLowerCase()))) {
        return plugin
      }
    }

    return 'kontaktformulär'
  }

  /**
   * Detect ecommerce plugin from installed plugins list
   */
  private static detectEcommercePlugin(installedPlugins: string[]): string {
    const ecomPlugins = [
      'WooCommerce',
      'Easy Digital Downloads',
      'WP eCommerce',
      'Shopify',
      'BigCommerce'
    ]

    for (const plugin of ecomPlugins) {
      if (installedPlugins.some(p => p.toLowerCase().includes(plugin.toLowerCase()))) {
        return plugin
      }
    }

    return 'e-handelsplattform'
  }
}
