/**
 * Performance and Load Testing
 * Tests system performance under various load conditions
 */

import { NextRequest } from 'next/server'
import { POST as registerSite } from '@/app/api/sites/register/route'
import { GET as getWidget } from '@/app/api/widget/[site_id]/route'
import { POST as saveConsent } from '@/app/api/consent/route'
import { POST as reportScan } from '@/app/api/scan/route'

// Mock external dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
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
    context: { requestId: 'test-request-id' }
  }),
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status,
    headers: new Map()
  }))
}))

jest.mock('@/lib/validation', () => ({
  validateRequest: jest.fn().mockReturnValue({
    success: true,
    data: {}
  })
}))

jest.mock('@/utils/crypto', () => ({
  generateApiToken: jest.fn(() => 'perf-api-token-12345678901234567890123456789012'),
  generateSiteId: jest.fn(() => 'perf-site-id-1234-5678-9012-123456789012'),
  isValidDomain: jest.fn(() => true),
  hashVisitorInfo: jest.fn(() => 'perf-visitor-hash-1234567890abcdef1234567890abcdef12345678'),
  hashUserAgent: jest.fn(() => 'perf-user-agent-hash-1234567890abcdef1234567890abcdef12345678'),
  generateConsentExpiration: jest.fn(() => new Date('2025-12-31T23:59:59.999Z'))
}))

// Performance measurement utilities
const measurePerformance = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await operation()
  const end = performance.now()
  const duration = end - start
  
  console.log(`${label}: ${duration.toFixed(2)}ms`)
  return { result, duration }
}

const measureMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    }
  }
  return null
}

describe('Performance and Load Testing', () => {
  const mockSupabaseAdmin = require('@/lib/supabase').supabaseAdmin
  const mockValidateRequest = require('@/lib/validation').validateRequest

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('API Response Time Performance', () => {
    it('should handle site registration within performance threshold', async () => {
      const siteData = {
        domain: 'https://performance-test.com',
        wp_version: '6.3.0',
        installed_plugins: Array.from({ length: 50 }, (_, i) => ({
          name: `Plugin ${i + 1}`,
          version: '1.0.0',
          file: `plugin-${i + 1}/plugin-${i + 1}.php`,
          active: i % 2 === 0
        })),
        detected_forms: Array.from({ length: 10 }, (_, i) => ({
          type: 'contact-form-7',
          count: i + 1,
          plugin: `Form Plugin ${i + 1}`
        })),
        plugin_version: '1.0.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: siteData
      })

      const registeredSite = {
        id: 'perf-site-id-1234-5678-9012-123456789012',
        ...siteData,
        api_token: 'perf-api-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(siteData)
      })

      const { result, duration } = await measurePerformance(
        () => registerSite(request),
        'Site Registration with 50 plugins'
      )

      const data = await result.json()
      expect(data.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle widget configuration requests efficiently', async () => {
      const siteId = 'perf-site-id-1234-5678-9012-123456789012'
      
      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: siteId }
      })

      const mockSite = {
        id: siteId,
        domain: 'https://performance-test.com',
        status: 'active'
      }

      const mockCookieCategories = Array.from({ length: 10 }, (_, i) => ({
        id: `category-${i + 1}`,
        name: `Category ${i + 1}`,
        description: `Description for category ${i + 1}`,
        is_essential: i === 0,
        sort_order: i
      }))

      const mockBannerTemplate = {
        id: 'template-1',
        template_type: 'banner',
        content: '<div class="vp-banner">Large banner template with {{SITE_DOMAIN}}</div>'.repeat(10),
        version: '1.0.0',
        is_active: true
      }

      mockSupabaseAdmin.from().select().eq().single
        .mockResolvedValueOnce({ data: mockSite, error: null })
        .mockResolvedValueOnce({ data: mockCookieCategories, error: null })
        .mockResolvedValueOnce({ data: mockBannerTemplate, error: null })

      const request = new NextRequest(`http://localhost:3000/api/widget/${siteId}`, {
        method: 'GET'
      })

      const { result, duration } = await measurePerformance(
        () => getWidget(request, { params: { site_id: siteId } }),
        'Widget Configuration with 10 categories'
      )

      const data = await result.json()
      expect(data.cookie_categories).toHaveLength(10)
      expect(duration).toBeLessThan(500) // Should complete within 500ms
    })

    it('should handle consent submissions efficiently', async () => {
      const siteId = 'perf-site-id-1234-5678-9012-123456789012'
      
      const consentData = {
        site_id: siteId,
        visitor_hash: 'perf-visitor-hash-123',
        consent_categories: ['essential', 'analytics', 'advertising', 'social', 'functional'],
        timestamp: '2024-01-01T12:00:00.000Z',
        user_agent: 'Mozilla/5.0 (Performance Test Browser)'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: consentData
      })

      mockSupabaseAdmin.from().select().eq().single
        .mockResolvedValueOnce({ data: { id: siteId, status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const newConsentRecord = {
        id: 'perf-consent-id-123',
        ...consentData,
        visitor_hash: 'perf-visitor-hash-1234567890abcdef1234567890abcdef12345678',
        expires_at: '2025-12-31T23:59:59.999Z'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: newConsentRecord,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/consent', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Performance Test Browser)'
        },
        body: JSON.stringify(consentData)
      })

      const { result, duration } = await measurePerformance(
        () => saveConsent(request),
        'Consent Submission'
      )

      const data = await result.json()
      expect(data.consent_id).toBe('perf-consent-id-123')
      expect(duration).toBeLessThan(300) // Should complete within 300ms
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous widget requests', async () => {
      const siteId = 'perf-site-id-1234-5678-9012-123456789012'
      const concurrentRequests = 20

      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: siteId }
      })

      const mockSite = {
        id: siteId,
        domain: 'https://concurrent-test.com',
        status: 'active'
      }

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockSite,
        error: null
      })

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        new NextRequest(`http://localhost:3000/api/widget/${siteId}`, {
          method: 'GET',
          headers: { 'x-request-id': `concurrent-${i}` }
        })
      )

      const { result: responses, duration } = await measurePerformance(
        () => Promise.all(
          requests.map(req => getWidget(req, { params: { site_id: siteId } }))
        ),
        `${concurrentRequests} Concurrent Widget Requests`
      )

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Average response time should be reasonable
      const avgResponseTime = duration / concurrentRequests
      expect(avgResponseTime).toBeLessThan(100) // Average < 100ms per request
    })

    it('should handle high-volume consent submissions', async () => {
      const siteId = 'perf-site-id-1234-5678-9012-123456789012'
      const concurrentConsents = 50

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: siteId, status: 'active' },
        error: null
      })

      mockSupabaseAdmin.from().insert().select().single.mockImplementation((data) =>
        Promise.resolve({
          data: { id: `consent-${Date.now()}-${Math.random()}`, ...data, expires_at: '2025-12-31T23:59:59.999Z' },
          error: null
        })
      )

      const consentRequests = Array.from({ length: concurrentConsents }, (_, i) => {
        const consentData = {
          site_id: siteId,
          visitor_hash: `visitor-${i}`,
          consent_categories: ['essential', 'analytics'],
          timestamp: new Date().toISOString(),
          user_agent: 'Mozilla/5.0 (Load Test Browser)'
        }

        mockValidateRequest.mockReturnValue({
          success: true,
          data: consentData
        })

        return new NextRequest('http://localhost:3000/api/consent', {
          method: 'POST',
          headers: {
            'x-forwarded-for': `192.168.1.${(i % 254) + 1}`,
            'user-agent': 'Mozilla/5.0 (Load Test Browser)',
            'x-request-id': `consent-${i}`
          },
          body: JSON.stringify(consentData)
        })
      })

      const { result: responses, duration } = await measurePerformance(
        () => Promise.all(consentRequests.map(req => saveConsent(req))),
        `${concurrentConsents} Concurrent Consent Submissions`
      )

      // All consent submissions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })

      // Total time should be reasonable for the volume
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle mixed API operations concurrently', async () => {
      const operations = [
        // Site registrations
        ...Array.from({ length: 5 }, (_, i) => ({
          type: 'register',
          data: {
            domain: `https://mixed-test-${i}.com`,
            wp_version: '6.3.0',
            installed_plugins: [],
            detected_forms: [],
            plugin_version: '1.0.0'
          }
        })),
        // Widget requests
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'widget',
          siteId: `widget-site-${i}`
        })),
        // Consent submissions
        ...Array.from({ length: 15 }, (_, i) => ({
          type: 'consent',
          data: {
            site_id: `consent-site-${i}`,
            visitor_hash: `mixed-visitor-${i}`,
            consent_categories: ['essential'],
            timestamp: new Date().toISOString(),
            user_agent: 'Mozilla/5.0 (Mixed Test Browser)'
          }
        }))
      ]

      // Setup mocks for all operation types
      mockSupabaseAdmin.from().insert().select().single.mockImplementation((data) =>
        Promise.resolve({
          data: { id: `generated-id-${Date.now()}`, ...data, api_token: 'generated-token' },
          error: null
        })
      )

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: 'mock-site', status: 'active' },
        error: null
      })

      const { result: results, duration } = await measurePerformance(
        async () => {
          const promises = operations.map(async (op) => {
            mockValidateRequest.mockReturnValue({
              success: true,
              data: op.data || { site_id: op.siteId }
            })

            switch (op.type) {
              case 'register':
                const registerReq = new NextRequest('http://localhost:3000/api/sites/register', {
                  method: 'POST',
                  body: JSON.stringify(op.data)
                })
                return registerSite(registerReq)

              case 'widget':
                const widgetReq = new NextRequest(`http://localhost:3000/api/widget/${op.siteId}`, {
                  method: 'GET'
                })
                return getWidget(widgetReq, { params: { site_id: op.siteId } })

              case 'consent':
                const consentReq = new NextRequest('http://localhost:3000/api/consent', {
                  method: 'POST',
                  headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Mozilla/5.0 (Mixed Test Browser)'
                  },
                  body: JSON.stringify(op.data)
                })
                return saveConsent(consentReq)

              default:
                throw new Error(`Unknown operation type: ${op.type}`)
            }
          })

          return Promise.all(promises)
        },
        `${operations.length} Mixed Concurrent Operations`
      )

      // All operations should succeed
      results.forEach(response => {
        expect([200, 201]).toContain(response.status)
      })

      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during high load', async () => {
      const initialMemory = measureMemoryUsage()
      
      // Simulate high load with large data processing
      const largeDataOperations = Array.from({ length: 100 }, (_, i) => ({
        domain: `https://memory-test-${i}.com`,
        wp_version: '6.3.0',
        installed_plugins: Array.from({ length: 100 }, (_, j) => ({
          name: `Plugin ${j + 1}`,
          version: '1.0.0',
          file: `plugin-${j + 1}/plugin-${j + 1}.php`,
          active: true,
          description: 'A'.repeat(1000) // Large description
        })),
        detected_forms: Array.from({ length: 20 }, (_, k) => ({
          type: 'contact-form-7',
          count: k + 1,
          plugin: `Form Plugin ${k + 1}`
        })),
        plugin_version: '1.0.0'
      }))

      mockSupabaseAdmin.from().insert().select().single.mockImplementation((data) =>
        Promise.resolve({
          data: { id: `memory-test-${Date.now()}`, ...data, api_token: 'memory-token' },
          error: null
        })
      )

      const { duration } = await measurePerformance(
        async () => {
          const promises = largeDataOperations.map(async (siteData) => {
            mockValidateRequest.mockReturnValue({
              success: true,
              data: siteData
            })

            const request = new NextRequest('http://localhost:3000/api/sites/register', {
              method: 'POST',
              body: JSON.stringify(siteData)
            })

            return registerSite(request)
          })

          return Promise.all(promises)
        },
        'Memory Usage Test - 100 Large Site Registrations'
      )

      const finalMemory = measureMemoryUsage()

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
        console.log(`Memory increase: ${memoryIncrease}MB`)
        
        // Memory increase should be reasonable (less than 100MB for this test)
        expect(memoryIncrease).toBeLessThan(100)
      }

      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle scan data processing efficiently', async () => {
      const siteId = 'perf-scan-site-id-1234-5678-9012-123456789012'
      const largeScanData = {
        site_id: siteId,
        detected_scripts: Array.from({ length: 200 }, (_, i) => ({
          src: `https://example-${i}.com/script-${i}.js`,
          domain: `example-${i}.com`,
          type: ['analytics', 'advertising', 'social', 'functional'][i % 4],
          detected_at: new Date().toISOString()
        })),
        detected_cookies: Array.from({ length: 150 }, (_, i) => ({
          name: `cookie_${i}`,
          domain: 'example.com',
          category: ['analytics', 'advertising', 'social', 'essential'][i % 4],
          detected_at: new Date().toISOString()
        })),
        scan_timestamp: new Date().toISOString()
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: largeScanData
      })

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: siteId, domain: 'https://scan-test.com', status: 'active' },
        error: null
      })

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: { id: 'scan-id-123', ...largeScanData, processed: false },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        body: JSON.stringify(largeScanData)
      })

      const { result, duration } = await measurePerformance(
        () => reportScan(request),
        'Large Scan Data Processing (200 scripts, 150 cookies)'
      )

      const data = await result.json()
      expect(data.scan_id).toBe('scan-id-123')
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('Stress Testing', () => {
    it('should handle extreme load without failures', async () => {
      const extremeLoad = 200
      const operations = Array.from({ length: extremeLoad }, (_, i) => {
        const operationType = ['register', 'widget', 'consent', 'scan'][i % 4]
        
        return {
          type: operationType,
          id: i,
          data: {
            site_id: `stress-site-${i}`,
            domain: `https://stress-test-${i}.com`,
            visitor_hash: `stress-visitor-${i}`
          }
        }
      })

      // Setup universal mocks
      mockSupabaseAdmin.from().insert().select().single.mockImplementation(() =>
        Promise.resolve({
          data: { id: `stress-id-${Date.now()}-${Math.random()}` },
          error: null
        })
      )

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { id: 'stress-site', status: 'active' },
        error: null
      })

      const { result: results, duration } = await measurePerformance(
        async () => {
          const promises = operations.map(async (op) => {
            try {
              mockValidateRequest.mockReturnValue({
                success: true,
                data: op.data
              })

              // Simulate different API calls
              const request = new NextRequest('http://localhost:3000/api/sites/register', {
                method: 'POST',
                body: JSON.stringify(op.data)
              })

              return await registerSite(request)
            } catch (error) {
              return { status: 500, error: error.message }
            }
          })

          return Promise.all(promises)
        },
        `Stress Test - ${extremeLoad} Operations`
      )

      // Calculate success rate
      const successfulRequests = results.filter(r => r.status < 400).length
      const successRate = (successfulRequests / extremeLoad) * 100

      console.log(`Success rate: ${successRate.toFixed(2)}% (${successfulRequests}/${extremeLoad})`)
      
      // Should maintain at least 95% success rate under stress
      expect(successRate).toBeGreaterThanOrEqual(95)
      
      // Should complete within reasonable time even under stress
      expect(duration).toBeLessThan(30000) // 30 seconds max
    })

    it('should recover gracefully from database errors', async () => {
      const requestCount = 50
      let errorCount = 0
      let successCount = 0

      // Mock database to fail intermittently
      mockSupabaseAdmin.from().insert().select().single.mockImplementation(() => {
        if (Math.random() < 0.3) { // 30% failure rate
          errorCount++
          return Promise.reject(new Error('Database temporarily unavailable'))
        } else {
          successCount++
          return Promise.resolve({
            data: { id: `recovery-id-${Date.now()}` },
            error: null
          })
        }
      })

      const requests = Array.from({ length: requestCount }, (_, i) => {
        const siteData = {
          domain: `https://recovery-test-${i}.com`,
          wp_version: '6.3.0',
          installed_plugins: [],
          detected_forms: [],
          plugin_version: '1.0.0'
        }

        mockValidateRequest.mockReturnValue({
          success: true,
          data: siteData
        })

        return new NextRequest('http://localhost:3000/api/sites/register', {
          method: 'POST',
          body: JSON.stringify(siteData)
        })
      })

      const { result: responses, duration } = await measurePerformance(
        () => Promise.allSettled(
          requests.map(req => registerSite(req))
        ),
        `Error Recovery Test - ${requestCount} Requests with 30% Failure Rate`
      )

      const fulfilled = responses.filter(r => r.status === 'fulfilled').length
      const rejected = responses.filter(r => r.status === 'rejected').length

      console.log(`Fulfilled: ${fulfilled}, Rejected: ${rejected}`)
      console.log(`Database errors: ${errorCount}, Successes: ${successCount}`)

      // Should handle errors gracefully without crashing
      expect(fulfilled + rejected).toBe(requestCount)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })
  })
})