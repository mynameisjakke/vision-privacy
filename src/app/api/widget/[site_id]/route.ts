import { NextRequest } from 'next/server'
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, widgetConfigSchema } from '@/lib/validation'
import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase'
import { SitesDB, CookieCategoriesDB, PolicyTemplatesDB } from '@/lib/database'

interface WidgetConfigResponse {
  banner_html: string
  banner_css: string
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
) {
  try {
    const { site_id } = params
    
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
    
    // Get active cookie categories
    const cookieCategories = await CookieCategoriesDB.listActive()
    
    // Get active banner template
    const bannerTemplate = await PolicyTemplatesDB.findActive('banner')
    
    // Get active policy template
    const policyTemplate = await PolicyTemplatesDB.findActive('policy')
    
    // Generate banner HTML with site-specific data
    const bannerHtml = generateBannerHtml(bannerTemplate?.content || getDefaultBannerTemplate(), site)
    
    // Generate banner CSS
    const bannerCss = generateBannerCss()
    
    // Build widget configuration response
    const widgetConfig: WidgetConfigResponse = {
      banner_html: bannerHtml,
      banner_css: bannerCss,
      cookie_categories: cookieCategories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        is_essential: category.is_essential,
        sort_order: category.sort_order
      })),
      privacy_policy_url: `${process.env.NEXT_PUBLIC_API_URL}/api/policy/${site_id}`,
      consent_endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/consent`,
      site_config: {
        domain: site.domain,
        scan_interval: 300000 // 5 minutes in milliseconds
      }
    }
    
    // Set caching headers for performance
    const response = createSuccessResponse(widgetConfig)
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes cache
    response.headers.set('Vary', 'Accept-Encoding')
    
    return response
    
  } catch (error) {
    console.error('Widget config fetch failed:', error)
    return createNotFoundResponse('Widget configuration unavailable')
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
    
    .vp-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000000;
      display: flex;
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
    }
    
    .vp-modal-header {
      padding: 20px 20px 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    }
    
    .vp-modal-body {
      padding: 20px;
    }
    
    .vp-modal-footer {
      padding: 0 20px 20px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .vp-category {
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }
    
    .vp-category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .vp-category-name {
      font-weight: 600;
      color: #333;
    }
    
    .vp-category-description {
      color: #666;
      font-size: 13px;
    }
    
    .vp-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
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
    }
    
    input:checked + .vp-slider {
      background-color: #007cba;
    }
    
    input:checked + .vp-slider:before {
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
      }
      
      .vp-btn {
        flex: 1;
        min-width: 0;
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