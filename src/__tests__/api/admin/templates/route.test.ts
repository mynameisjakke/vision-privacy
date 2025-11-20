import { NextRequest } from 'next/server'
import { GET, PUT, POST, DELETE } from '@/app/api/admin/templates/route'

// Mock dependencies
jest.mock('@/utils/auth', () => ({
  validateAdminToken: jest.fn()
}))

jest.mock('@/lib/database', () => ({
  PolicyTemplatesDB: {
    list: jest.fn(),
    create: jest.fn(),
    deactivateByType: jest.fn(),
    getAllActiveSites: jest.fn()
  },
  CookieCategoriesDB: {
    listActive: jest.fn(),
    deactivateAll: jest.fn(),
    create: jest.fn()
  },
  SitePoliciesDB: {
    updateTemplateVersion: jest.fn()
  }
}))

jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(),
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status
  }))
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn(),
  templateUpdateSchema: {},
  paginationSchema: {}
}))

jest.mock('@/utils/response', () => ({
  createSuccessResponse: jest.fn((data, status = 200) => ({
    json: () => Promise.resolve(data),
    status
  })),
  createValidationErrorResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Validation Error', message }),
    status: 400
  })),
  createAuthErrorResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Authentication Error', message }),
    status: 401
  })),
  createDatabaseErrorResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Database Error', message }),
    status: 500
  })),
  createMethodNotAllowedResponse: jest.fn((methods) => ({
    json: () => Promise.resolve({ error: 'Method Not Allowed', allowed_methods: methods }),
    status: 405
  }))
}))

describe('/api/admin/templates', () => {
  const mockAuthMiddleware = require('@/lib/auth-middleware').withAuthMiddleware
  const mockValidateAdminToken = require('@/utils/auth').validateAdminToken
  const mockPolicyTemplatesDB = require('@/lib/database').PolicyTemplatesDB
  const mockCookieCategoriesDB = require('@/lib/database').CookieCategoriesDB
  const mockSitePoliciesDB = require('@/lib/database').SitePoliciesDB
  const mockValidateRequest = require('@/lib/validation').validateRequest
  const mockCreateAuthenticatedResponse = require('@/lib/auth-middleware').createAuthenticatedResponse

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth middleware response
    mockAuthMiddleware.mockResolvedValue({
      success: true,
      context: { requestId: 'test-request-id', user: 'admin-user' }
    })

    mockCreateAuthenticatedResponse.mockImplementation((data: any, status: number) => ({
      json: () => Promise.resolve(data),
      status,
      headers: new Map()
    }))
  })

  describe('GET /api/admin/templates', () => {
    const mockTemplates = [
      {
        id: 'template-1',
        template_type: 'banner',
        content: '<div>Banner template</div>',
        version: '1.0.0',
        is_active: true
      },
      {
        id: 'template-2',
        template_type: 'policy',
        content: 'Privacy policy template',
        version: '1.0.0',
        is_active: true
      }
    ]

    const mockCookieCategories = [
      {
        id: 'essential',
        name: 'Essential',
        description: 'Required cookies',
        is_essential: true,
        sort_order: 0
      }
    ]

    it('should return templates and cookie categories for admin user', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: {
          page: 1,
          limit: 20,
          sort_by: 'created_at',
          sort_order: 'desc'
        }
      })

      mockPolicyTemplatesDB.list.mockResolvedValue(mockTemplates)
      mockCookieCategoriesDB.listActive.mockResolvedValue(mockCookieCategories)

      const url = 'http://localhost:3000/api/admin/templates?page=1&limit=20'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        }
      })

      const response = await GET(request)

      expect(mockAuthMiddleware).toHaveBeenCalledWith(request, {
        requireAuth: true,
        requireAdmin: true,
        rateLimitType: 'admin',
        allowedMethods: ['GET'],
        corsOrigins: '*'
      })

      expect(mockPolicyTemplatesDB.list).toHaveBeenCalled()
      expect(mockCookieCategoriesDB.listActive).toHaveBeenCalled()

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          templates: mockTemplates,
          cookie_categories: mockCookieCategories,
          filters: {
            type: null,
            active_only: false
          }
        },
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should handle auth middleware failure', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        response: {
          json: () => Promise.resolve({ error: 'Unauthorized' }),
          status: 401
        }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'GET'
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle database errors', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { page: 1, limit: 20, sort_by: 'created_at', sort_order: 'desc' }
      })

      mockPolicyTemplatesDB.list.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        }
      })

      const response = await GET(request)

      expect(require('@/utils/response').createDatabaseErrorResponse).toHaveBeenCalledWith('Failed to retrieve templates')
    })

    it('should apply filters correctly', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { page: 1, limit: 20, sort_by: 'created_at', sort_order: 'desc' }
      })

      mockPolicyTemplatesDB.list.mockResolvedValue(mockTemplates)
      mockCookieCategoriesDB.listActive.mockResolvedValue(mockCookieCategories)

      const url = 'http://localhost:3000/api/admin/templates?type=banner&active=true'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        }
      })

      const response = await GET(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            type: 'banner',
            active_only: true
          }
        }),
        200,
        expect.any(Object),
        '*',
        request
      )
    })
  })

  describe('PUT /api/admin/templates', () => {
    const validUpdateData = {
      banner_template: '<div>Updated banner template</div>',
      policy_template: 'Updated privacy policy template',
      cookie_categories: [
        {
          name: 'Essential',
          description: 'Required cookies',
          is_essential: true,
          sort_order: 0
        }
      ],
      version: '2.0.0'
    }

    it('should successfully update templates', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      mockValidateRequest.mockReturnValue({
        success: true,
        data: validUpdateData
      })

      const newBannerTemplate = {
        id: 'banner-template-2',
        template_type: 'banner',
        content: validUpdateData.banner_template,
        version: '2.0.0',
        is_active: true
      }

      const newPolicyTemplate = {
        id: 'policy-template-2',
        template_type: 'policy',
        content: validUpdateData.policy_template,
        version: '2.0.0',
        is_active: true
      }

      mockPolicyTemplatesDB.create
        .mockResolvedValueOnce(newBannerTemplate)
        .mockResolvedValueOnce(newPolicyTemplate)

      mockPolicyTemplatesDB.getAllActiveSites.mockResolvedValue([
        { id: 'site-1' },
        { id: 'site-2' }
      ])

      mockSitePoliciesDB.updateTemplateVersion.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer admin-token-123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validUpdateData)
      })

      const response = await PUT(request)

      expect(mockValidateAdminToken).toHaveBeenCalledWith(request)
      expect(mockPolicyTemplatesDB.create).toHaveBeenCalledTimes(2)
      expect(mockCookieCategoriesDB.create).toHaveBeenCalledTimes(1)
      expect(mockSitePoliciesDB.updateTemplateVersion).toHaveBeenCalledTimes(2)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Templates updated successfully',
        results: expect.objectContaining({
          banner_updated: true,
          policy_updated: true,
          categories_updated: true,
          sites_updated: 2,
          version_created: '2.0.0'
        }),
        applied_at: expect.any(String)
      })
    })

    it('should return auth error for invalid admin token', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: false,
        error: 'Invalid admin token'
      })

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify(validUpdateData)
      })

      const response = await PUT(request)

      expect(require('@/utils/response').createAuthErrorResponse).toHaveBeenCalledWith('Admin authentication required')
    })

    it('should return validation error for invalid data', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Version is required'
      })

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        },
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await PUT(request)

      expect(require('@/utils/response').createValidationErrorResponse).toHaveBeenCalledWith('Version is required')
    })

    it('should handle partial updates (only banner template)', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      const partialUpdateData = {
        banner_template: '<div>Only banner update</div>',
        version: '2.1.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: partialUpdateData
      })

      mockPolicyTemplatesDB.create.mockResolvedValue({
        id: 'banner-template-3',
        template_type: 'banner',
        content: partialUpdateData.banner_template,
        version: '2.1.0',
        is_active: true
      })

      mockPolicyTemplatesDB.getAllActiveSites.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        },
        body: JSON.stringify(partialUpdateData)
      })

      const response = await PUT(request)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            banner_updated: true,
            policy_updated: false,
            categories_updated: false
          })
        })
      )
    })
  })

  describe('POST /api/admin/templates', () => {
    const validTemplateData = {
      template_type: 'banner',
      content: '<div>New template content</div>',
      version: '3.0.0'
    }

    it('should successfully create new template', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      const newTemplate = {
        id: 'new-template-1',
        ...validTemplateData,
        is_active: false,
        created_by: 'admin-user'
      }

      mockPolicyTemplatesDB.create.mockResolvedValue(newTemplate)

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        },
        body: JSON.stringify(validTemplateData)
      })

      const response = await POST(request)

      expect(mockPolicyTemplatesDB.create).toHaveBeenCalledWith({
        template_type: 'banner',
        content: '<div>New template content</div>',
        version: '3.0.0',
        is_active: false,
        created_by: 'admin-user'
      })

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        template: newTemplate,
        message: 'Template created successfully (inactive)'
      }, 201)
    })

    it('should return validation error for missing required fields', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        },
        body: JSON.stringify({ incomplete: 'data' })
      })

      const response = await POST(request)

      expect(require('@/utils/response').createValidationErrorResponse).toHaveBeenCalledWith('template_type, content, and version are required')
    })

    it('should handle database creation failure', async () => {
      mockValidateAdminToken.mockResolvedValue({
        valid: true,
        user: 'admin-user'
      })

      mockPolicyTemplatesDB.create.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/templates', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token-123'
        },
        body: JSON.stringify(validTemplateData)
      })

      const response = await POST(request)

      expect(require('@/utils/response').createDatabaseErrorResponse).toHaveBeenCalledWith('Failed to create template')
    })
  })

  describe('DELETE /api/admin/templates', () => {
    it('should return method not allowed', async () => {
      const response = await DELETE()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET', 'POST', 'PUT'])
    })
  })
})