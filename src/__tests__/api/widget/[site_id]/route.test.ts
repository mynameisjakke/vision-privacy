import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/widget/[site_id]/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
  SitesDB: {
    getById: jest.fn()
  },
  CookieCategoriesDB: {
    listActive: jest.fn()
  },
  PolicyTemplatesDB: {
    findActive: jest.fn()
  }
}))

jest.mock('@/lib/cache', () => ({
  WidgetCache: {
    getConfig: jest.fn(),
    setConfig: jest.fn()
  },
  CookieCache: {
    getCategories: jest.fn(),
    setCategories: jest.fn()
  },
  PolicyCache: {
    getTemplate: jest.fn(),
    setTemplate: jest.fn()
  },
  SiteCache: {
    getData: jest.fn(),
    setData: jest.fn()
  }
}))

jest.mock('@/lib/performance', () => ({
  withPerformanceMonitoring: jest.fn((name, fn) => fn()),
  ResponseOptimizer: {
    addPerformanceHeaders: jest.fn((response) => response),
    addCDNHeaders: jest.fn((response) => response)
  }
}))

jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(),
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status,
    headers: new Map()
  }))
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn(),
  widgetConfigSchema: {}
}))

jest.mock('@/utils/response', () => ({
  createMethodNotAllowedResponse: jest.fn((methods) => ({
    json: () => Promise.resolve({ error: 'Method Not Allowed', allowed_methods: methods }),
    status: 405
  }))
}))

describe('/api/widget/[site_id]', () => {
  const mockAuthMiddleware = require('@/lib/auth-middleware').withAuthMiddleware
  const mockCreateAuthenticatedResponse = require('@/lib/auth-middleware').createAuthenticatedResponse
  const mockSitesDB = require('@/lib/database').SitesDB
  const mockCookieCategoriesDB = require('@/lib/database').CookieCategoriesDB
  const mockPolicyTemplatesDB = require('@/lib/database').PolicyTemplatesDB
  const mockWidgetCache = require('@/lib/cache').WidgetCache
  const mockCookieCache = require('@/lib/cache').CookieCache
  const mockPolicyCache = require('@/lib/cache').PolicyCache
  const mockSiteCache = require('@/lib/cache').SiteCache
  const mockValidateRequest = require('@/lib/validation').validateRequest

  const mockSite = {
    id: '12345678-1234-1234-1234-123456789012',
    domain: 'https://example.com',
    status: 'active'
  }

  const mockCookieCategories = [
    {
      id: 'essential',
      name: 'Essential',
      description: 'Required for basic site functionality',
      is_essential: true,
      sort_order: 0
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Help us understand how visitors use our site',
      is_essential: false,
      sort_order: 1
    }
  ]

  const mockBannerTemplate = {
    id: 'template-1',
    template_type: 'banner',
    content: '<div>Cookie banner template with {{SITE_DOMAIN}}</div>',
    version: '1.0.0',
    is_active: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth middleware response
    mockAuthMiddleware.mockResolvedValue({
      success: true,
      context: { requestId: 'test-request-id' }
    })

    // Default successful response creation
    mockCreateAuthenticatedResponse.mockImplementation((data: any, status: number) => {
      const response = {
        json: () => Promise.resolve(data),
        status,
        headers: new Map()
      }
      response.headers.set = jest.fn()
      return response
    })
  })

  describe('GET /api/widget/[site_id]', () => {
    const params = { site_id: '12345678-1234-1234-1234-123456789012' }

    it('should return widget config from cache when available', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      const cachedConfig = {
        banner_html: '<div>Cached banner</div>',
        banner_css: '.banner { color: blue; }',
        cookie_categories: mockCookieCategories,
        privacy_policy_url: `${process.env.NEXT_PUBLIC_API_URL}/api/policy/${params.site_id}`,
        consent_endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/consent`,
        site_config: {
          domain: mockSite.domain,
          scan_interval: 300000
        }
      }

      mockWidgetCache.getConfig.mockResolvedValue(cachedConfig)

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockWidgetCache.getConfig).toHaveBeenCalledWith(params.site_id)
      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        cachedConfig,
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should generate fresh widget config when cache miss', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      // Cache miss
      mockWidgetCache.getConfig.mockResolvedValue(null)
      
      // Mock fresh data generation
      mockSiteCache.getData.mockResolvedValue(null)
      mockSitesDB.getById.mockResolvedValue(mockSite)
      mockSiteCache.setData.mockResolvedValue(undefined)

      mockCookieCache.getCategories.mockResolvedValue(null)
      mockCookieCategoriesDB.listActive.mockResolvedValue(mockCookieCategories)
      mockCookieCache.setCategories.mockResolvedValue(undefined)

      mockPolicyCache.getTemplate.mockResolvedValue(null)
      mockPolicyTemplatesDB.findActive.mockResolvedValue(mockBannerTemplate)
      mockPolicyCache.setTemplate.mockResolvedValue(undefined)

      mockWidgetCache.setConfig.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockSitesDB.getById).toHaveBeenCalledWith(params.site_id)
      expect(mockCookieCategoriesDB.listActive).toHaveBeenCalled()
      expect(mockPolicyTemplatesDB.findActive).toHaveBeenCalledWith('banner')
      expect(mockWidgetCache.setConfig).toHaveBeenCalled()

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          banner_html: expect.stringContaining('example.com'), // Domain should be replaced
          banner_css: expect.stringContaining('.vp-banner'),
          cookie_categories: expect.arrayContaining([
            expect.objectContaining({
              id: 'essential',
              name: 'Essential',
              is_essential: true
            })
          ]),
          privacy_policy_url: `${process.env.NEXT_PUBLIC_API_URL}/api/policy/${params.site_id}`,
          consent_endpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/consent`
        }),
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return 404 for non-existent site', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      mockWidgetCache.getConfig.mockResolvedValue(null)
      mockSiteCache.getData.mockResolvedValue(null)
      mockSitesDB.getById.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Not found',
          message: 'Site not found or inactive',
          code: 1008
        },
        404,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return 404 for inactive site', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      mockWidgetCache.getConfig.mockResolvedValue(null)
      mockSiteCache.getData.mockResolvedValue(null)
      
      const inactiveSite = { ...mockSite, status: 'inactive' }
      mockSitesDB.getById.mockResolvedValue(inactiveSite)

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Not found',
          message: 'Site not found or inactive',
          code: 1008
        },
        404,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return validation error for invalid site_id', async () => {
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Invalid site ID format'
      })

      const request = new NextRequest(`http://localhost:3000/api/widget/invalid-id`, {
        method: 'GET'
      })

      const response = await GET(request, { params: { site_id: 'invalid-id' } })

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          message: 'Invalid site ID format',
          code: 1004
        },
        400,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should handle auth middleware failure', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        response: {
          json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
          status: 429
        }
      })

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(response.status).toBe(429)
    })

    it('should handle internal errors gracefully', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      mockWidgetCache.getConfig.mockRejectedValue(new Error('Cache error'))

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Internal error',
          message: 'Widget configuration unavailable',
          code: 1005
        },
        500,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should use default banner template when no template found', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: params.site_id }
      })

      mockWidgetCache.getConfig.mockResolvedValue(null)
      mockSiteCache.getData.mockResolvedValue(mockSite)
      mockCookieCache.getCategories.mockResolvedValue(mockCookieCategories)
      mockPolicyCache.getTemplate.mockResolvedValue(null)
      mockPolicyTemplatesDB.findActive.mockResolvedValue(null) // No template found

      const request = new NextRequest(`http://localhost:3000/api/widget/${params.site_id}`, {
        method: 'GET'
      })

      const response = await GET(request, { params })

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          banner_html: expect.stringContaining('We value your privacy'), // Default template
          banner_css: expect.stringContaining('.vp-banner')
        }),
        200,
        expect.any(Object),
        '*',
        request
      )
    })
  })

  describe('POST /api/widget/[site_id]', () => {
    it('should return method not allowed', async () => {
      const response = await POST()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET'])
    })
  })

  describe('PUT /api/widget/[site_id]', () => {
    it('should return method not allowed', async () => {
      const response = await PUT()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET'])
    })
  })

  describe('DELETE /api/widget/[site_id]', () => {
    it('should return method not allowed', async () => {
      const response = await DELETE()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET'])
    })
  })
})