import { NextRequest } from 'next/server'
import { POST, GET, DELETE, PUT } from '@/app/api/consent/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
  SitesDB: {
    getById: jest.fn()
  },
  ConsentRecordsDB: {
    getByVisitorHash: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteByVisitorHash: jest.fn()
  }
}))

jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn(),
  InputSanitizer: {
    sanitizeJson: jest.fn((data) => data)
  },
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status
  }))
}))

jest.mock('@/utils/crypto', () => ({
  hashVisitorInfo: jest.fn(() => 'hashed-visitor-info-1234567890abcdef1234567890abcdef12345678'),
  hashUserAgent: jest.fn(() => 'hashed-user-agent-1234567890abcdef1234567890abcdef12345678'),
  generateConsentExpiration: jest.fn(() => new Date('2025-12-31T23:59:59.999Z'))
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn(),
  consentRequestSchema: {}
}))

jest.mock('@/utils/response', () => ({
  createSuccessResponse: jest.fn((data) => ({
    json: () => Promise.resolve(data),
    status: 200
  })),
  createNotFoundResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Not Found', message }),
    status: 404
  })),
  createValidationErrorResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Validation Error', message }),
    status: 400
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

describe('/api/consent', () => {
  const mockAuthMiddleware = require('@/lib/auth-middleware').withAuthMiddleware
  const mockSitesDB = require('@/lib/database').SitesDB
  const mockConsentRecordsDB = require('@/lib/database').ConsentRecordsDB
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
    mockCreateAuthenticatedResponse.mockImplementation((data: any, status: number) => ({
      json: () => Promise.resolve(data),
      status,
      headers: new Map()
    }))
  })

  describe('POST /api/consent', () => {
    const validConsentData = {
      site_id: '12345678-1234-1234-1234-123456789012',
      visitor_hash: 'visitor-hash-123',
      consent_categories: ['essential', 'analytics'],
      timestamp: '2024-01-01T12:00:00.000Z',
      user_agent: 'Mozilla/5.0 (Test Browser)'
    }

    const mockSite = {
      id: '12345678-1234-1234-1234-123456789012',
      domain: 'https://example.com',
      status: 'active'
    }

    it('should create new consent record successfully', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validConsentData
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)
      mockConsentRecordsDB.getByVisitorHash.mockResolvedValue(null) // No existing consent

      const newConsentRecord = {
        id: 'consent-id-123',
        ...validConsentData,
        visitor_hash: 'hashed-visitor-info-1234567890abcdef1234567890abcdef12345678',
        expires_at: '2025-12-31T23:59:59.999Z'
      }

      mockConsentRecordsDB.create.mockResolvedValue(newConsentRecord)

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        },
        body: JSON.stringify(validConsentData)
      })

      const response = await POST(request)

      expect(mockSitesDB.getById).toHaveBeenCalledWith(validConsentData.site_id)
      expect(mockConsentRecordsDB.create).toHaveBeenCalled()
      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          consent_id: 'consent-id-123',
          expires_at: '2025-12-31T23:59:59.999Z',
          created: true
        },
        201,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should update existing consent record', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validConsentData
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)

      const existingConsent = {
        id: 'existing-consent-id',
        site_id: validConsentData.site_id,
        visitor_hash: 'hashed-visitor-info-1234567890abcdef1234567890abcdef12345678'
      }

      mockConsentRecordsDB.getByVisitorHash.mockResolvedValue(existingConsent)

      const updatedConsentRecord = {
        ...existingConsent,
        consent_categories: validConsentData.consent_categories,
        expires_at: '2025-12-31T23:59:59.999Z'
      }

      mockConsentRecordsDB.update.mockResolvedValue(updatedConsentRecord)

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        },
        body: JSON.stringify(validConsentData)
      })

      const response = await POST(request)

      expect(mockConsentRecordsDB.update).toHaveBeenCalledWith(
        existingConsent.id,
        expect.objectContaining({
          consent_categories: validConsentData.consent_categories
        })
      )
      expect(mockCreateAuthenticatedResponse).toHaveBeenCalledWith(
        {
          consent_id: 'existing-consent-id',
          expires_at: '2025-12-31T23:59:59.999Z',
          updated: true
        },
        200,
        expect.any(Object),
        '*',
        request
      )
    })

    it('should return validation error for invalid data', async () => {
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Invalid site ID format'
      })

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await POST(request)

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

    it('should return error for non-existent site', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validConsentData
      })

      mockSitesDB.getById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        body: JSON.stringify(validConsentData)
      })

      const response = await POST(request)

      expect(require('@/utils/response').createNotFoundResponse).toHaveBeenCalledWith('Site not found')
    })

    it('should return error for inactive site', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validConsentData
      })

      const inactiveSite = { ...mockSite, status: 'inactive' }
      mockSitesDB.getById.mockResolvedValue(inactiveSite)

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        body: JSON.stringify(validConsentData)
      })

      const response = await POST(request)

      expect(require('@/utils/response').createValidationErrorResponse).toHaveBeenCalledWith('Site is not active')
    })
  })

  describe('GET /api/consent', () => {
    const mockSite = {
      id: '12345678-1234-1234-1234-123456789012',
      domain: 'https://example.com',
      status: 'active'
    }

    it('should return existing valid consent', async () => {
      const url = 'http://localhost:3000/api/consent?site_id=12345678-1234-1234-1234-123456789012'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)

      const validConsent = {
        id: 'consent-id-123',
        site_id: mockSite.id,
        consent_categories: ['essential', 'analytics'],
        consent_timestamp: '2024-01-01T12:00:00.000Z',
        expires_at: '2025-12-31T23:59:59.999Z'
      }

      mockConsentRecordsDB.getByVisitorHash.mockResolvedValue(validConsent)

      const response = await GET(request)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        has_consent: true,
        consent_required: false,
        consent_categories: validConsent.consent_categories,
        consent_timestamp: validConsent.consent_timestamp,
        expires_at: validConsent.expires_at
      })
    })

    it('should return consent required when no consent exists', async () => {
      const url = 'http://localhost:3000/api/consent?site_id=12345678-1234-1234-1234-123456789012'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)
      mockConsentRecordsDB.getByVisitorHash.mockResolvedValue(null)

      const response = await GET(request)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        has_consent: false,
        consent_required: true
      })
    })

    it('should return consent required when consent is expired', async () => {
      const url = 'http://localhost:3000/api/consent?site_id=12345678-1234-1234-1234-123456789012'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)

      const expiredConsent = {
        id: 'consent-id-123',
        site_id: mockSite.id,
        consent_categories: ['essential'],
        expires_at: '2023-01-01T00:00:00.000Z' // Expired
      }

      mockConsentRecordsDB.getByVisitorHash.mockResolvedValue(expiredConsent)

      const response = await GET(request)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        has_consent: false,
        consent_required: true,
        expired: true
      })
    })

    it('should return validation error when site_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'GET'
      })

      const response = await GET(request)

      expect(require('@/utils/response').createValidationErrorResponse).toHaveBeenCalledWith('site_id parameter is required')
    })
  })

  describe('DELETE /api/consent', () => {
    const mockSite = {
      id: '12345678-1234-1234-1234-123456789012',
      domain: 'https://example.com',
      status: 'active'
    }

    it('should successfully delete consent record', async () => {
      const url = 'http://localhost:3000/api/consent?site_id=12345678-1234-1234-1234-123456789012'
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)
      mockConsentRecordsDB.deleteByVisitorHash.mockResolvedValue(true)

      const response = await DELETE(request)

      expect(mockConsentRecordsDB.deleteByVisitorHash).toHaveBeenCalledWith(
        mockSite.id,
        'hashed-visitor-info-1234567890abcdef1234567890abcdef12345678'
      )
      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        deleted: true,
        message: 'Consent record deleted successfully'
      })
    })

    it('should return not found when no consent record exists', async () => {
      const url = 'http://localhost:3000/api/consent?site_id=12345678-1234-1234-1234-123456789012'
      const request = new NextRequest(url, {
        method: 'DELETE',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)
      mockConsentRecordsDB.deleteByVisitorHash.mockResolvedValue(false)

      const response = await DELETE(request)

      expect(require('@/utils/response').createNotFoundResponse).toHaveBeenCalledWith('No consent record found for this visitor')
    })
  })

  describe('PUT /api/consent', () => {
    it('should return method not allowed', async () => {
      const response = await PUT()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET', 'POST', 'DELETE'])
    })
  })
})