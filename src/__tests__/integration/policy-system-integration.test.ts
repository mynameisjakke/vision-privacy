/**
 * Policy System Integration Tests
 * Tests the end-to-end flow of policy rendering and display
 */

import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn()
              }))
            }))
          })),
          single: jest.fn()
        }))
      }))
    }))
  }
}))

jest.mock('@/lib/database', () => ({
  SitesDB: {
    findById: jest.fn()
  },
  PolicyTemplatesDB: {
    findActive: jest.fn()
  }
}))

jest.mock('@/lib/cache', () => ({
  CacheManager: {
    get: jest.fn(),
    set: jest.fn()
  },
  CACHE_KEYS: {
    POLICY_TEMPLATE: 'policy:template:'
  }
}))

jest.mock('@/lib/policy-template', () => {
  const actual = jest.requireActual('@/lib/policy-template')
  return {
    PolicyTemplateEngine: {
      ...actual.PolicyTemplateEngine,
      getActiveTemplate: jest.fn(),
      getSiteVariables: jest.fn(),
      getDemoVariables: jest.fn()
    }
  }
})

describe('Policy System Integration', () => {
  const mockSitesDB = require('@/lib/database').SitesDB
  const mockPolicyTemplatesDB = require('@/lib/database').PolicyTemplatesDB
  const mockCacheManager = require('@/lib/cache').CacheManager
  const mockSupabaseAdmin = require('@/lib/supabase').supabaseAdmin
  const mockPolicyTemplateEngine = require('@/lib/policy-template').PolicyTemplateEngine

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Cookie Policy Flow', () => {
    it('should fetch, render and return cookie policy for a site', async () => {
      // Setup mock data
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        company_name: 'Example Corp',
        installed_plugins: ['Contact Form 7']
      }

      const mockTemplate = {
        id: 'template-1',
        template_type: 'cookie_notice',
        content: '<h1>Cookiepolicy för {{DOMAIN_NAME}}</h1><p>{{COMPANY_NAME}}</p>',
        version: '1.0.0',
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z'
      }

      const mockScan = {
        detected_cookies: [
          {
            name: 'session_id',
            domain: 'example.com',
            category: 'essential',
            description: 'Session cookie'
          }
        ]
      }

      // Setup mocks
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue({
        DOMAIN_NAME: 'example.com',
        COMPANY_NAME: 'Example Corp',
        COMPANY_NAME_OR_DOMAIN: 'Example Corp',
        ORG_NUMBER: '',
        COMPANY_ADDRESS: '',
        CONTACT_EMAIL: '',
        LAST_UPDATED_DATE: '01-01-2024',
        ESSENTIAL_COOKIES_LIST: '<ul><li>session_id</li></ul>',
        FUNCTIONAL_COOKIES_LIST: '',
        ANALYTICS_COOKIES_LIST: '',
        ADVERTISING_COOKIES_LIST: '',
        COOKIE_DETAILS_TABLE: '<table></table>',
        FORM_PLUGIN_NAME: 'Contact Form 7',
        ECOM_PLUGIN_NAME: 'e-handelsplattform'
      })

      // Import and call the API
      const { GET } = await import('@/app/api/policy/[site_id]/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      // Verify response
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Cookiepolicy')
      expect(data.data.content).toContain('example.com')
      expect(data.data.content).toContain('Example Corp')
      expect(data.data.version).toBe('1.0.0')
      
      // Verify caching was used
      expect(mockCacheManager.set).toHaveBeenCalled()
    })

    it('should return cached policy on subsequent requests', async () => {
      const cachedPolicy = {
        title: 'Cookiepolicy',
        content: '<h1>Cached Policy</h1>',
        lastUpdated: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      }

      mockCacheManager.get.mockResolvedValue(cachedPolicy)

      const { GET } = await import('@/app/api/policy/[site_id]/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.data).toEqual(cachedPolicy)
      expect(mockPolicyTemplatesDB.findActive).not.toHaveBeenCalled()
    })
  })

  describe('Privacy Policy Flow', () => {
    it('should fetch and render privacy policy', async () => {
      const mockSite = {
        id: 'site-456',
        domain: 'privacy-test.com',
        company_name: 'Privacy Test AB',
        installed_plugins: []
      }

      const mockTemplate = {
        id: 'template-2',
        template_type: 'policy',
        content: '<h1>Integritetspolicy för {{DOMAIN_NAME}}</h1>',
        version: '1.0.0',
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue({
        DOMAIN_NAME: 'privacy-test.com',
        COMPANY_NAME: 'Privacy Test AB',
        COMPANY_NAME_OR_DOMAIN: 'Privacy Test AB',
        ORG_NUMBER: '',
        COMPANY_ADDRESS: '',
        CONTACT_EMAIL: '',
        LAST_UPDATED_DATE: '01-01-2024',
        ESSENTIAL_COOKIES_LIST: '',
        FUNCTIONAL_COOKIES_LIST: '',
        ANALYTICS_COOKIES_LIST: '',
        ADVERTISING_COOKIES_LIST: '',
        COOKIE_DETAILS_TABLE: '<p><em>Inga cookies</em></p>',
        FORM_PLUGIN_NAME: 'kontaktformulär',
        ECOM_PLUGIN_NAME: 'e-handelsplattform'
      })

      const { GET } = await import('@/app/api/policy/[site_id]/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/policy/site-456/privacy')
      const response = await GET(request, {
        params: { site_id: 'site-456', policy_type: 'privacy' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Integritetspolicy')
      expect(data.data.content).toContain('privacy-test.com')
    })
  })

  describe('Demo Policy Flow', () => {
    it('should render demo cookie policy with mock data', async () => {
      const mockTemplate = {
        id: 'template-1',
        template_type: 'cookie_notice',
        content: '<h1>{{DOMAIN_NAME}} Cookie Policy</h1><p>{{COMPANY_NAME}}</p>',
        version: '1.0.0',
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue({
        DOMAIN_NAME: 'demo.visionprivacy.com',
        COMPANY_NAME: 'Demo Företag AB',
        COMPANY_NAME_OR_DOMAIN: 'Demo Företag AB',
        ORG_NUMBER: '556123-4567',
        COMPANY_ADDRESS: 'Demovägen 123',
        CONTACT_EMAIL: 'info@demo.visionprivacy.com',
        LAST_UPDATED_DATE: '01-01-2024',
        ESSENTIAL_COOKIES_LIST: '<ul><li>vp_consent</li></ul>',
        FUNCTIONAL_COOKIES_LIST: '',
        ANALYTICS_COOKIES_LIST: '',
        ADVERTISING_COOKIES_LIST: '',
        COOKIE_DETAILS_TABLE: '<table></table>',
        FORM_PLUGIN_NAME: 'Contact Form 7',
        ECOM_PLUGIN_NAME: 'WooCommerce'
      })

      const { GET } = await import('@/app/api/demo-policy/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      const response = await GET(request, {
        params: { policy_type: 'cookie' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Cookiepolicy')
      expect(data.data.content).toContain('demo.visionprivacy.com')
      expect(data.data.content).toContain('Demo Företag AB')
    })

    it('should render demo privacy policy', async () => {
      const mockTemplate = {
        id: 'template-2',
        template_type: 'policy',
        content: '<h1>Privacy Policy</h1>',
        version: '1.0.0',
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue({
        DOMAIN_NAME: 'demo.visionprivacy.com',
        COMPANY_NAME: 'Demo Företag AB',
        COMPANY_NAME_OR_DOMAIN: 'Demo Företag AB',
        ORG_NUMBER: '556123-4567',
        COMPANY_ADDRESS: 'Demovägen 123',
        CONTACT_EMAIL: 'info@demo.visionprivacy.com',
        LAST_UPDATED_DATE: '01-01-2024',
        ESSENTIAL_COOKIES_LIST: '',
        FUNCTIONAL_COOKIES_LIST: '',
        ANALYTICS_COOKIES_LIST: '',
        ADVERTISING_COOKIES_LIST: '',
        COOKIE_DETAILS_TABLE: '<table></table>',
        FORM_PLUGIN_NAME: 'Contact Form 7',
        ECOM_PLUGIN_NAME: 'WooCommerce'
      })

      const { GET } = await import('@/app/api/demo-policy/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/demo-policy/privacy')
      const response = await GET(request, {
        params: { policy_type: 'privacy' }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Integritetspolicy')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle site not found gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue({
        id: 'template-1',
        content: 'test',
        version: '1.0.0'
      })
      mockPolicyTemplateEngine.getSiteVariables.mockRejectedValue(
        new Error('Site not found: invalid-site')
      )

      const { GET } = await import('@/app/api/policy/[site_id]/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/policy/invalid-site/cookie')
      const response = await GET(request, {
        params: { site_id: 'invalid-site', policy_type: 'cookie' }
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Site not found')
    })

    it('should handle missing template gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(null)

      const { GET } = await import('@/app/api/policy/[site_id]/[policy_type]/route')
      
      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Policy template not found')
    })
  })
})
