import { GET } from '@/app/api/sites/verify/[siteId]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  TABLES: {
    SITES: 'sites',
  },
  handleSupabaseError: jest.fn((error) => ({ error: error.message })),
}))

// Mock auth middleware
jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(async (request, options) => ({
    success: true,
    context: { requestId: 'test-request-id' },
  })),
  createAuthenticatedResponse: jest.fn((data, status, context, cors, request) => {
    return {
      json: async () => data,
      status,
      headers: new Headers()
    }
  }),
}))

describe('GET /api/sites/verify/[siteId]', () => {
  const mockSiteId = 'site_test123'
  const mockToken = 'token_test456'
  const mockDomain = 'https://example.com'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 200 for valid site and token', async () => {
    const mockSite = {
      id: mockSiteId,
      domain: mockDomain,
      widget_url: 'https://example.com/widget.js',
      status: 'active',
      api_token: mockToken,
      updated_at: '2025-11-13T10:00:00Z',
    }

    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSite,
              error: null,
            }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/sites/verify/site_test123', {
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    })

    const response = await GET(request, { params: { siteId: mockSiteId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.site_id).toBe(mockSiteId)
    expect(data.domain).toBe(mockDomain)
  })

  it('should return 401 for missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/sites/verify/site_test123')

    const response = await GET(request, { params: { siteId: mockSiteId } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('should return 404 for non-existent site', async () => {
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Site not found' },
            }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/sites/verify/site_invalid', {
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    })

    const response = await GET(request, { params: { siteId: 'site_invalid' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('SITE_NOT_FOUND')
  })

  it('should return 401 for invalid token', async () => {
    const mockSite = {
      id: mockSiteId,
      domain: mockDomain,
      widget_url: 'https://example.com/widget.js',
      status: 'active',
      api_token: 'different_token',
      updated_at: '2025-11-13T10:00:00Z',
    }

    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSite,
              error: null,
            }),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/sites/verify/site_test123', {
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    })

    const response = await GET(request, { params: { siteId: mockSiteId } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('should return 500 for database errors', async () => {
    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/sites/verify/site_test123', {
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    })

    const response = await GET(request, { params: { siteId: mockSiteId } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('SERVER_ERROR')
  })
})
