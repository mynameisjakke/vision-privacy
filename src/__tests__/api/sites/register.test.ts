import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/sites/register/route'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  },
  TABLES: {
    SITES: 'sites'
  },
  handleSupabaseError: jest.fn((error) => ({ error: error.message }))
}))

jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(),
  InputSanitizer: {
    sanitizeJson: jest.fn((data) => data),
    sanitizeUrl: jest.fn((url) => url),
    sanitizeString: jest.fn((str) => str)
  },
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status
  }))
}))

jest.mock('@/utils/crypto', () => ({
  generateApiToken: jest.fn(() => 'test-api-token-12345678901234567890123456789012'),
  generateSiteId: jest.fn(() => 'test-site-id-1234-5678-9012-123456789012'),
  isValidDomain: jest.fn(() => true)
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn(),
  siteRegistrationSchema: {}
}))

describe('/api/sites/register', () => {
  const mockAuthMiddleware = require('@/lib/auth-middleware').withAuthMiddleware
  const mockSupabaseAdmin = require('@/lib/supabase').supabaseAdmin
  const mockValidateRequest = require('@/lib/validation').validateRequest
  const mockCreateAuthenticatedResponse = require('@/lib/auth-middleware').createAuthenticatedResponse

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth middleware response
    mockAuthMiddleware.mockResolvedValue({
      success: true,
      context: { requestId: 'test-request-id' }
    })

    // Default successful response creation
    mockCreateAuthenticatedResponse.mockImplementation((data, status) => ({
      json: () => Promise.resolve(data),
      status,
      headers: new Map()
    }))
  })

  describe('POST /api/sites/register', () => {
    const validRegistrationData = {
      domain: 'https://example.com',
      wp_version: '6.3.0',
      installed_plugins: ['plugin1', 'plugin2'],
      detected_forms: [
        { type: 'contact-form-7', count: 2, plugin_name: 'Contact Form 7' }
      ],
      plugin_version: '1.0.0'
    }

    it('should successfully register a new site', async () => {
      // Mock validation success
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock successful database insertion
      const mockSiteData = {
        id: 'test-site-id-1234-5678-9012-123456789012',
        ...validRegistrationData,
        api_token: 'test-api-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: mockSiteData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      
      expect(mockAuthMiddleware).toHaveBeenCalledWith(request, {
        requireAuth: false,
        rateLimitType: 'registration',
        allowedMethods: ['POST'],
        corsOrigins: '*'
      })

      expect(mockValidateRequest).toHaveBeenCalled()
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('sites')
      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          site_id: 'test-site-id-1234-5678-9012-123456789012',
          api_token: 'test-api-token-12345678901234567890123456789012',
          widget_url: `${process.env.NEXT_PUBLIC_API_URL}/api/widget/script`,
          success: true
        },
        201,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return validation error for invalid data', async () => {
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Domain is required'
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          message: 'Domain is required',
          code: 1004
        },
        400,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return error for invalid domain format', async () => {
      const invalidDomainData = {
        ...validRegistrationData,
        domain: 'invalid-domain'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: invalidDomainData
      })

      // Mock isValidDomain to return false
      const mockIsValidDomain = require('@/utils/crypto').isValidDomain
      mockIsValidDomain.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(invalidDomainData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Invalid domain format',
          message: 'The provided domain is not valid',
          code: 1004
        },
        400,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should handle database errors', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock database error
      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Database error',
          message: 'Database connection failed',
          code: 1005
        },
        500,
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

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: 'invalid-json'
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Registration failed',
          message: 'Site registration failed due to an internal error',
          code: 1005
        },
        500,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should update existing site when site_id is provided', async () => {
      const existingSiteId = 'site_existing123'
      const existingToken = 'token_existing456'
      const updateData = {
        ...validRegistrationData,
        site_id: existingSiteId
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock existing site lookup
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: existingSiteId, api_token: existingToken },
                error: null
              })
            })
          })
        })
      })

      // Mock update operation
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: existingSiteId, ...validRegistrationData },
                error: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${existingToken}`
        },
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          site_id: existingSiteId,
          api_token: existingToken,
          widget_url: `${process.env.NEXT_PUBLIC_API_URL}/api/widget/script`,
          success: true,
          updated: true
        },
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return existing site if domain already registered', async () => {
      const existingSiteId = 'site_existing789'
      const existingToken = 'token_existing012'

      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock domain check - site exists
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: existingSiteId, api_token: existingToken },
                error: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          site_id: existingSiteId,
          api_token: existingToken,
          widget_url: `${process.env.NEXT_PUBLIC_API_URL}/api/widget/script`,
          success: true,
          existing: true
        },
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should reject update with invalid token', async () => {
      const existingSiteId = 'site_existing123'
      const existingToken = 'token_existing456'
      const wrongToken = 'token_wrong789'
      const updateData = {
        ...validRegistrationData,
        site_id: existingSiteId
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock existing site lookup
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: existingSiteId, api_token: existingToken },
                error: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${wrongToken}`
        },
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          error: 'Unauthorized',
          message: 'Invalid token for this site',
          code: 1003
        },
        401,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should create new site if provided site_id does not exist', async () => {
      const nonExistentSiteId = 'site_nonexistent'
      const updateData = {
        ...validRegistrationData,
        site_id: nonExistentSiteId
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      })

      // Mock site lookup - not found
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      })

      // Mock domain check - no existing domain
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      })

      // Mock new site creation
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'site_new123', ...validRegistrationData },
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          created: true
        }),
        201,
        expect.any(Object),
        '*',
        request
      )
    })
  })

  describe('GET /api/sites/register', () => {
    it('should return method not allowed', async () => {
      const response = await GET()
      
      expect(response.status).toBe(405)
    })
  })

  describe('PUT /api/sites/register', () => {
    it('should return method not allowed', async () => {
      const response = await PUT()
      
      expect(response.status).toBe(405)
    })
  })

  describe('DELETE /api/sites/register', () => {
    it('should return method not allowed', async () => {
      const response = await DELETE()
      
      expect(response.status).toBe(405)
    })
  })
})