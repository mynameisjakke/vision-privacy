import { NextRequest } from 'next/server'
import { GET } from '@/app/api/demo-policy/[policy_type]/route'

// Mock dependencies
jest.mock('@/lib/policy-template', () => ({
  PolicyTemplateEngine: {
    getActiveTemplate: jest.fn(),
    getDemoVariables: jest.fn(),
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

describe('/api/demo-policy/[policy_type]', () => {
  const mockPolicyTemplateEngine = require('@/lib/policy-template').PolicyTemplateEngine
  const mockCacheManager = require('@/lib/cache').CacheManager

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/demo-policy/[policy_type]', () => {
    const mockTemplate = {
      id: 'template-123',
      template_type: 'cookie_notice',
      content: '<h1>{{DOMAIN_NAME}} Cookie Policy</h1>',
      version: '1.0.0',
      is_active: true,
      updated_at: '2024-01-01T00:00:00Z'
    }

    const mockDemoVariables = {
      DOMAIN_NAME: 'demo.visionprivacy.com',
      COMPANY_NAME: 'Demo Företag AB',
      COMPANY_NAME_OR_DOMAIN: 'Demo Företag AB',
      ORG_NUMBER: '556123-4567',
      COMPANY_ADDRESS: 'Demovägen 123, 123 45 Stockholm',
      CONTACT_EMAIL: 'info@demo.visionprivacy.com',
      LAST_UPDATED_DATE: '01-01-2024',
      ESSENTIAL_COOKIES_LIST: '<ul><li>vp_consent</li></ul>',
      FUNCTIONAL_COOKIES_LIST: '<ul><li>YSC</li></ul>',
      ANALYTICS_COOKIES_LIST: '<ul><li>_ga</li></ul>',
      ADVERTISING_COOKIES_LIST: '<ul><li>_fbp</li></ul>',
      COOKIE_DETAILS_TABLE: '<table></table>',
      FORM_PLUGIN_NAME: 'Contact Form 7',
      ECOM_PLUGIN_NAME: 'WooCommerce'
    }

    it('should successfully fetch and render demo cookie policy', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue(mockDemoVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>demo.visionprivacy.com Cookie Policy</h1>')

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      const response = await GET(request, {
        params: { policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Cookiepolicy')
      expect(data.data.content).toBe('<h1>demo.visionprivacy.com Cookie Policy</h1>')
      expect(data.data.version).toBe('1.0.0')
      expect(mockPolicyTemplateEngine.getActiveTemplate).toHaveBeenCalledWith('cookie_notice')
      expect(mockPolicyTemplateEngine.getDemoVariables).toHaveBeenCalled()
      expect(mockCacheManager.set).toHaveBeenCalled()
    })

    it('should successfully fetch and render demo privacy policy', async () => {
      const privacyTemplate = { ...mockTemplate, template_type: 'policy' }
      
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(privacyTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue(mockDemoVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>Demo Privacy Policy</h1>')

      const request = new NextRequest('http://localhost:3000/api/demo-policy/privacy')
      const response = await GET(request, {
        params: { policy_type: 'privacy' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('Integritetspolicy')
      expect(mockPolicyTemplateEngine.getActiveTemplate).toHaveBeenCalledWith('policy')
    })

    it('should return cached demo policy when available', async () => {
      const cachedData = {
        title: 'Cookiepolicy',
        content: '<h1>Cached Demo Content</h1>',
        lastUpdated: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      }

      mockCacheManager.get.mockResolvedValue(cachedData)

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      const response = await GET(request, {
        params: { policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(cachedData)
      expect(mockPolicyTemplateEngine.getActiveTemplate).not.toHaveBeenCalled()
      expect(mockPolicyTemplateEngine.getDemoVariables).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid policy type', async () => {
      const request = new NextRequest('http://localhost:3000/api/demo-policy/invalid')
      const response = await GET(request, {
        params: { policy_type: 'invalid' }
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid policy type')
      expect(data.code).toBe(1006) // VALIDATION_ERROR
    })

    it('should return 404 when policy template is not found', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      const response = await GET(request, {
        params: { policy_type: 'cookie' }
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
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue(mockDemoVariables)
      mockPolicyTemplateEngine.renderTemplate.mockImplementation(() => {
        throw new Error('Rendering failed')
      })

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      const response = await GET(request, {
        params: { policy_type: 'cookie' }
      })

      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to render policy')
      expect(data.code).toBe(1010)
    })

    it('should cache rendered demo policy with 5 minute TTL', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue(mockDemoVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>Content</h1>')

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      await GET(request, {
        params: { policy_type: 'cookie' }
      })

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'policy:template:demo:cookie',
        expect.any(Object),
        300 // 5 minutes
      )
    })

    it('should use demo variables instead of site-specific data', async () => {
      mockCacheManager.get.mockResolvedValue(null)
      mockPolicyTemplateEngine.getActiveTemplate.mockResolvedValue(mockTemplate)
      mockPolicyTemplateEngine.getDemoVariables.mockReturnValue(mockDemoVariables)
      mockPolicyTemplateEngine.renderTemplate.mockReturnValue('<h1>Content</h1>')

      const request = new NextRequest('http://localhost:3000/api/demo-policy/cookie')
      await GET(request, {
        params: { policy_type: 'cookie' }
      })

      expect(mockPolicyTemplateEngine.getDemoVariables).toHaveBeenCalled()
      expect(mockPolicyTemplateEngine.renderTemplate).toHaveBeenCalledWith(
        mockTemplate.content,
        mockDemoVariables
      )
    })
  })
})
