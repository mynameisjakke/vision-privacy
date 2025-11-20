import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/admin/auth/route'

// Mock dependencies
jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(),
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status
  }))
}))

describe('/api/admin/auth', () => {
  const mockAuthMiddleware = require('@/lib/auth-middleware').withAuthMiddleware
  const mockCreateAuthenticatedResponse = require('@/lib/auth-middleware').createAuthenticatedResponse

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCreateAuthenticatedResponse.mockImplementation((data: any, status: number) => ({
      json: () => Promise.resolve(data),
      status,
      headers: new Map()
    }))
  })

  describe('GET /api/admin/auth', () => {
    it('should return admin authentication success for valid admin token', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        context: { 
          requestId: 'test-request-id',
          user: 'admin-user-123'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-admin-token-123'
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

      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          authenticated: true,
          user: 'admin-user-123',
          permissions: ['admin'],
          message: 'Admin authentication successful'
        },
        200,
        expect.objectContaining({
          requestId: 'test-request-id',
          user: 'admin-user-123'
        }),
        '*',
        request
      )
    })

    it('should return auth failure for invalid admin token', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        response: {
          json: () => Promise.resolve({ 
            error: 'Unauthorized',
            message: 'Invalid admin token',
            code: 1002
          }),
          status: 401
        }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-admin-token'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return auth failure when no token provided', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        response: {
          json: () => Promise.resolve({ 
            error: 'Unauthorized',
            message: 'Admin token is required',
            code: 1002
          }),
          status: 401
        }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'GET'
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return rate limit error when rate limited', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        response: {
          json: () => Promise.resolve({ 
            error: 'Rate Limit Exceeded',
            message: 'Too many admin authentication requests',
            code: 1003
          }),
          status: 429
        }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-admin-token-123'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(429)
    })

    it('should handle auth middleware with different user contexts', async () => {
      const testCases = [
        {
          user: 'admin-alice',
          expectedUser: 'admin-alice'
        },
        {
          user: 'admin-bob',
          expectedUser: 'admin-bob'
        },
        {
          user: null,
          expectedUser: null
        }
      ]

      for (const testCase of testCases) {
        mockAuthMiddleware.mockResolvedValue({
          success: true,
          context: { 
            requestId: 'test-request-id',
            user: testCase.user
          }
        })

        const request = new NextRequest('http://localhost:3000/api/admin/auth', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-admin-token-123'
          }
        })

        const response = await GET(request)

        expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            user: testCase.expectedUser
          }),
          200,
          expect.any(Object),
          '*',
          request
        )
      }
    })
  })

  describe('POST /api/admin/auth', () => {
    it('should return method not allowed', async () => {
      const response = await POST()
      
      expect(response.status).toBe(405)
      
      const responseData = await response.json()
      expect(responseData).toEqual({
        error: 'Method not allowed',
        message: 'Use GET to check admin authentication status',
        code: 1006
      })

      expect(response.headers.get('Allow')).toBe('GET')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('PUT /api/admin/auth', () => {
    it('should return method not allowed', async () => {
      const response = await PUT()
      
      expect(response.status).toBe(405)
      
      const responseData = await response.json()
      expect(responseData).toEqual({
        error: 'Method not allowed',
        message: 'Use GET to check admin authentication status',
        code: 1006
      })

      expect(response.headers.get('Allow')).toBe('GET')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('DELETE /api/admin/auth', () => {
    it('should return method not allowed', async () => {
      const response = await DELETE()
      
      expect(response.status).toBe(405)
      
      const responseData = await response.json()
      expect(responseData).toEqual({
        error: 'Method not allowed',
        message: 'Use GET to check admin authentication status',
        code: 1006
      })

      expect(response.headers.get('Allow')).toBe('GET')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })
})