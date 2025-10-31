/**
 * Simple Integration Tests
 * Basic integration tests that verify core functionality works end-to-end
 */

import { NextRequest } from 'next/server'

// Simple mock setup for basic integration testing
const mockDatabase = {
  sites: new Map(),
  consents: new Map(),
  scans: new Map()
}

// Mock the external dependencies with simpler implementations
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => ({
      insert: jest.fn((data: any) => ({
        select: jest.fn(() => ({
          single: jest.fn(() => {
            const id = `${table}-${Date.now()}`
            const record = { id, ...data }
            mockDatabase.sites.set(id, record)
            return Promise.resolve({ data: record, error: null })
          })
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            // Return a mock site for any lookup
            return Promise.resolve({
              data: { id: 'test-site', status: 'active', domain: 'https://test.com' },
              error: null
            })
          })
        }))
      }))
    }))
  },
  TABLES: {
    SITES: 'sites',
    CONSENT_RECORDS: 'consent_records',
    CLIENT_SCANS: 'client_scans'
  }
}))

jest.mock('@/lib/auth-middleware', () => ({
  withAuthMiddleware: jest.fn().mockResolvedValue({
    success: true,
    context: { requestId: 'test-request' }
  }),
  createAuthenticatedResponse: jest.fn((data: any, status: number) => {
    return {
      json: () => Promise.resolve(data),
      status,
      headers: new Map()
    }
  })
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn().mockReturnValue({
    success: true,
    data: {}
  })
}))

jest.mock('@/utils/crypto', () => ({
  generateApiToken: () => 'test-token-123',
  generateSiteId: () => 'test-site-123',
  isValidDomain: () => true,
  hashVisitorInfo: () => 'visitor-hash-123',
  generateConsentExpiration: () => new Date('2025-12-31')
}))

// Mock cache and performance modules to prevent setInterval issues
jest.mock('@/lib/cache', () => ({
  WidgetCache: {
    getConfig: jest.fn().mockResolvedValue(null),
    setConfig: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('@/lib/performance', () => ({
  withPerformanceMonitoring: jest.fn((name: string, fn: Function) => fn()),
  ResponseOptimizer: {
    addPerformanceHeaders: jest.fn((response: any) => response),
    addCDNHeaders: jest.fn((response: any) => response)
  }
}))

describe('Simple Integration Tests', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
    mockDatabase.sites.clear()
    mockDatabase.consents.clear()
    mockDatabase.scans.clear()
  })

  describe('Site Registration Integration', () => {
    it('should register a WordPress site successfully', async () => {
      // Import the route handler
      const { POST } = await import('@/app/api/sites/register/route')
      
      const siteData = {
        domain: 'https://integration-test.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'Test Plugin',
            version: '1.0.0',
            file: 'test-plugin/test-plugin.php',
            active: true
          }
        ],
        detected_forms: [],
        plugin_version: '1.0.0'
      }

      // Mock validation to return our test data
      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: true,
        data: siteData
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(siteData)
      })

      const response = await POST(request)
      expect(response).toBeDefined()
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.site_id).toBe('test-site-123')
      expect(data.api_token).toBe('test-token-123')
      expect(data.success).toBe(true)
    })

    it('should handle registration validation errors', async () => {
      const { POST } = await import('@/app/api/sites/register/route')
      
      // Mock validation to fail
      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Invalid domain'
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Validation failed')
      expect(data.message).toBe('Invalid domain')
    })
  })

  describe('Consent Management Integration', () => {
    it('should save visitor consent successfully', async () => {
      const { POST } = await import('@/app/api/consent/route')
      
      const consentData = {
        site_id: 'test-site-123',
        visitor_hash: 'visitor-123',
        consent_categories: ['essential', 'analytics'],
        timestamp: '2024-01-01T12:00:00.000Z',
        user_agent: 'Test Browser'
      }

      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: true,
        data: consentData
      })

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser'
        },
        body: JSON.stringify(consentData)
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.consent_id).toBeDefined()
      expect(data.created).toBe(true)
    })

    it('should retrieve existing consent', async () => {
      const { GET } = await import('@/app/api/consent/route')
      
      // Mock existing consent in database lookup
      const mockSupabase = require('@/lib/supabase').supabaseAdmin
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ 
          data: { id: 'test-site', status: 'active' }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: {
            id: 'consent-123',
            consent_categories: ['essential'],
            expires_at: '2025-12-31T23:59:59.999Z'
          }, 
          error: null 
        })

      const request = new NextRequest(
        'http://localhost:3000/api/consent?site_id=test-site-123',
        {
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Test Browser'
          }
        }
      )

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Widget Configuration Integration', () => {
    it('should return widget configuration', async () => {
      const { GET } = await import('@/app/api/widget/[site_id]/route')
      
      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: 'test-site-123' }
      })

      // Mock database responses for site, categories, and template
      const mockSupabase = require('@/lib/supabase').supabaseAdmin
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ 
          data: { id: 'test-site-123', domain: 'https://test.com', status: 'active' }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: [
            { id: 'essential', name: 'Essential', is_essential: true },
            { id: 'analytics', name: 'Analytics', is_essential: false }
          ], 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: {
            content: '<div>Cookie banner for {{SITE_DOMAIN}}</div>',
            template_type: 'banner'
          }, 
          error: null 
        })

      const request = new NextRequest('http://localhost:3000/api/widget/test-site-123', {
        method: 'GET'
      })

      const response = await GET(request, { params: { site_id: 'test-site-123' } })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.banner_html).toContain('test.com')
      expect(data.cookie_categories).toHaveLength(2)
    })
  })

  describe('Client Scanning Integration', () => {
    it('should process scan data successfully', async () => {
      const { POST } = await import('@/app/api/scan/route')
      
      const scanData = {
        site_id: 'test-site-123',
        detected_scripts: [
          {
            src: 'https://www.google-analytics.com/analytics.js',
            domain: 'google-analytics.com',
            type: 'analytics'
          }
        ],
        detected_cookies: [
          {
            name: '_ga',
            domain: 'test.com',
            category: 'analytics'
          }
        ],
        scan_timestamp: '2024-01-01T12:00:00.000Z'
      }

      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: true,
        data: scanData
      })

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify(scanData)
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.scan_id).toBeDefined()
      expect(data.processed).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      const { POST } = await import('@/app/api/sites/register/route')
      
      // Mock database to throw error
      const mockSupabase = require('@/lib/supabase').supabaseAdmin
      mockSupabase.from().insert().select().single.mockRejectedValue(
        new Error('Database connection failed')
      )

      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: true,
        data: {
          domain: 'https://error-test.com',
          wp_version: '6.3.0',
          installed_plugins: [],
          detected_forms: [],
          plugin_version: '1.0.0'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify({
          domain: 'https://error-test.com',
          wp_version: '6.3.0'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Registration failed')
    })

    it('should handle invalid requests', async () => {
      const { POST } = await import('@/app/api/consent/route')
      
      const mockValidateRequest = require('@/lib/validation').validateRequest
      mockValidateRequest.mockReturnValue({
        success: false,
        error: 'Missing required fields'
      })

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Validation failed')
    })
  })
})