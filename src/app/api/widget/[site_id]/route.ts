import { NextRequest } from 'next/server'
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, widgetConfigSchema } from '@/lib/validation'
import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase'
import { SitesDB, CookieCategoriesDB, PolicyTemplatesDB } from '@/lib/database'
import { WidgetCache, CookieCache, PolicyCache, SiteCache } from '@/lib/cache'
import { withPerformanceMonitoring, ResponseOptimizer } from '@/lib/performance'
import { withAuthMiddleware, createAuthenticatedResponse } from '@/lib/auth-middleware'

interface WidgetConfigResponse {
  banner_html: string
  banner_css: string
  floating_button_js: string
  floating_button_css: string
  cookie_categories: Array<{
    id: string
    name: string
    name_sv: string
    description: string
    description_sv: string
    is_essential: boolean
    sort_order: number
  }>
  privacy_policy_url: string
  consent_endpoint: string
  site_config: {
    domain: string
    scan_interval: number
  }
  site_metadata: {
    company_name: string
    contact_email: string
    org_number: string
    company_address: string
    form_plugin: string
    ecommerce_plugin: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { site_id: string } }
): Promise<Response> {
  const handler = withPerformanceMonitoring(`widget:${params.site_id}`, async () => {
    const startTime = performance.now()
    
    // Apply authentication middleware
    const authResult = await withAuthMiddleware(request, {
      requireAuth: false, // Widget config is public
      rateLimitType: 'widget',
      allowedMethods: ['GET'],
      corsOrigins: '*',
    })

    if (!authResult.success) {
      return authResult.response
    }

    const { context } = authResult

    try {
      const { site_id } = params
      
      // Validate site_id format
      const validation = validateRequest(widgetConfigSchema, { site_id })
      if (!validation.success) {
        return createAuthenticatedResponse(
          {
            error: 'Validation failed',
            message: validation.error,
            code: 1004,
          },
          400,
          context,
          '*',
          request
        )
      }
      
      // Try to get widget config from cache first
      let widgetConfig = await WidgetCache.getConfig(site_id)
      const cacheHit = widgetConfig !== null
      
      if (!widgetConfig) {
        // Cache miss - fetch fresh data
        widgetConfig = await generateWidgetConfig(site_id)
        
        if (!widgetConfig) {
          return createAuthenticatedResponse(
            {
              error: 'Not found',
              message: 'Site not found or inactive',
              code: 1008,
            },
            404,
            context,
            '*',
            request
          )
        }
        
        // Cache the result
        await WidgetCache.setConfig(site_id, widgetConfig)
      }
      
      // Create response with performance headers
      const response = createAuthenticatedResponse(
        widgetConfig,
        200,
        context,
        '*',
        request
      )
      
      // Add performance and caching headers
      const optimizedResponse = ResponseOptimizer.addPerformanceHeaders(response, startTime, cacheHit)
      optimizedResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes cache
      optimizedResponse.headers.set('Vary', 'Accept-Encoding')
      
      return ResponseOptimizer.addCDNHeaders(optimizedResponse, 300) // 5 minutes CDN cache
      
    } catch (error) {
      console.error('Widget config fetch failed:', error)
      return createAuthenticatedResponse(
        {
          error: 'Internal error',
          message: 'Widget configuration unavailable',
          code: 1005,
        },
        500,
        context,
        '*',
        request
      )
    }
  })
  
  return handler()
}

async function generateWidgetConfig(siteId: string): Promise<WidgetConfigResponse | null> {
  try {
    // Get site information with caching
    let site: any = await SiteCache.getData(siteId)
    if (!site) {
      site = await SitesDB.getById(siteId)
      if (!site) {
        return null
      }
      
      // Check if site is active
      if (site.status !== 'active') {
        return null
      }
      
      // Cache site data
      await SiteCache.setData(siteId, site)
    }
    
    // Get active cookie categories with caching
    let cookieCategories: any = await CookieCache.getCategories()
    if (!cookieCategories) {
      cookieCategories = await CookieCategoriesDB.listActive()
      await CookieCache.setCategories(cookieCategories)
    }
    
    // Get active banner template with caching
    let bannerTemplate: any = await PolicyCache.getTemplate('banner')
    if (!bannerTemplate) {
      bannerTemplate = await PolicyTemplatesDB.findActive('banner')
      if (bannerTemplate) {
        await PolicyCache.setTemplate('banner', bannerTemplate)
      }
    }
    
    // Generate banner HTML with site-specific data
    const bannerHtml = generateBannerHtml(bannerTemplate?.content || getDefaultBannerTemplate(), site)
    
    // Generate banner CSS with policy modal CSS
    const bannerCss = generateBannerCss() + '\n\n' + generatePolicyModalCss()
    
    // Get floating button assets with policy modal manager
    const floatingButtonJs = getFloatingButtonJs() + '\n\n' + getPolicyModalJs()
    const floatingButtonCss = getFloatingButtonCss()
    
    // Build widget configuration response with all required fields
    return {
      banner_html: bannerHtml,
      banner_css: bannerCss,
      floating_button_js: floatingButtonJs,
      floating_button_css: floatingButtonCss,
      cookie_categories: cookieCategories.map((category: any) => ({
        id: category.id,
        name: category.name,
        name_sv: category.name, // Swedish name (database already has Swedish content)
        description: category.description || '',
        description_sv: category.description || '', // Swedish description
        is_essential: category.is_essential,
        sort_order: category.sort_order
      })),
      privacy_policy_url: `${process.env.NEXT_PUBLIC_API_URL}/api/policy/${siteId}`,
      consent_endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/consent`,
      site_config: {
        domain: site.domain,
        scan_interval: 300000 // 5 minutes in milliseconds
      },
      site_metadata: {
        company_name: site.company_name || site.domain || '',
        contact_email: site.contact_email || '',
        org_number: site.org_number || '',
        company_address: site.company_address || '',
        form_plugin: site.form_plugin || '',
        ecommerce_plugin: site.ecommerce_plugin || ''
      }
    }
  } catch (error) {
    console.error('Error generating widget config:', error)
    return null
  }
}

function generateBannerHtml(template: string, site: any): string {
  // Replace template variables with site-specific data
  return template
    .replace('{{SITE_DOMAIN}}', new URL(site.domain).hostname)
    .replace('{{SITE_NAME}}', new URL(site.domain).hostname)
    .replace('{{CURRENT_DATE}}', new Date().toLocaleDateString())
}

function getDefaultBannerTemplate(): string {
  return `
    <div id="vp-widget-container">
    <div id="vp-cookie-banner" class="vp-banner">
      <div class="vp-banner-container">
        <div class="vp-banner-icon">
          🍪
        </div>
        <div class="vp-banner-text">
          <p>Genom att klicka på "Acceptera" godkänner du lagring av cookies på din enhet. <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button> • <button class="vp-policy-link" data-policy="cookie" type="button">Cookiepolicy</button></p>
        </div>
        <div class="vp-banner-actions">
          <button id="vp-settings" class="vp-btn vp-btn-icon" aria-label="Cookie-inställningar" title="Cookie-inställningar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.43 10.98C17.47 10.66 17.5 10.34 17.5 10C17.5 9.66 17.47 9.34 17.43 9.02L19.54 7.37C19.73 7.22 19.78 6.95 19.66 6.73L17.66 3.27C17.54 3.05 17.27 2.97 17.05 3.05L14.56 4.05C14.04 3.65 13.48 3.32 12.87 3.07L12.49 0.42C12.46 0.18 12.25 0 12 0H8C7.75 0 7.54 0.18 7.51 0.42L7.13 3.07C6.52 3.32 5.96 3.66 5.44 4.05L2.95 3.05C2.72 2.96 2.46 3.05 2.34 3.27L0.34 6.73C0.21 6.95 0.27 7.22 0.46 7.37L2.57 9.02C2.53 9.34 2.5 9.67 2.5 10C2.5 10.33 2.53 10.66 2.57 10.98L0.46 12.63C0.27 12.78 0.22 13.05 0.34 13.27L2.34 16.73C2.46 16.95 2.73 17.03 2.95 16.95L5.44 15.95C5.96 16.35 6.52 16.68 7.13 16.93L7.51 19.58C7.54 19.82 7.75 20 8 20H12C12.25 20 12.46 19.82 12.49 19.58L12.87 16.93C13.48 16.68 14.04 16.34 14.56 15.95L17.05 16.95C17.28 17.04 17.54 16.95 17.66 16.73L19.66 13.27C19.78 13.05 19.73 12.78 19.54 12.63L17.43 10.98ZM10 13.5C8.07 13.5 6.5 11.93 6.5 10C6.5 8.07 8.07 6.5 10 6.5C11.93 6.5 13.5 8.07 13.5 10C13.5 11.93 11.93 13.5 10 13.5Z" fill="currentColor"/>
            </svg>
          </button>
          <button id="vp-reject-all" class="vp-btn vp-btn-secondary">Avvisa</button>
          <button id="vp-accept-all" class="vp-btn vp-btn-primary">Acceptera</button>
        </div>
      </div>
    </div>
    
    <div id="vp-settings-modal" class="vp-modal" style="display: none;">
      <div class="vp-modal-content">
        <div class="vp-modal-header">
          <h3>Cookie-inställningar</h3>
          <button id="vp-close-settings" class="vp-close">&times;</button>
        </div>
        <div class="vp-modal-body">
          <p class="vp-settings-intro">Vi använder cookies och liknande tekniker för att förbättra din upplevelse på vår webbplats. Vissa cookies är nödvändiga för webbplatsens funktion, medan andra hjälper oss att analysera och förbättra webbplatsen samt visa personligt anpassat innehåll. Du kan när som helst ändra dina inställningar.</p>
          <div id="vp-cookie-categories"></div>
        </div>
        <div class="vp-modal-footer">
          <div class="vp-modal-footer-actions">
            <button id="vp-save-settings" class="vp-btn vp-btn-primary">Spara inställningar</button>
            <button id="vp-cancel-settings" class="vp-btn vp-btn-secondary">Avbryt</button>
          </div>
          <div class="vp-modal-footer-links">
            <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button>
            <span class="vp-separator">•</span>
            <button class="vp-policy-link" data-policy="cookie" type="button">Cookiepolicy</button>
          </div>
          <div class="vp-branding">
            <a href="https://visionmedia.io" target="_blank" rel="noopener noreferrer">Drivs av Vision Media</a>
          </div>
        </div>
      </div>
    </div>
    
    <div id="vp-policy-modal" class="vp-modal vp-policy-modal" role="dialog" aria-modal="true" aria-labelledby="vp-policy-title" aria-describedby="vp-policy-content" aria-hidden="true" style="display: none;">
      <div class="vp-modal-backdrop"></div>
      <div class="vp-modal-content">
        <div class="vp-modal-header">
          <h3 id="vp-policy-title"></h3>
          <button id="vp-close-policy" class="vp-close" aria-label="Stäng policy">&times;</button>
        </div>
        <div class="vp-modal-body">
          <div id="vp-policy-loading" class="vp-loading" role="status" aria-live="polite">
            <span class="vp-spinner"></span>
            <p>Laddar policy...</p>
          </div>
          <div id="vp-policy-content" class="vp-policy-text" style="display: none;"></div>
          <div id="vp-policy-error" class="vp-error" style="display: none;" role="alert" aria-live="assertive">
            <p>Det gick inte att ladda policyn. Försök igen senare.</p>
          </div>
          <div class="vp-branding">
            <a href="https://visionmedia.io" target="_blank" rel="noopener noreferrer">Drivs av Vision Media</a>
          </div>
        </div>
      </div>
    </div>
    </div>
  `
}

function generateBannerCss(): string {
  return `
    /* Banner Container - Floating Design */
    .vp-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 1200px;
      width: calc(100% - 48px);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      animation: vp-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    /* Optimized slide-up animation using translate3d for GPU acceleration */
    @keyframes vp-slide-up {
      from {
        opacity: 0;
        transform: translate3d(-50%, 20px, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(-50%, 0, 0);
      }
    }
    
    .vp-banner.vp-banner-hiding {
      animation: vp-slide-down 0.3s cubic-bezier(0.7, 0, 0.84, 0);
      animation-fill-mode: forwards;
    }
    
    /* Optimized slide-down animation using translate3d for GPU acceleration */
    @keyframes vp-slide-down {
      from {
        opacity: 1;
        transform: translate3d(-50%, 0, 0);
      }
      to {
        opacity: 0;
        transform: translate3d(-50%, 20px, 0);
      }
    }
    
    .vp-banner-container {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      /* GPU acceleration for smooth rendering */
      will-change: transform;
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    
    /* Cookie Icon */
    .vp-banner-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: vp-cookie-wiggle 2s ease-in-out infinite;
    }
    
    @keyframes vp-cookie-wiggle {
      0%, 100% { transform: rotate(0deg); }
      10%, 30% { transform: rotate(-10deg); }
      20%, 40% { transform: rotate(10deg); }
      50%, 60%, 70%, 80%, 90% { transform: rotate(0deg); }
    }
    
    /* Banner Text */
    .vp-banner-text {
      flex: 1;
      min-width: 0;
    }
    
    .vp-banner-text p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    
    /* Policy Links in Text */
    .vp-policy-link {
      background: none;
      border: none;
      color: #666;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: 14px;
      font-family: inherit;
      line-height: inherit;
      transition: color 0.2s ease;
    }
    
    .vp-policy-link:hover {
      color: #000;
    }
    
    .vp-policy-link:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Banner Actions */
    .vp-banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    
    /* Button Styles */
    .vp-btn {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
    }
    
    .vp-btn:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
    }
    
    /* Settings Icon Button */
    .vp-btn-icon {
      width: 40px;
      height: 40px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      color: #666;
      /* GPU acceleration for rotation animation */
      will-change: transform;
      transform: translateZ(0);
    }
    
    .vp-btn-icon:hover {
      background: #e8e8e8;
      color: #000;
      transform: rotate3d(0, 0, 1, 45deg) translateZ(0);
    }
    
    .vp-btn-icon:active {
      transform: rotate3d(0, 0, 1, 45deg) scale(0.95) translateZ(0);
    }
    
    /* Secondary Button (Reject) */
    .vp-btn-secondary {
      padding: 10px 20px;
      background: #ffffff;
      color: #333;
      border: 1px solid #e0e0e0;
    }
    
    .vp-btn-secondary:hover {
      background: #f5f5f5;
      border-color: #d0d0d0;
    }
    
    .vp-btn-secondary:active {
      transform: scale(0.98);
    }
    
    /* Primary Button (Accept) */
    .vp-btn-primary {
      padding: 10px 24px;
      background: #000000;
      color: #ffffff;
      /* GPU acceleration for button animations */
      will-change: transform;
      transform: translateZ(0);
    }
    
    .vp-btn-primary:hover {
      background: #333333;
      transform: translate3d(0, -1px, 0);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .vp-btn-primary:active {
      transform: translate3d(0, 0, 0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .vp-banner {
        bottom: 16px;
        width: calc(100% - 32px);
      }
      
      .vp-banner-container {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
        gap: 12px;
      }
      
      .vp-banner-icon {
        display: none;
      }
      
      .vp-banner-text p {
        font-size: 13px;
        text-align: center;
      }
      
      .vp-banner-actions {
        flex-direction: row;
        justify-content: center;
        gap: 8px;
      }
      
      .vp-btn-secondary,
      .vp-btn-primary {
        flex: 1;
        padding: 12px 16px;
      }
      
      .vp-btn-icon {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
      }
    }
    
    @media (max-width: 480px) {
      .vp-banner {
        bottom: 12px;
        width: calc(100% - 24px);
      }
      
      .vp-banner-container {
        padding: 12px;
      }
      
      .vp-banner-text p {
        font-size: 12px;
      }
      
      .vp-btn-secondary,
      .vp-btn-primary {
        font-size: 13px;
        padding: 10px 12px;
      }
    }
    
    /* Modal Overlay */
    .vp-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
      animation: vp-fade-in 0.2s ease-out;
      /* GPU acceleration for modal overlay */
      will-change: opacity;
      transform: translateZ(0);
    }
    
    /* Policy modal needs higher z-index to appear above settings modal */
    .vp-policy-modal {
      z-index: 1000001 !important;
    }
    
    /* Optimized fade-in animation using opacity and transform for GPU acceleration */
    @keyframes vp-fade-in {
      from { 
        opacity: 0;
        transform: translateZ(0);
      }
      to { 
        opacity: 1;
        transform: translateZ(0);
      }
    }
    
    /* Modal Content */
    .vp-modal-content {
      background: #ffffff;
      border-radius: 16px;
      max-width: 600px;
      width: calc(100% - 32px);
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      animation: vp-modal-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      /* GPU acceleration for modal content */
      will-change: transform, opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Optimized slide-up animation using transform and opacity for GPU acceleration */
    @keyframes vp-modal-slide-up {
      from {
        opacity: 0;
        transform: translate3d(0, 20px, 0) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }
    
    /* Modal Header */
    .vp-modal-header {
      padding: 24px 24px 20px 24px;
      border-bottom: 1px solid #f0f0f0;
      position: relative;
      flex-shrink: 0;
    }
    
    .vp-modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #000;
      text-align: center;
      padding-right: 30px;
    }
    
    /* Close Button */
    .vp-close {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .vp-close:hover {
      background: #f5f5f5;
      color: #000;
    }
    
    .vp-close:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    /* Modal Body */
    .vp-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    
    .vp-modal-body > p {
      margin: 0 0 20px 0;
      color: #666;
      line-height: 1.6;
      font-size: 14px;
    }
    
    .vp-settings-intro {
      margin: 0 0 24px 0 !important;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      color: #666 !important;
      line-height: 1.6 !important;
      font-size: 14px !important;
    }
    
    /* Modal Footer */
    .vp-modal-footer {
      padding: 20px 24px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    
    .vp-modal-footer-actions {
      display: flex;
      gap: 12px;
    }
    
    .vp-modal-footer-actions .vp-btn {
      flex: 1;
    }
    
    .vp-modal-footer-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #f5f5f5;
      font-size: 13px;
    }
    
    /* Branding */
    .vp-branding {
      text-align: center;
      padding-top: 16px;
      margin-top: 16px;
      border-top: 1px solid #f5f5f5;
    }
    
    .vp-branding a {
      font-size: 11px;
      color: #999;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    .vp-branding a:hover {
      color: #666;
    }
    
    .vp-branding a:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Cookie Categories */
    .vp-category {
      margin-bottom: 12px;
      padding: 18px;
      border: 1px solid #e8e8e8;
      border-radius: 12px;
      background: #ffffff;
      transition: all 0.2s ease;
    }
    
    .vp-category:hover {
      border-color: #d0d0d0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    
    .vp-category:last-child {
      margin-bottom: 0;
    }
    
    .vp-category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      user-select: none;
    }
    
    .vp-category-header:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 4px;
    }
    
    .vp-category-info {
      flex: 1;
      min-width: 0;
    }
    
    .vp-category-name {
      font-weight: 600;
      font-size: 15px;
      color: #000;
      margin-bottom: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .vp-expand-icon {
      font-size: 12px;
      transition: transform 0.2s ease;
      display: inline-block;
      margin-left: auto;
    }
    
    .vp-category-header[aria-expanded="true"] .vp-expand-icon {
      transform: rotate(180deg);
    }
    
    .vp-essential-badge {
      background: #e8e8e8;
      color: #666;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .vp-category-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .vp-category-description {
      color: #666;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 12px 0;
    }
    
    .vp-category-services {
      margin-top: 12px;
    }
    
    .vp-category-services h4 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }
    
    .vp-category-cookies {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .vp-category-cookies li {
      padding: 6px 0;
      font-size: 12px;
      color: #666;
      border-bottom: 1px solid #f5f5f5;
    }
    
    .vp-category-cookies li:last-child {
      border-bottom: none;
    }
    
    /* Toggle Switch */
    .vp-toggle {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 28px;
      flex-shrink: 0;
    }
    
    .vp-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    
    .vp-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #e0e0e0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 28px;
    }
    
    .vp-slider:before {
      position: absolute;
      content: "";
      height: 24px;
      width: 24px;
      left: 2px;
      bottom: 2px;
      background-color: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .vp-slider:hover {
      background-color: #d0d0d0;
    }
    
    input:checked + .vp-slider {
      background-color: #000000;
    }
    
    input:checked + .vp-slider:hover {
      background-color: #333333;
    }
    
    input:disabled + .vp-slider {
      background-color: #e8e8e8;
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    input:checked + .vp-slider:before,
    input:disabled + .vp-slider:before {
      transform: translateX(20px);
    }
    
    input:focus + .vp-slider {
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
    }
    
    /* Mobile Responsive - Modal */
    @media (max-width: 768px) {
      .vp-modal-content {
        width: calc(100% - 24px);
        max-height: 90vh;
        border-radius: 12px;
      }
      
      .vp-modal-header {
        padding: 20px 20px 16px 20px;
      }
      
      .vp-modal-header h3 {
        font-size: 18px;
      }
      
      .vp-modal-body {
        padding: 20px;
      }
      
      .vp-modal-footer {
        padding: 16px 20px 20px 20px;
      }
      
      .vp-modal-footer-actions {
        flex-direction: column;
      }
      
      .vp-category {
        padding: 16px;
      }
      
      .vp-category-header {
        gap: 12px;
      }
    }
    
    @media (max-width: 768px) {
      .vp-banner-content {
        flex-direction: column;
        text-align: center;
      }
      
      .vp-banner-actions {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .vp-btn {
        flex: 1;
        min-width: 120px;
      }
      
      .vp-banner-links,
      .banner-links {
        flex-wrap: wrap;
      }
      
      .vp-modal-content {
        width: 95%;
        max-height: 90vh;
      }
      
      .vp-category-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .vp-category-info {
        margin-right: 0;
        margin-bottom: 10px;
      }
      
      .vp-modal-footer {
        flex-direction: column;
      }
      
      .vp-modal-footer .vp-btn {
        width: 100%;
      }
    }
  `
}

function generatePolicyModalCss(): string {
  return `
    /* Policy Modal - Inherits base modal styles, only adds specific overrides */
    .vp-policy-modal .vp-modal-content {
      max-width: 800px;
      /* GPU acceleration for smooth animations */
      will-change: transform, opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;
    }
    
    .vp-policy-modal .vp-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      /* GPU acceleration for backdrop */
      will-change: opacity;
      transform: translateZ(0);
    }
    
    /* Settings link styling within policy content */
    .vp-settings-link {
      background: none;
      border: none;
      color: #0066cc;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
      transition: color 0.2s ease;
    }
    
    .vp-settings-link:hover {
      color: #004499;
    }
    
    .vp-settings-link:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Policy content styling */
    .vp-policy-text {
      color: #333;
      line-height: 1.6;
    }
    
    /* Settings link in policy content - should look like text link, not button */
    .vp-policy-text .vp-settings-link {
      background: none;
      border: none;
      color: #666;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: 14px;
      font-family: inherit;
      line-height: inherit;
      transition: color 0.2s ease;
      display: inline;
    }
    
    .vp-policy-text .vp-settings-link:hover {
      color: #000;
    }
    
    .vp-policy-text .vp-settings-link:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    .vp-policy-text h1 {
      font-size: 24px;
      margin: 0 0 20px 0;
      font-weight: 600;
      color: #000;
    }
    
    .vp-policy-text h2 {
      font-size: 18px;
      margin: 30px 0 15px 0;
      font-weight: 600;
      color: #000;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 12px;
    }
    
    .vp-policy-text h3 {
      font-size: 16px;
      margin: 20px 0 10px 0;
      font-weight: 600;
      color: #333;
    }
    
    .vp-policy-text p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #666;
    }
    
    .vp-policy-text ul, .vp-policy-text ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
      color: #666;
    }
    
    .vp-policy-text li {
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    /* Loading state */
    .vp-loading {
      text-align: center;
      padding: 60px 20px;
    }
    
    .vp-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #000;
      border-radius: 50%;
      animation: vp-spin 1s linear infinite;
      margin-bottom: 15px;
    }
    
    @keyframes vp-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .vp-loading p {
      color: #666;
      font-size: 14px;
      margin: 0;
    }
    
    /* Error state */
    .vp-error {
      text-align: center;
      padding: 60px 20px;
      color: #d32f2f;
    }
    
    /* Mobile Responsive - Policy Modal */
    @media (max-width: 768px) {
      .vp-policy-modal .vp-modal-content {
        width: 95%;
        max-height: 90vh;
        border-radius: 12px;
      }
      
      /* Ensure tables are scrollable on mobile */
      .vp-policy-text table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        white-space: nowrap;
      }
      
      /* Set minimum font size for mobile */
      .vp-policy-text,
      .vp-policy-text p,
      .vp-policy-text li {
        font-size: 13px !important;
      }
      
      .vp-policy-text h1 {
        font-size: 20px;
      }
      
      .vp-policy-text h2 {
        font-size: 16px;
      }
      
      .vp-policy-text h3 {
        font-size: 14px;
      }
    }
    
    /* Prevent body scroll when modal is open */
    body.vp-modal-open {
      overflow: hidden;
      position: fixed;
      width: 100%;
    }
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

/*
*
 * Get floating button JavaScript
 */
function getFloatingButtonJs(): string {
  return `
/**
 * Vision Privacy - Floating Settings Button
 */
(function() {
  'use strict';
  
  const BUTTON_ID = 'vision-privacy-floating-btn';
  
  function hasConsent() {
    try {
      // Check for consent with the correct key format: vp_consent_{siteId}
      const siteId = window.VP_SITE_ID;
      if (!siteId) return false;
      
      const consentKey = 'vp_consent_' + siteId;
      return localStorage.getItem(consentKey) !== null;
    } catch (e) {
      return false;
    }
  }
  
  function isBannerVisible() {
    const banner = document.querySelector('.vision-privacy-banner, .vp-banner');
    if (!banner) {
      return false;
    }
    
    // Check if banner is actually visible (not hidden and not removed from DOM)
    const computedStyle = window.getComputedStyle(banner);
    const isVisible = computedStyle.display !== 'none' && banner.offsetParent !== null;
    
    return isVisible;
  }
  
  function createFloatingButton(force) {
    // If button already exists, don't create another one
    if (document.getElementById(BUTTON_ID)) {
      return;
    }
    
    // Only check consent if not forced (force=true when called explicitly after consent saved)
    if (!force && !hasConsent()) {
      return;
    }
    
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.className = 'vision-privacy-floating-btn';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', 'Ändra cookie-inställningar');
    button.setAttribute('title', 'Ändra cookie-inställningar');
    
    button.innerHTML = '<span class="floating-btn-icon" aria-hidden="true">🍪</span><span class="floating-btn-text">Cookie-inställningar</span>';
    
    button.addEventListener('click', function() {
      if (window.VisionPrivacy && typeof window.VisionPrivacy.showSettings === 'function') {
        window.VisionPrivacy.showSettings();
      } else {
        const customizeBtn = document.querySelector('[data-action="customize"], #vp-settings');
        if (customizeBtn) {
          customizeBtn.click();
        } else {
          const banner = document.querySelector('.vision-privacy-banner, .vp-banner');
          if (banner) banner.style.display = 'block';
        }
      }
    });
    
    document.body.appendChild(button);
    updateButtonVisibility();
  }
  
  function updateButtonVisibility() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    
    const bannerVisible = isBannerVisible();
    button.style.display = bannerVisible ? 'none' : 'flex';
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
      createFloatingButton();
    }
    
    const observer = new MutationObserver(updateButtonVisibility);
    const checkBanner = function() {
      const banner = document.querySelector('.vision-privacy-banner, .vp-banner');
      if (banner) {
        observer.observe(banner, { attributes: true, attributeFilter: ['style'] });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkBanner);
    } else {
      checkBanner();
    }
    
    window.addEventListener('storage', function(e) {
      const siteId = window.VP_SITE_ID;
      if (!siteId) return;
      
      const consentKey = 'vp_consent_' + siteId;
      if (e.key === consentKey) {
        const button = document.getElementById(BUTTON_ID);
        if (e.newValue && !button) {
          createFloatingButton();
        } else if (!e.newValue && button) {
          button.remove();
        }
      }
    });
  }
  
  window.VisionPrivacyFloatingButton = {
    show: function() {
      createFloatingButton(true); // Force creation when called explicitly
    },
    hide: function() {
      const button = document.getElementById(BUTTON_ID);
      if (button) button.remove();
    }
  };
  
  init();
})();
  `.trim()
}

/**
 * Get floating button CSS
 */
function getFloatingButtonCss(): string {
  return `
.vision-privacy-floating-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 999998;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  background: #ffffff;
  color: #666;
  border: none;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInFromLeft 0.5s ease-out;
}

@keyframes slideInFromLeft {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.vision-privacy-floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #f8f8f8;
}

.vision-privacy-floating-btn:active {
  transform: translateY(0);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.vision-privacy-floating-btn:focus {
  outline: 3px solid #000;
  outline-offset: 3px;
}

.floating-btn-icon {
  font-size: 28px;
  line-height: 1;
  animation: vp-cookie-wiggle 2s ease-in-out infinite;
}

@keyframes vp-cookie-wiggle {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
  50%, 60%, 70%, 80%, 90% { transform: rotate(0deg); }
}

.floating-btn-text {
  display: none;
}

@media (max-width: 768px) {
  .vision-privacy-floating-btn {
    bottom: 16px;
    left: 16px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
  .floating-btn-icon { font-size: 24px; }
}

@media (max-width: 480px) {
  .vision-privacy-floating-btn {
    bottom: 12px;
    left: 12px;
    width: 44px;
    height: 44px;
  }
  .floating-btn-icon { font-size: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .vision-privacy-floating-btn { animation: none; transition: none; }
  .floating-btn-icon { animation: none; }
  .vision-privacy-floating-btn:hover { transform: none; }
}

@media print {
  .vision-privacy-floating-btn { display: none !important; }
}
  `.trim()
}

/**
 * Get policy modal JavaScript
 */
function getPolicyModalJs(): string {
  return `
/**
 * Vision Privacy - Policy Modal Manager
 */
(function() {
  'use strict';
  
  /**
   * PolicyModalManager class handles displaying privacy and cookie policies in a modal
   */
  class PolicyModalManager {
    constructor(siteId, apiEndpoint) {
      this.siteId = siteId;
      this.apiEndpoint = apiEndpoint || window.location.origin;
      this.cache = new Map();
      this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
      this.lastFocusedElement = null;
      this.modal = null;
      this.focusTrapHandler = null;
      this.fetchTimeout = 10000; // 10 seconds timeout
      this.maxRetries = 1; // Retry once on failure
      this.initialized = false;
      this.init();
    }
    
    /**
     * Initialize the policy modal manager
     */
    init() {
      try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.setupModal());
        } else {
          this.setupModal();
        }
      } catch (error) {
        this.logError('Initialization failed', error);
      }
    }
    
    /**
     * Set up modal reference and event listeners
     */
    setupModal() {
      try {
        this.modal = document.getElementById('vp-policy-modal');
        
        if (!this.modal) {
          console.warn('[Vision Privacy] Policy modal element (#vp-policy-modal) not found in DOM. Policy links will not function.');
          return;
        }
        
        // Verify required modal elements exist
        this.verifyModalElements();
        
        this.attachEventListeners();
        this.initialized = true;
        
      } catch (error) {
        this.logError('Modal setup failed', error);
        console.warn('[Vision Privacy] Policy modal initialization failed. Falling back to graceful degradation.');
      }
    }
    
    /**
     * Verify all required modal elements are present
     */
    verifyModalElements() {
      const requiredElements = [
        { id: 'vp-policy-title', name: 'Policy title' },
        { id: 'vp-close-policy', name: 'Close button' },
        { id: 'vp-policy-loading', name: 'Loading indicator' },
        { id: 'vp-policy-content', name: 'Content container' },
        { id: 'vp-policy-error', name: 'Error message' }
      ];
      
      const missing = [];
      
      for (const element of requiredElements) {
        if (!document.getElementById(element.id)) {
          missing.push(element.name + ' (#' + element.id + ')');
        }
      }
      
      if (missing.length > 0) {
        console.warn('[Vision Privacy] Missing modal elements: ' + missing.join(', ') + '. Some features may not work correctly.');
      }
      
      // Check for backdrop
      const backdrop = this.modal.querySelector('.vp-modal-backdrop');
      if (!backdrop) {
        console.warn('[Vision Privacy] Modal backdrop element not found. Click-outside-to-close may not work.');
      }
    }
    
    /**
     * Attach all event listeners for modal interactions
     */
    attachEventListeners() {
      try {
        // Policy link clicks using event delegation
        document.addEventListener('click', (e) => {
          try {
            const policyLink = e.target.closest('[data-policy]');
            if (policyLink) {
              e.preventDefault();
              const policyType = policyLink.dataset.policy;
              
              // Validate policy type
              if (policyType !== 'privacy' && policyType !== 'cookie') {
                console.warn('[Vision Privacy] Invalid policy type: ' + policyType + '. Expected "privacy" or "cookie".');
                return;
              }
              
              this.openPolicy(policyType);
            }
          } catch (error) {
            this.logError('Policy link click handler failed', error);
          }
        });
        
        // Close button click
        const closeBtn = document.getElementById('vp-close-policy');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            try {
              this.closePolicy();
            } catch (error) {
              this.logError('Close button handler failed', error);
            }
          });
        } else {
          console.warn('[Vision Privacy] Close button not found. Users may not be able to close the modal easily.');
        }
        
        // Backdrop click to close
        const backdrop = this.modal.querySelector('.vp-modal-backdrop');
        if (backdrop) {
          backdrop.addEventListener('click', () => {
            try {
              this.closePolicy();
            } catch (error) {
              this.logError('Backdrop click handler failed', error);
            }
          });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
          try {
            if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
              this.closePolicy();
            }
          } catch (error) {
            this.logError('Escape key handler failed', error);
          }
        });
        
      } catch (error) {
        this.logError('Event listener attachment failed', error);
      }
    }
    
    /**
     * Open policy modal and load content
     * @param {string} policyType - 'privacy' or 'cookie'
     */
    async openPolicy(policyType) {
      // Check if modal is initialized
      if (!this.initialized || !this.modal) {
        console.error('[Vision Privacy] Cannot open policy modal: Modal not initialized. Falling back to direct navigation.');
        this.fallbackToDirectNavigation(policyType);
        return;
      }
      
      try {
        // Store currently focused element for later restoration
        this.lastFocusedElement = document.activeElement;
        
        // Prevent body scroll
        document.body.classList.add('vp-modal-open');
        
        // Show modal
        this.modal.style.display = 'flex';
        this.modal.setAttribute('aria-hidden', 'false');
        
        // Set modal title based on policy type (Swedish labels)
        const title = document.getElementById('vp-policy-title');
        if (title) {
          title.textContent = policyType === 'privacy' ? 'Integritetspolicy' : 'Cookiepolicy';
        } else {
          console.warn('[Vision Privacy] Policy title element not found.');
        }
        
        // Show loading state
        this.showLoading();
        
        try {
          // Fetch policy content (with caching and retry)
          const content = await this.fetchPolicyContent(policyType);
          
          // Validate content before rendering
          if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('Invalid or empty policy content received');
          }
          
          // Render content in modal
          this.renderPolicyContent(content);
          
          // Set up focus trap for accessibility
          this.trapFocus();
          
        } catch (error) {
          this.logError('Failed to load policy content', error);
          this.showError();
        }
        
      } catch (error) {
        this.logError('Failed to open policy modal', error);
        this.fallbackToDirectNavigation(policyType);
      }
    }
    
    /**
     * Fallback behavior when modal fails - navigate to policy page
     * @param {string} policyType - 'privacy' or 'cookie'
     */
    fallbackToDirectNavigation(policyType) {
      try {
        const policyUrl = this.apiEndpoint + '/api/policy/' + this.siteId + '?type=' + policyType;
        console.warn('[Vision Privacy] Opening policy in new window as fallback: ' + policyUrl);
        window.open(policyUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        this.logError('Fallback navigation failed', error);
        alert('Unable to display policy. Please try again later.');
      }
    }
    
    /**
     * Close the policy modal
     */
    closePolicy() {
      if (!this.modal) {
        console.warn('[Vision Privacy] Cannot close modal: Modal reference not found.');
        return;
      }
      
      try {
        // Re-enable body scroll
        document.body.classList.remove('vp-modal-open');
        
        // Hide modal
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');
        
        // Remove focus trap handler
        if (this.focusTrapHandler) {
          this.modal.removeEventListener('keydown', this.focusTrapHandler);
          this.focusTrapHandler = null;
        }
        
        // Return focus to the element that opened the modal
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
          try {
            this.lastFocusedElement.focus();
          } catch (focusError) {
            // Element may have been removed from DOM
            console.warn('[Vision Privacy] Could not return focus to previous element:', focusError);
          }
          this.lastFocusedElement = null;
        }
        
      } catch (error) {
        this.logError('Failed to close modal', error);
      }
    }
    
    /**
     * Fetch policy content from API with caching, timeout, and retry logic
     * @param {string} policyType - 'privacy' or 'cookie'
     * @returns {Promise<string>} Policy content HTML
     */
    async fetchPolicyContent(policyType) {
      // Check cache first
      const cached = this.getCachedPolicy(policyType);
      if (cached) {
        return cached;
      }
      
      // Attempt fetch with retry logic
      let lastError = null;
      
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.warn('[Vision Privacy] Retrying policy fetch (attempt ' + (attempt + 1) + '/' + (this.maxRetries + 1) + ')');
            // Wait 2 seconds before retry
            await this.sleep(2000);
          }
          
          const content = await this.fetchWithTimeout(policyType);
          
          // Cache the successful response
          this.cachePolicy(policyType, content);
          
          return content;
          
        } catch (error) {
          lastError = error;
          this.logError('Policy fetch attempt ' + (attempt + 1) + ' failed', error);
        }
      }
      
      // All attempts failed
      throw lastError || new Error('Failed to fetch policy content after ' + (this.maxRetries + 1) + ' attempts');
    }
    
    /**
     * Fetch policy with timeout
     * @param {string} policyType - 'privacy' or 'cookie'
     * @returns {Promise<string>} Policy content HTML
     */
    async fetchWithTimeout(policyType) {
      // Construct API endpoint URL
      const endpoint = this.apiEndpoint + '/api/policy/' + this.siteId + '?format=json&type=' + policyType;
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after ' + this.fetchTimeout + 'ms')), this.fetchTimeout);
      });
      
      // Create fetch promise
      const fetchPromise = fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }).then(async (response) => {
        // Check response status
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error('HTTP ' + response.status + ': ' + response.statusText + ' - ' + errorText);
        }
        
        // Parse JSON response
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error('Invalid JSON response from server: ' + parseError.message);
        }
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format: Expected object, got ' + typeof data);
        }
        
        // Extract content from response
        const content = data.policy_content || data.content || '';
        
        if (!content || typeof content !== 'string') {
          throw new Error('Invalid or missing policy content in response');
        }
        
        if (content.trim().length === 0) {
          throw new Error('Empty policy content received from server');
        }
        
        return content;
      });
      
      // Race between fetch and timeout
      return Promise.race([fetchPromise, timeoutPromise]);
    }
    
    /**
     * Sleep utility for retry delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get cached policy content if not expired
     * @param {string} policyType - 'privacy' or 'cookie'
     * @returns {string|null} Cached content or null
     */
    getCachedPolicy(policyType) {
      try {
        const cached = this.cache.get(policyType);
        if (!cached) return null;
        
        // Validate cached data structure
        if (!cached.content || !cached.timestamp) {
          console.warn('[Vision Privacy] Invalid cache entry for ' + policyType + ', removing from cache.');
          this.cache.delete(policyType);
          return null;
        }
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheExpiry) {
          // Cache expired, remove it
          this.cache.delete(policyType);
          return null;
        }
        
        return cached.content;
        
      } catch (error) {
        this.logError('Cache retrieval failed', error);
        return null;
      }
    }
    
    /**
     * Cache policy content with timestamp
     * @param {string} policyType - 'privacy' or 'cookie'
     * @param {string} content - Policy content HTML
     */
    cachePolicy(policyType, content) {
      try {
        if (!content || typeof content !== 'string') {
          console.warn('[Vision Privacy] Attempted to cache invalid content for ' + policyType);
          return;
        }
        
        this.cache.set(policyType, {
          content: content,
          timestamp: Date.now()
        });
        
      } catch (error) {
        this.logError('Cache storage failed', error);
      }
    }
    
    /**
     * Render policy content in the modal
     * @param {string} content - Policy content HTML
     */
    renderPolicyContent(content) {
      try {
        const loadingEl = document.getElementById('vp-policy-loading');
        const contentEl = document.getElementById('vp-policy-content');
        const errorEl = document.getElementById('vp-policy-error');
        
        if (!contentEl) {
          console.error('[Vision Privacy] Policy content element (#vp-policy-content) not found. Cannot render policy.');
          throw new Error('Content element not found');
        }
        
        // Hide loading and error, show content
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        contentEl.style.display = 'block';
        
        // Sanitize and render HTML content
        try {
          contentEl.innerHTML = content;
        } catch (renderError) {
          this.logError('Failed to render HTML content', renderError);
          throw renderError;
        }
        
      } catch (error) {
        this.logError('Content rendering failed', error);
        this.showError();
      }
    }
    
    /**
     * Show loading state in modal
     */
    showLoading() {
      try {
        const loadingEl = document.getElementById('vp-policy-loading');
        const contentEl = document.getElementById('vp-policy-content');
        const errorEl = document.getElementById('vp-policy-error');
        
        if (!loadingEl) {
          console.warn('[Vision Privacy] Loading element not found, cannot show loading state.');
          return;
        }
        
        loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        
      } catch (error) {
        this.logError('Failed to show loading state', error);
      }
    }
    
    /**
     * Show error message in modal (Swedish)
     */
    showError() {
      try {
        const loadingEl = document.getElementById('vp-policy-loading');
        const contentEl = document.getElementById('vp-policy-content');
        const errorEl = document.getElementById('vp-policy-error');
        
        if (!errorEl) {
          console.error('[Vision Privacy] Error element not found, cannot show error message.');
          // Fallback: try to show error in content area
          if (contentEl) {
            contentEl.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: #d32f2f;"><p>Det gick inte att ladda policyn. Försök igen senare.</p></div>';
            contentEl.style.display = 'block';
          }
          return;
        }
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'none';
        errorEl.style.display = 'block';
        
      } catch (error) {
        this.logError('Failed to show error state', error);
      }
    }
    
    /**
     * Trap focus within modal for accessibility
     */
    trapFocus() {
      if (!this.modal) {
        console.warn('[Vision Privacy] Cannot trap focus: Modal reference not found.');
        return;
      }
      
      try {
        // Query all focusable elements within modal
        const focusableElements = this.modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) {
          console.warn('[Vision Privacy] No focusable elements found in modal. Focus trap disabled.');
          return;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Focus first focusable element
        if (firstElement && typeof firstElement.focus === 'function') {
          try {
            firstElement.focus();
          } catch (focusError) {
            console.warn('[Vision Privacy] Could not focus first element:', focusError);
          }
        }
        
        // Create focus trap handler
        this.focusTrapHandler = (e) => {
          if (e.key !== 'Tab') return;
          
          try {
            if (e.shiftKey) {
              // Shift+Tab: moving backwards
              if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
              }
            } else {
              // Tab: moving forwards
              if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
              }
            }
          } catch (error) {
            this.logError('Focus trap handler error', error);
          }
        };
        
        // Add Tab key handler to cycle focus within modal
        this.modal.addEventListener('keydown', this.focusTrapHandler);
        
      } catch (error) {
        this.logError('Focus trap setup failed', error);
      }
    }
    
    /**
     * Log error with context for debugging
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    logError(message, error) {
      const errorDetails = {
        message: message,
        error: error ? error.message : 'Unknown error',
        stack: error ? error.stack : undefined,
        siteId: this.siteId,
        timestamp: new Date().toISOString()
      };
      
      console.error('[Vision Privacy Error]', message, errorDetails);
      
      // Store error for potential debugging
      if (!window.VisionPrivacyErrors) {
        window.VisionPrivacyErrors = [];
      }
      window.VisionPrivacyErrors.push(errorDetails);
      
      // Keep only last 10 errors to avoid memory issues
      if (window.VisionPrivacyErrors.length > 10) {
        window.VisionPrivacyErrors.shift();
      }
    }
  }
  
  // Initialize PolicyModalManager when DOM is ready
  function initPolicyModal() {
    try {
      // Get site ID from global variable or data attribute
      const siteId = window.VP_SITE_ID || document.body.dataset.vpSiteId;
      const apiEndpoint = window.VP_API_ENDPOINT || window.location.origin;
      
      if (!siteId) {
        console.warn('[Vision Privacy] Site ID not found. Policy modal will be disabled. Set window.VP_SITE_ID or data-vp-site-id on body element.');
        return;
      }
      
      // Create and store policy modal manager instance
      if (!window.VisionPrivacy) {
        window.VisionPrivacy = {};
      }
      
      try {
        window.VisionPrivacy.policyModal = new PolicyModalManager(siteId, apiEndpoint);
      } catch (error) {
        console.error('[Vision Privacy] Failed to initialize PolicyModalManager:', error);
        console.warn('[Vision Privacy] Policy modal functionality will be unavailable. Policy links may not work.');
      }
      
    } catch (error) {
      console.error('[Vision Privacy] Critical error during policy modal initialization:', error);
    }
  }
  
  // Initialize on DOM ready with error handling
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPolicyModal);
    } else {
      initPolicyModal();
    }
  } catch (error) {
    console.error('[Vision Privacy] Failed to set up policy modal initialization:', error);
  }
})();
  `.trim()
}
