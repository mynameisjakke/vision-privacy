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
    description: string
    is_essential: boolean
    sort_order: number
  }>
  privacy_policy_url: string
  consent_endpoint: string
  site_config: {
    domain: string
    scan_interval: number
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { site_id: string } }
): Promise<Response> {
  return await withPerformanceMonitoring(`widget:${params.site_id}`, async () => {
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
    
    // Build widget configuration response
    return {
      banner_html: bannerHtml,
      banner_css: bannerCss,
      floating_button_js: floatingButtonJs,
      floating_button_css: floatingButtonCss,
      cookie_categories: cookieCategories.map((category: any) => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        is_essential: category.is_essential,
        sort_order: category.sort_order
      })),
      privacy_policy_url: `${process.env.NEXT_PUBLIC_API_URL}/api/policy/${siteId}`,
      consent_endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/consent`,
      site_config: {
        domain: site.domain,
        scan_interval: 300000 // 5 minutes in milliseconds
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
    <div id="vp-cookie-banner" class="vp-banner">
      <div class="vp-banner-content">
        <div class="vp-banner-text">
          <h3>We value your privacy</h3>
          <p>We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
        </div>
        <div class="vp-banner-actions">
          <button id="vp-accept-all" class="vp-btn vp-btn-primary">Accept All</button>
          <button id="vp-reject-all" class="vp-btn vp-btn-secondary">Reject All</button>
          <button id="vp-settings" class="vp-btn vp-btn-link">Cookie Settings</button>
        </div>
        <div class="vp-banner-links">
          <button class="vp-policy-link" data-policy="privacy" type="button">Privacy Policy</button>
          <span class="vp-separator">•</span>
          <button class="vp-policy-link" data-policy="cookie" type="button">Cookie Policy</button>
        </div>
      </div>
    </div>
    
    <div id="vp-settings-modal" class="vp-modal" style="display: none;">
      <div class="vp-modal-content">
        <div class="vp-modal-header">
          <h3>Cookie Settings</h3>
          <button id="vp-close-settings" class="vp-close">&times;</button>
        </div>
        <div class="vp-modal-body">
          <div id="vp-cookie-categories"></div>
        </div>
        <div class="vp-modal-footer">
          <button id="vp-save-settings" class="vp-btn vp-btn-primary">Save Settings</button>
          <button id="vp-cancel-settings" class="vp-btn vp-btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
    
    <div id="vp-policy-modal" class="vp-modal vp-policy-modal" role="dialog" aria-modal="true" aria-labelledby="vp-policy-title" aria-hidden="true" style="display: none;">
      <div class="vp-modal-backdrop"></div>
      <div class="vp-modal-content vp-policy-content">
        <div class="vp-modal-header vp-policy-header">
          <h3 id="vp-policy-title"></h3>
          <button id="vp-close-policy" class="vp-close" aria-label="Close policy">&times;</button>
        </div>
        <div class="vp-modal-body vp-policy-body">
          <div id="vp-policy-loading" class="vp-loading">
            <span class="vp-spinner"></span>
            <p>Loading policy...</p>
          </div>
          <div id="vp-policy-content" class="vp-policy-text" style="display: none;"></div>
          <div id="vp-policy-error" class="vp-error" style="display: none;">
            <p>Unable to load policy. Please try again later.</p>
          </div>
        </div>
      </div>
    </div>
  `
}

function generateBannerCss(): string {
  return `
    .vp-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .vp-banner-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    
    .vp-banner-text h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .vp-banner-text p {
      margin: 0;
      color: #666;
    }
    
    .vp-banner-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }
    
    .vp-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }
    
    .vp-btn-primary {
      background: #007cba;
      color: white;
    }
    
    .vp-btn-primary:hover {
      background: #005a87;
    }
    
    .vp-btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    
    .vp-btn-secondary:hover {
      background: #e0e0e0;
    }
    
    .vp-btn-link {
      background: transparent;
      color: #007cba;
      text-decoration: underline;
    }
    
    .vp-btn-link:hover {
      color: #005a87;
    }
    
    .vp-banner-links,
    .banner-links {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .vp-policy-link,
    .banner-link {
      background: none;
      border: none;
      color: #007cba;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: 13px;
      font-family: inherit;
    }
    
    .vp-policy-link:hover,
    .banner-link:hover {
      color: #005a87;
    }
    
    .vp-policy-link:focus,
    .banner-link:focus {
      outline: 2px solid #007cba;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    .vp-separator,
    .separator {
      color: #999;
      user-select: none;
    }
    
    .vp-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
    }
    
    .vp-modal-content {
      background: white;
      border-radius: 8px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .vp-modal-header {
      padding: 20px 20px 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
      padding-bottom: 15px;
    }
    
    .vp-modal-header h3 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    
    .vp-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .vp-close:hover {
      background: #f0f0f0;
      color: #333;
    }
    
    .vp-modal-body {
      padding: 20px;
    }
    
    .vp-modal-body > p {
      margin: 0 0 20px 0;
      color: #666;
      line-height: 1.5;
    }
    
    .vp-modal-footer {
      padding: 0 20px 20px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      border-top: 1px solid #e0e0e0;
      margin-top: 20px;
      padding-top: 15px;
    }
    
    .vp-category {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: #fafafa;
    }
    
    .vp-category:last-child {
      margin-bottom: 0;
    }
    
    .vp-category-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .vp-category-info {
      flex: 1;
      margin-right: 15px;
    }
    
    .vp-category-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .vp-essential-badge {
      background: #28a745;
      color: white;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    
    .vp-category-description {
      color: #666;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
    }
    
    .vp-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .vp-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .vp-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }
    
    .vp-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    
    input:checked + .vp-slider {
      background-color: #007cba;
    }
    
    input:disabled + .vp-slider {
      background-color: #28a745;
      cursor: not-allowed;
    }
    
    input:checked + .vp-slider:before,
    input:disabled + .vp-slider:before {
      transform: translateX(20px);
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
    /* Policy Modal Specific Styles */
    .vp-policy-modal .vp-modal-content {
      max-width: 800px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      /* Performance optimization for animations */
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    
    .vp-policy-modal .vp-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: -1;
    }
    
    .vp-policy-header {
      position: sticky;
      top: 0;
      background: white;
      z-index: 10;
      padding: 20px 30px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: box-shadow 0.2s ease;
    }
    
    .vp-policy-header.scrolled {
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .vp-policy-body {
      padding: 20px 30px;
      overflow-y: auto;
      flex: 1;
      max-height: calc(85vh - 80px);
      /* Performance optimizations */
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      will-change: scroll-position;
    }
    
    .vp-policy-text {
      color: #333;
      line-height: 1.7;
    }
    
    .vp-policy-text h1 {
      font-size: 24px;
      margin: 0 0 20px 0;
      color: #222;
      font-weight: 600;
    }
    
    .vp-policy-text h2 {
      font-size: 20px;
      margin: 30px 0 15px 0;
      color: #333;
      font-weight: 600;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
    }
    
    .vp-policy-text h3 {
      font-size: 16px;
      margin: 20px 0 10px 0;
      color: #444;
      font-weight: 600;
    }
    
    .vp-policy-text p {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #555;
    }
    
    .vp-policy-text ul,
    .vp-policy-text ol {
      margin: 0 0 15px 20px;
      padding-left: 20px;
    }
    
    .vp-policy-text li {
      margin-bottom: 8px;
      font-size: 14px;
      color: #555;
    }
    
    .vp-policy-text strong {
      font-weight: 600;
      color: #222;
    }
    
    .vp-policy-text a {
      color: #007cba;
      text-decoration: underline;
    }
    
    .vp-policy-text a:hover {
      color: #005a87;
    }
    
    .vp-policy-text a:focus {
      outline: 2px solid #007cba;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Loading State */
    .vp-loading {
      text-align: center;
      padding: 60px 20px;
    }
    
    .vp-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007cba;
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
    
    /* Error State */
    .vp-error {
      text-align: center;
      padding: 60px 20px;
      color: #d32f2f;
    }
    
    .vp-error p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }
    
    /* Policy Links in Banner */
    .vp-banner-links,
    .banner-links {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .vp-policy-link,
    .banner-link {
      background: none;
      border: none;
      color: #007cba;
      text-decoration: underline;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 13px;
      font-family: inherit;
      transition: color 0.2s ease, background-color 0.2s ease;
      border-radius: 3px;
    }
    
    .vp-policy-link:hover,
    .banner-link:hover {
      color: #005a87;
      background-color: rgba(0, 124, 186, 0.05);
    }
    
    .vp-policy-link:focus,
    .banner-link:focus {
      outline: 2px solid #007cba;
      outline-offset: 2px;
      border-radius: 3px;
      background-color: rgba(0, 124, 186, 0.1);
    }
    
    .vp-policy-link:active,
    .banner-link:active {
      color: #004466;
    }
    
    .vp-separator,
    .separator {
      color: #999;
      user-select: none;
      pointer-events: none;
    }
    
    /* Close Button Accessibility */
    .vp-policy-header .vp-close {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    
    .vp-policy-header .vp-close:hover {
      background: #f0f0f0;
      color: #333;
    }
    
    .vp-policy-header .vp-close:focus {
      outline: 2px solid #007cba;
      outline-offset: 2px;
      background: #e8f4f8;
    }
    
    /* Mobile Responsive Styles */
    @media (max-width: 768px) {
      .vp-policy-modal .vp-modal-content {
        max-width: 95%;
        max-height: 90vh;
        width: 95%;
      }
      
      .vp-policy-header {
        padding: 15px 20px;
      }
      
      .vp-policy-body {
        padding: 15px 20px;
        max-height: calc(90vh - 70px);
      }
      
      .vp-policy-text h1 {
        font-size: 20px;
        margin-bottom: 15px;
      }
      
      .vp-policy-text h2 {
        font-size: 18px;
        margin: 25px 0 12px 0;
      }
      
      .vp-policy-text h3 {
        font-size: 15px;
        margin: 18px 0 8px 0;
      }
      
      .vp-policy-text p,
      .vp-policy-text li {
        font-size: 13px;
      }
      
      .vp-banner-links,
      .banner-links {
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .vp-loading {
        padding: 40px 15px;
      }
      
      .vp-spinner {
        width: 35px;
        height: 35px;
        border-width: 3px;
      }
      
      .vp-error {
        padding: 40px 15px;
      }
    }
    
    /* Smooth Scrolling */
    .vp-policy-body {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Scrollbar Styling (Webkit browsers) */
    .vp-policy-body::-webkit-scrollbar {
      width: 8px;
    }
    
    .vp-policy-body::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    .vp-policy-body::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    .vp-policy-body::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* Accessibility - Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .vp-spinner {
        animation: none;
        border-top-color: transparent;
      }
      
      .vp-policy-body {
        scroll-behavior: auto;
      }
      
      .vp-policy-link,
      .banner-link,
      .vp-close {
        transition: none;
      }
    }
    
    /* Print Styles */
    @media print {
      .vp-policy-modal {
        display: none !important;
      }
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
  
  const STORAGE_KEY = 'vision-privacy-consent';
  const BUTTON_ID = 'vision-privacy-floating-btn';
  
  function hasConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (e) {
      return false;
    }
  }
  
  function isBannerVisible() {
    const banner = document.querySelector('.vision-privacy-banner, .vp-banner');
    return banner && banner.style.display !== 'none';
  }
  
  function createFloatingButton() {
    if (!hasConsent() || document.getElementById(BUTTON_ID)) {
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
    button.style.display = isBannerVisible() ? 'none' : 'flex';
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
      if (e.key === STORAGE_KEY) {
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
    show: createFloatingButton,
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
  bottom: 20px;
  right: 20px;
  z-index: 999998;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInFromRight 0.5s ease-out;
}

@keyframes slideInFromRight {
  from { transform: translateX(150px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.vision-privacy-floating-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.vision-privacy-floating-btn:active {
  transform: translateY(-1px);
}

.vision-privacy-floating-btn:focus {
  outline: 3px solid #667eea;
  outline-offset: 3px;
}

.floating-btn-icon {
  font-size: 1.5rem;
  line-height: 1;
  animation: wiggle 2s ease-in-out infinite;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
  50%, 60%, 70%, 80%, 90% { transform: rotate(0deg); }
}

.floating-btn-text {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .vision-privacy-floating-btn {
    bottom: 15px;
    right: 15px;
    padding: 1rem;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    justify-content: center;
  }
  
  .floating-btn-text {
    display: none;
  }
  
  .floating-btn-icon {
    font-size: 1.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vision-privacy-floating-btn,
  .floating-btn-icon {
    animation: none;
  }
}

@media print {
  .vision-privacy-floating-btn {
    display: none !important;
  }
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
