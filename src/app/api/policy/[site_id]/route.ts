import { NextRequest } from 'next/server'
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, widgetConfigSchema } from '@/lib/validation'
import { SitesDB, PolicyTemplatesDB, ClientScansDB } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { site_id: string } }
) {
  try {
    const { site_id } = params
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const format = searchParams.get('format') || 'html' // 'html' or 'json'
    const type = searchParams.get('type') || 'privacy' // 'privacy' or 'cookie'
    
    // Validate site_id format
    const validation = validateRequest(widgetConfigSchema, { site_id })
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    // Get site information
    const site = await SitesDB.getById(site_id)
    if (!site) {
      return createNotFoundResponse('Site not found')
    }
    
    // Check if site is active
    if (site.status !== 'active') {
      return createNotFoundResponse('Site is not active')
    }
    
    // Get appropriate template based on type
    // Note: 'policy' template type is used for both cookie and privacy policies
    // The type parameter determines which default template to use if no custom template exists
    const policyTemplate = await PolicyTemplatesDB.findActive('policy')
    
    // Get latest client scan data for this site
    const latestScan = await ClientScansDB.getLatestBySiteId(site_id)
    
    // Generate dynamic policy content
    const policyContent = generatePolicyContent(
      policyTemplate?.content || getDefaultPolicyTemplate(type),
      site,
      latestScan
    )
    
    // Return JSON response for modal display
    if (format === 'json') {
      return createSuccessResponse({
        policy_content: policyContent,
        type: type,
        last_updated: new Date().toISOString(),
        site_domain: new URL(site.domain).hostname
      })
    }
    
    // Return HTML response for direct viewing (backward compatibility)
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${type === 'cookie' ? 'Cookie Policy' : 'Privacy Policy'} - ${new URL(site.domain).hostname}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3 { color: #2c3e50; }
          .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .detected-services { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .service-list { list-style-type: none; padding: 0; }
          .service-item { padding: 5px 0; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        ${policyContent}
      </body>
      </html>
    `
    
    const response = new Response(htmlResponse, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
        'Vary': 'Accept-Encoding'
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Policy fetch failed:', error)
    return createNotFoundResponse('Privacy policy unavailable')
  }
}

function generatePolicyContent(template: string, site: any, latestScan: any): string {
  const siteDomain = new URL(site.domain).hostname
  const currentDate = new Date().toLocaleDateString()
  
  // Extract detected services from scan data
  const detectedServices = latestScan?.detected_scripts || []
  const detectedCookies = latestScan?.detected_cookies || []
  
  // Generate services list
  const servicesHtml = generateServicesSection(detectedServices, detectedCookies)
  
  return template
    .replace(/{{SITE_DOMAIN}}/g, siteDomain)
    .replace(/{{SITE_NAME}}/g, siteDomain)
    .replace(/{{CURRENT_DATE}}/g, currentDate)
    .replace(/{{LAST_UPDATED}}/g, currentDate)
    .replace(/{{DETECTED_SERVICES}}/g, servicesHtml)
    .replace(/{{CONTACT_EMAIL}}/g, `privacy@${siteDomain}`)
}

function generateServicesSection(scripts: any[], cookies: any[]): string {
  if (!scripts.length && !cookies.length) {
    return '<p>No third-party services detected on this website.</p>'
  }
  
  let html = '<div class="detected-services">'
  html += '<h3>Third-Party Services Detected</h3>'
  
  if (scripts.length > 0) {
    html += '<h4>Analytics and Tracking Services:</h4>'
    html += '<ul class="service-list">'
    
    const servicesByType = scripts.reduce((acc, script) => {
      if (!acc[script.type]) acc[script.type] = []
      acc[script.type].push(script)
      return acc
    }, {})
    
    Object.entries(servicesByType).forEach(([type, services]) => {
      const serviceList = services as any[]
      html += `<li class="service-item"><strong>${capitalizeFirst(type)}:</strong> `
      const domains = [...new Set(serviceList.map(s => s.domain))]
      html += domains.join(', ')
      html += '</li>'
    })
    
    html += '</ul>'
  }
  
  if (cookies.length > 0) {
    html += '<h4>Cookies Used:</h4>'
    html += '<ul class="service-list">'
    
    const cookiesByCategory = cookies.reduce((acc, cookie) => {
      if (!acc[cookie.category]) acc[cookie.category] = []
      acc[cookie.category].push(cookie)
      return acc
    }, {})
    
    Object.entries(cookiesByCategory).forEach(([category, cookieList]) => {
      const cookies = cookieList as any[]
      html += `<li class="service-item"><strong>${capitalizeFirst(category)} Cookies:</strong> `
      html += `${cookies.length} cookie(s) from ${[...new Set(cookies.map(c => c.domain))].join(', ')}`
      html += '</li>'
    })
    
    html += '</ul>'
  }
  
  html += '</div>'
  return html
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getDefaultPolicyTemplate(type: string = 'privacy'): string {
  if (type === 'cookie') {
    return `
      <h1>Cookie Policy for {{SITE_NAME}}</h1>
      <p class="last-updated">Last updated: {{LAST_UPDATED}}</p>
      
      <div class="section">
        <h2>1. What Are Cookies</h2>
        <p>Cookies are small text files that are placed on your device when you visit {{SITE_NAME}}. They help us provide you with a better experience by remembering your preferences and understanding how you use our website.</p>
      </div>
      
      <div class="section">
        <h2>2. Types of Cookies We Use</h2>
        <p>We use the following types of cookies on our website:</p>
        <ul>
          <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly and cannot be disabled</li>
          <li><strong>Analytics Cookies:</strong> These help us understand how visitors interact with our website by collecting and reporting information anonymously</li>
          <li><strong>Marketing Cookies:</strong> These are used to deliver relevant advertisements and track advertising campaign performance</li>
          <li><strong>Functional Cookies:</strong> These enable enhanced functionality and personalization, such as remembering your preferences</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>3. Cookies Currently in Use</h2>
        <p>Below are the cookies and third-party services currently detected on our website:</p>
        {{DETECTED_SERVICES}}
      </div>
      
      <div class="section">
        <h2>4. Managing Your Cookie Preferences</h2>
        <p>You can control and manage cookies in several ways:</p>
        <ul>
          <li>Use our cookie banner to accept or decline non-essential cookies</li>
          <li>Modify your cookie preferences at any time through our cookie settings</li>
          <li>Configure your browser settings to block or delete cookies</li>
          <li>Use browser extensions or privacy tools to manage cookies</li>
        </ul>
        <p>Please note that blocking certain cookies may impact your experience on our website.</p>
      </div>
      
      <div class="section">
        <h2>5. Cookie Duration</h2>
        <p>Your cookie preferences are stored for up to 12 months. After this period, you will be asked to renew your consent.</p>
      </div>
      
      <div class="section">
        <h2>6. Contact Information</h2>
        <p>If you have any questions about our use of cookies, please contact us at:</p>
        <p>Email: {{CONTACT_EMAIL}}</p>
        <p>Website: {{SITE_DOMAIN}}</p>
      </div>
      
      <div class="section">
        <h2>7. Updates to This Policy</h2>
        <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. Any changes will be posted on this page with an updated revision date.</p>
      </div>
    `
  }
  
  // Default privacy policy template
  return `
    <h1>Privacy Policy for {{SITE_NAME}}</h1>
    <p class="last-updated">Last updated: {{LAST_UPDATED}}</p>
    
    <div class="section">
      <h2>1. Information We Collect</h2>
      <p>When you visit {{SITE_NAME}}, we may collect certain information about your device and your interaction with our website through cookies and similar technologies.</p>
    </div>
    
    <div class="section">
      <h2>2. How We Use Cookies</h2>
      <p>We use cookies and similar tracking technologies to track activity on our website and store certain information. The types of cookies we use include:</p>
      <ul>
        <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly</li>
        <li><strong>Analytics Cookies:</strong> These help us understand how visitors interact with our website</li>
        <li><strong>Marketing Cookies:</strong> These are used to deliver relevant advertisements</li>
        <li><strong>Functional Cookies:</strong> These enable enhanced functionality and personalization</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>3. Third-Party Services</h2>
      <p>Our website may use third-party services that collect, monitor and analyze user behavior. Below are the services currently detected on our website:</p>
      {{DETECTED_SERVICES}}
    </div>
    
    <div class="section">
      <h2>4. Your Rights and Choices</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Accept or decline cookies through our cookie banner</li>
        <li>Modify your cookie preferences at any time</li>
        <li>Request information about the data we collect</li>
        <li>Request deletion of your personal data</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>5. Data Retention</h2>
      <p>We retain your cookie preferences for up to 12 months. After this period, you will be asked to renew your consent.</p>
    </div>
    
    <div class="section">
      <h2>6. Contact Information</h2>
      <p>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
      <p>Email: {{CONTACT_EMAIL}}</p>
      <p>Website: {{SITE_DOMAIN}}</p>
    </div>
    
    <div class="section">
      <h2>7. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>
    </div>
  `
}

export async function POST() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET'])
}