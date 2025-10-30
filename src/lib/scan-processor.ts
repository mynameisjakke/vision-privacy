import { ClientScan, DetectedScript, DetectedCookie, Site } from '@/types'
import { SitesDB, PolicyTemplatesDB, SitePoliciesDB, ClientScansDB } from '@/lib/database'

// Known service patterns for categorization
const SERVICE_PATTERNS = {
  analytics: [
    { domain: 'google-analytics.com', name: 'Google Analytics', category: 'analytics' },
    { domain: 'googletagmanager.com', name: 'Google Tag Manager', category: 'analytics' },
    { domain: 'facebook.com', name: 'Facebook Pixel', category: 'analytics' },
    { domain: 'hotjar.com', name: 'Hotjar', category: 'analytics' },
    { domain: 'mixpanel.com', name: 'Mixpanel', category: 'analytics' },
    { domain: 'segment.com', name: 'Segment', category: 'analytics' }
  ],
  advertising: [
    { domain: 'doubleclick.net', name: 'Google Ads', category: 'advertising' },
    { domain: 'googlesyndication.com', name: 'Google AdSense', category: 'advertising' },
    { domain: 'facebook.com', name: 'Facebook Ads', category: 'advertising' },
    { domain: 'bing.com', name: 'Microsoft Advertising', category: 'advertising' },
    { domain: 'amazon-adsystem.com', name: 'Amazon Advertising', category: 'advertising' }
  ],
  social: [
    { domain: 'facebook.com', name: 'Facebook Social Plugin', category: 'social' },
    { domain: 'twitter.com', name: 'Twitter Widget', category: 'social' },
    { domain: 'linkedin.com', name: 'LinkedIn Plugin', category: 'social' },
    { domain: 'instagram.com', name: 'Instagram Embed', category: 'social' },
    { domain: 'youtube.com', name: 'YouTube Embed', category: 'social' }
  ],
  functional: [
    { domain: 'recaptcha.net', name: 'Google reCAPTCHA', category: 'functional' },
    { domain: 'stripe.com', name: 'Stripe Payment', category: 'functional' },
    { domain: 'paypal.com', name: 'PayPal', category: 'functional' },
    { domain: 'cloudflare.com', name: 'Cloudflare', category: 'functional' }
  ]
}

interface ProcessingResult {
  newServicesCount: number
  policyUpdated: boolean
  notificationsSent: boolean
  summary: {
    total_scripts: number
    total_cookies: number
    categorized_services: Record<string, number>
    new_services: string[]
  }
}

interface IdentifiedService {
  name: string
  domain: string
  category: string
  scripts: DetectedScript[]
  cookies: DetectedCookie[]
  isNew: boolean
}

/**
 * Main function to process a client scan
 */
export async function processClientScan(scanRecord: ClientScan): Promise<ProcessingResult> {
  try {
    // Get site information
    const site = await SitesDB.findById(scanRecord.site_id)
    if (!site) {
      throw new Error('Site not found')
    }

    // Identify services from detected scripts and cookies
    const identifiedServices = await identifyServices(scanRecord.detected_scripts, scanRecord.detected_cookies)
    
    // Check for new services compared to previous scans
    const newServices = await identifyNewServices(scanRecord.site_id, identifiedServices)
    
    // Update site policy if significant changes detected
    let policyUpdated = false
    if (newServices.length > 0) {
      policyUpdated = await updateSitePolicy(scanRecord.site_id, identifiedServices)
    }
    
    // Send notifications if significant changes detected
    let notificationsSent = false
    if (newServices.length > 0 && shouldNotify(newServices)) {
      notificationsSent = await sendChangeNotifications(site, newServices)
    }
    
    // Generate processing summary
    const summary = generateProcessingSummary(scanRecord, identifiedServices, newServices)
    
    return {
      newServicesCount: newServices.length,
      policyUpdated,
      notificationsSent,
      summary
    }
    
  } catch (error) {
    console.error('Scan processing error:', error)
    throw error
  }
}

/**
 * Identify services from detected scripts and cookies
 */
async function identifyServices(
  detectedScripts: DetectedScript[], 
  detectedCookies: DetectedCookie[]
): Promise<IdentifiedService[]> {
  const servicesMap = new Map<string, IdentifiedService>()
  
  // Process detected scripts
  for (const script of detectedScripts) {
    const service = identifyServiceFromScript(script)
    if (service) {
      const key = `${service.name}-${service.domain}`
      if (!servicesMap.has(key)) {
        servicesMap.set(key, {
          ...service,
          scripts: [script],
          cookies: [],
          isNew: false // Will be determined later
        })
      } else {
        servicesMap.get(key)!.scripts.push(script)
      }
    }
  }
  
  // Process detected cookies
  for (const cookie of detectedCookies) {
    const service = identifyServiceFromCookie(cookie)
    if (service) {
      const key = `${service.name}-${service.domain}`
      if (!servicesMap.has(key)) {
        servicesMap.set(key, {
          ...service,
          scripts: [],
          cookies: [cookie],
          isNew: false
        })
      } else {
        servicesMap.get(key)!.cookies.push(cookie)
      }
    }
  }
  
  return Array.from(servicesMap.values())
}

/**
 * Identify service from a detected script
 */
function identifyServiceFromScript(script: DetectedScript): { name: string; domain: string; category: string } | null {
  const scriptDomain = script.domain.toLowerCase()
  
  // Check all service patterns
  for (const [category, patterns] of Object.entries(SERVICE_PATTERNS)) {
    for (const pattern of patterns) {
      if (scriptDomain.includes(pattern.domain) || script.src.includes(pattern.domain)) {
        return {
          name: pattern.name,
          domain: pattern.domain,
          category: pattern.category
        }
      }
    }
  }
  
  // If no pattern matches, create a generic service entry
  return {
    name: `Third-party service (${scriptDomain})`,
    domain: scriptDomain,
    category: script.type || 'unknown'
  }
}

/**
 * Identify service from a detected cookie
 */
function identifyServiceFromCookie(cookie: DetectedCookie): { name: string; domain: string; category: string } | null {
  const cookieDomain = cookie.domain.toLowerCase()
  
  // Check all service patterns
  for (const [category, patterns] of Object.entries(SERVICE_PATTERNS)) {
    for (const pattern of patterns) {
      if (cookieDomain.includes(pattern.domain)) {
        return {
          name: pattern.name,
          domain: pattern.domain,
          category: pattern.category
        }
      }
    }
  }
  
  // If no pattern matches, use the cookie's category or default to functional
  return {
    name: `Service (${cookieDomain})`,
    domain: cookieDomain,
    category: cookie.category || 'functional'
  }
}

/**
 * Identify new services by comparing with previous scans
 */
export async function identifyNewServices(
  siteId: string, 
  currentServices: IdentifiedService[]
): Promise<IdentifiedService[]> {
  try {
    // Get recent scans (last 30 days) to compare against
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentScans = await ClientScansDB.list(
      { 
        site_id: siteId, 
        processed: true,
        scan_after: thirtyDaysAgo.toISOString()
      },
      { limit: 50, sort_by: 'scan_timestamp', sort_order: 'desc' }
    )
    
    // Extract all previously detected service domains
    const previousServiceDomains = new Set<string>()
    
    for (const scan of recentScans.data) {
      // Process scripts
      for (const script of scan.detected_scripts) {
        previousServiceDomains.add(script.domain.toLowerCase())
      }
      
      // Process cookies
      for (const cookie of scan.detected_cookies) {
        previousServiceDomains.add(cookie.domain.toLowerCase())
      }
    }
    
    // Identify truly new services
    const newServices = currentServices.filter(service => {
      const serviceDomain = service.domain.toLowerCase()
      return !previousServiceDomains.has(serviceDomain)
    })
    
    // Mark services as new
    newServices.forEach(service => {
      service.isNew = true
    })
    
    return newServices
    
  } catch (error) {
    console.error('Error identifying new services:', error)
    return [] // Return empty array on error to avoid blocking processing
  }
}

/**
 * Update site policy based on detected services
 */
export async function updateSitePolicy(
  siteId: string, 
  identifiedServices: IdentifiedService[]
): Promise<boolean> {
  try {
    // Get current site policy
    const currentPolicy = await SitePoliciesDB.findBySiteId(siteId)
    
    // Get active policy template
    const policyTemplate = await PolicyTemplatesDB.findActive('policy')
    if (!policyTemplate) {
      console.warn('No active policy template found')
      return false
    }
    
    // Generate updated policy content
    const updatedPolicyContent = generatePolicyContent(policyTemplate.content, identifiedServices)
    
    // Update or create site policy
    await SitePoliciesDB.upsert({
      site_id: siteId,
      policy_content: updatedPolicyContent,
      banner_config: currentPolicy?.banner_config || getDefaultBannerConfig(),
      last_updated: new Date().toISOString(),
      template_version: policyTemplate.version
    })
    
    return true
    
  } catch (error) {
    console.error('Error updating site policy:', error)
    return false
  }
}

/**
 * Generate policy content with detected services
 */
function generatePolicyContent(template: string, services: IdentifiedService[]): string {
  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, IdentifiedService[]>)
  
  // Generate service lists for each category
  let policyContent = template
  
  // Replace template placeholders with actual service data
  for (const [category, categoryServices] of Object.entries(servicesByCategory)) {
    const serviceList = categoryServices
      .map(service => `- ${service.name} (${service.domain})`)
      .join('\n')
    
    const placeholder = `{{${category.toUpperCase()}_SERVICES}}`
    policyContent = policyContent.replace(placeholder, serviceList)
  }
  
  // Add timestamp
  policyContent = policyContent.replace('{{LAST_UPDATED}}', new Date().toLocaleDateString())
  
  return policyContent
}

/**
 * Determine if notifications should be sent based on detected changes
 */
function shouldNotify(newServices: IdentifiedService[]): boolean {
  // Send notifications for:
  // 1. Any new advertising or analytics services
  // 2. More than 2 new services of any type
  // 3. New services that handle personal data
  
  const significantCategories = ['advertising', 'analytics']
  const hasSignificantServices = newServices.some(service => 
    significantCategories.includes(service.category)
  )
  
  return hasSignificantServices || newServices.length > 2
}

/**
 * Send change notifications (placeholder implementation)
 */
async function sendChangeNotifications(site: Site, newServices: IdentifiedService[]): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Send email notifications to site administrators
    // 2. Create dashboard notifications
    // 3. Log significant changes for audit purposes
    
    console.log(`Notifications would be sent for site ${site.domain}:`, {
      new_services: newServices.map(s => ({ name: s.name, category: s.category })),
      timestamp: new Date().toISOString()
    })
    
    // For now, just log the notification
    // TODO: Implement actual notification system
    
    return true
    
  } catch (error) {
    console.error('Error sending notifications:', error)
    return false
  }
}

/**
 * Generate processing summary
 */
function generateProcessingSummary(
  scanRecord: ClientScan,
  identifiedServices: IdentifiedService[],
  newServices: IdentifiedService[]
): ProcessingResult['summary'] {
  const categorizedServices = identifiedServices.reduce((acc, service) => {
    acc[service.category] = (acc[service.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    total_scripts: scanRecord.detected_scripts.length,
    total_cookies: scanRecord.detected_cookies.length,
    categorized_services: categorizedServices,
    new_services: newServices.map(service => service.name)
  }
}

/**
 * Get default banner configuration
 */
function getDefaultBannerConfig() {
  return {
    title: 'Cookie Consent',
    description: 'We use cookies to enhance your browsing experience and analyze our traffic. Please choose your preferences.',
    accept_all_text: 'Accept All',
    reject_all_text: 'Reject All',
    settings_text: 'Cookie Settings',
    privacy_policy_text: 'Privacy Policy',
    theme: 'light' as const,
    position: 'bottom' as const,
    layout: 'banner' as const
  }
}