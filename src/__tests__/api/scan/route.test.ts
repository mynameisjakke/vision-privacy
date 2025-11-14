import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/scan/route'

// Mock dependencies
jest.mock('@/utils/auth', () => ({
  extractApiToken: jest.fn(),
  validateApiToken: jest.fn()
}))

jest.mock('@/lib/database', () => ({
  SitesDB: {
    getById: jest.fn()
  },
  ClientScansDB: {
    create: jest.fn(),
    markProcessed: jest.fn(),
    list: jest.fn()
  }
}))

jest.mock('@/lib/scan-processor', () => ({
  processClientScan: jest.fn()
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn(),
  clientScanSchema: {}
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
  createNotFoundResponse: jest.fn((message) => ({
    json: () => Promise.resolve({ error: 'Not Found', message }),
    status: 404
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

describe('/api/scan', () => {
  const mockExtractApiToken = require('@/utils/auth').extractApiToken
  const mockValidateApiToken = require('@/utils/auth').validateApiToken
  const mockSitesDB = require('@/lib/database').SitesDB
  const mockClientScansDB = require('@/lib/database').ClientScansDB
  const mockProcessClientScan = require('@/lib/scan-processor').processClientScan
  const mockValidateRequest = require('@/lib/validation').validateRequest

  const mockSite = {
    id: '12345678-1234-1234-1234-123456789012',
    domain: 'https://example.com',
    api_token: 'valid-api-token-12345678901234567890123456789012',
    status: 'active'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/scan', () => {
    const validScanData = {
      site_id: '12345678-1234-1234-1234-123456789012',
      detected_scripts: [
        {
          src: 'https://www.google-analytics.com/analytics.js',
          type: 'analytics' as const,
          domain: 'google-analytics.com'
        }
      ],
      detected_cookies: [
        {
          name: '_ga',
          domain: '.example.com',
          category: 'analytics',
          description: 'Google Analytics cookie'
        }
      ],
      scan_timestamp: '2024-01-01T12:00:00.000Z'
    }

    it('should successfully process client scan without authentication', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validScanData
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)

      const scanRecord = {
        id: 'scan-id-123',
        ...validScanData,
        processed: false
      }

      mockClientScansDB.create.mockResolvedValue(scanRecord)

      const processingResult = {
        newServicesCount: 1,
        policyUpdated: true,
        notificationsSent: 1,
        summary: 'Detected 1 new analytics service'
      }

      mockProcessClientScan.mockResolvedValue(processingResult)
      mockClientScansDB.markProcessed.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify(validScanData)
      })

      const response = await POST(request)

      expect(mockSitesDB.getById).toHaveBeenCalledWith(validScanData.site_id)
      expect(mockClientScansDB.create).toHaveBeenCalledWith({
        site_id: validScanData.site_id,
        detected_scripts: validScanData.detected_scripts,
        detected_cookies: validScanData.detected_cookies,
        scan_timestamp: '2024-01-01T12:00:00.000Z',
        processed: false
      })
      expect(mockProcessClientScan).toHaveBeenCalledWith(scanRecord)
      expect(mockClientScansDB.markProcessed).toHaveBeenCalledWith('scan-id-123')

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        scan_id: 'scan-id-123',
        processed: true,
        new_services_detected: 1,
        policy_updated: true,
        notifications_sent: 1,
        processing_summary: 'Detected 1 new analytics service'
      }, 201)
    })

    it('should handle scan processing failure gracefully', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validScanData
      })

      mockSitesDB.getById.mockResolvedValue(mockSite)

      const scanRecord = {
        id: 'scan-id-123',
        ...validScanData,
        processed: false
      }

      mockClientScansDB.create.mockResolvedValue(scanRecord)
      mockProcessClientScan.mockRejectedValue(new Error('Processing failed'))

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify(validScanData)
      })

      const response = await POST(request)

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        scan_id: 'scan-id-123',
        processed: false,
        error: 'Scan recorded but processing failed',
        retry_scheduled: true
      }, 201)
    })

    it('should return not found error when site does not exist', async () => {
      mockValidateRequest.mockReturnValue({
        success: true,
        data: validScanData
      })

      mockSitesDB.getById.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify(validScanData)
      })

      const response = await POST(request)

      expect(mockSitesDB.getById).toHaveBeenCalledWith(validScanData.site_id)
      expect(require('@/utils/response').createNotFoundResponse).toHaveBeenCalledWith('Site not found')
    })

    it('should return validation error for invalid data', async () => {
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Invalid scan data format'
      })

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await POST(request)

      expect(require('@/utils/response').createValidationErrorResponse).toHaveBeenCalledWith('Invalid scan data format')
    })
  })

  describe('GET /api/scan', () => {
    it('should return scan history for authenticated site', async () => {
      mockExtractApiToken.mockReturnValue('valid-api-token-12345678901234567890123456789012')
      mockValidateApiToken.mockResolvedValue({
        valid: true,
        site: mockSite
      })

      const mockScans = {
        data: [
          {
            id: 'scan-1',
            site_id: mockSite.id,
            scan_timestamp: '2024-01-01T12:00:00.000Z',
            processed: true
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          total_pages: 1
        }
      }

      mockClientScansDB.list.mockResolvedValue(mockScans)

      const url = 'http://localhost:3000/api/scan?limit=10&processed=true'
      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-api-token-12345678901234567890123456789012'
        }
      })

      const response = await GET(request)

      expect(mockClientScansDB.list).toHaveBeenCalledWith(
        { site_id: mockSite.id, processed: true },
        { limit: 10, sort_by: 'scan_timestamp', sort_order: 'desc' }
      )

      expect(require('@/utils/response').createSuccessResponse).toHaveBeenCalledWith({
        scans: mockScans.data,
        pagination: mockScans.pagination,
        site_id: mockSite.id
      })
    })

    it('should return auth error when no token provided', async () => {
      mockExtractApiToken.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET'
      })

      const response = await GET(request)

      expect(require('@/utils/response').createAuthErrorResponse).toHaveBeenCalledWith('API token is required')
    })
  })

  describe('PUT /api/scan', () => {
    it('should return method not allowed', async () => {
      const response = await PUT()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET', 'POST'])
    })
  })

  describe('DELETE /api/scan', () => {
    it('should return method not allowed', async () => {
      const response = await DELETE()
      
      expect(require('@/utils/response').createMethodNotAllowedResponse).toHaveBeenCalledWith(['GET', 'POST'])
    })
  })
})