import { NextRequest } from 'next/server'
import { GET } from '@/app/api/policy/[site_id]/[policy_type]/route'

// Mock dependencies
jest.mock('@/lib/policy-template', () => ({
  PolicyTemplateEngine: {
    getActiveTemplate: jest.fn(),
    getSiteVariables: jest.fn(),
    renderTemplate: jest.fn()
  }
}))

jest.mock('@/lib/database', () => ({
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

describe('/api/policy/[site_id]/[policy_type]', () => {
  const mockPolicyTemplateEngine = require('@/lib/policy-template').PolicyTemplateEngine
  const mockCacheManager = require('@/lib/cache').CacheManager

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/policy/[site_id]/[policy_type]', () => {
    const mockTemplate = {
      id: 'template-123',
      template_type: 'cookie_notice',
      content: '<h1>{{DOMAIN_NAME}} Cookie Policy</h1>',
      version: '1.0.0',
      is_active: true,
      updated_at: '2024-01-01T00:00:00Z'
    }

    const mockVariables = {
      DOMAIN_NAME: 'example.com',
      COMPANY_NAME: 'Example Corp',
      COMPANY_NAME_OR_DOMAIN: 'Example Corp',
      ORG_NUMBER: '556123-4567',
      COMPANY_ADDRESS: 'Street 123',
      CONTACT_EMAIL: 'info@example.com',
      LAST_UPDATED_DATE: '01-01-2024',
      ESSENTIAL_COOKIES_LIST: '<ul><li>cookie1</li></ul>',
      FUNCTIONAL_COOKIES_LIST: '<ul><li>cookie2</li></ul>',
      ANALYTICS_COOKIES_LIST: '<ul><li>cookie3</li></ul>',
      ADVERTISING_COOKIES_LIST: '<ul><li>cookie4</li></ul>',
      COOKIE_DETAILS_TABLE: '<table></table>',
      FORM_PLUGIN_NAME: 'Contact Form 7',
      ECOM_PLUGIN_NAME: 'WooCommerce'
    }

    it('should successfully fetch and render cookie policy', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue(mockVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>example.com Cookie Policy</h1>')

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Cookiepolicy')
      expect(data.data.content).toBe('<h1>example.com Cookie Policy</h1>')
      expect(data.data.version).toBe('1.0.0')
      expect(mockPolicyTemplateEngine.getActiveTemplate).toHaveBeenCalledWith('cookie_notice')
      expect(mockPolicyTemplateEngine.getSiteVariables).toHaveBeenCalledWith('site-123')
      expect(mockCacheManager.set).toHaveBeenCalled()
    })

    it('should successfully fetch and render privacy policy', async () => {
      const privacyTemplate = { ...mockTemplate, template_type: 'policy' }
      
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(privacyTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue(mockVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>Privacy Policy</h1>')

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/privacy')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'privacy' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Integritetspolicy')
      expect(mockPolicyTemplateEngine.getActiveTemplate).toHaveBeenCalledWith('policy')
    })

    it('should return cached policy when available', async () => {
      const cachedData = {
        title: 'Cookiepolicy',
        content: '<h1>Cached Content</h1>',
        lastUpdated: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      }

      mockCacheManager.get.mockResolvedValue(cachedData)

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(cachedData)
      expect(mockPolicyTemplateEngine.getActiveTemplate).not.toHaveBeenCalled()
      expect(mockPolicyTemplateEngine.getSiteVariables).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid policy type', async () => {
      const request = new NextRequest('http://localhost:3000/api/policy/site-123/invalid')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'invalid' }
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid policy type')
      expect(data.code).toBe(1006) // VALIDATION_ERROR
    })

    it('should return 404 when site is not found', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockRejectedValue(
        new Error('Site not found: invalid-site')
      )

      const request = new NextRequest('http://localhost:3000/api/policy/invalid-site/cookie')
      const response = await GET(request, {
        params: { site_id: 'invalid-site', policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Site not found')
      expect(data.code).toBe(1001) // INVALID_SITE_ID
    })

    it('should return 404 when policy template is not found', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Policy template not found')
      expect(data.code).toBe(1009)
    })

    it('should return 500 for rendering errors', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue(mockVariables)
      mockPolicyTemplateEngine.renderTemplate.mockImplementation(() => {
        throw new Error('Rendering failed')
      })

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      const response = await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to render policy')
      expect(data.code).toBe(1010)
    })

    it('should cache rendered policy with 5 minute TTL', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getSiteVariables.mockResolvedValue(mockVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>Content</h1>')

      const request = new NextRequest('http://localhost:3000/api/policy/site-123/cookie')
      await GET(request, {
        params: { site_id: 'site-123', policy_type: 'cookie' }
      })

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'policy:template:rendered:site-123:cookie',
        expect.any(Object),
        300 // 5 minutes
      )
    })
  })
})
