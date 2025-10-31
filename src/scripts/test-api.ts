#!/usr/bin/env tsx

/**
 * Comprehensive API test script for Vision Privacy
 * Tests all implemented endpoints and functionality
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const API_BASE = process.env.NEXT_PUBLIC_WIDGET_CDN_URL || 'http://localhost:3000'
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || 'test-admin-token'

interface TestResult {
  name: string
  success: boolean
  error?: string
  data?: any
}

class APITester {
  private results: TestResult[] = []
  private siteId: string = ''
  private apiToken: string = ''

  async runAllTests() {
    console.log('🚀 Starting Vision Privacy API Tests...\n')

    // Test 1: Health Check
    await this.testHealthCheck()

    // Test 2: Site Registration
    await this.testSiteRegistration()

    // Test 3: Widget Configuration
    await this.testWidgetConfiguration()

    // Test 4: Privacy Policy
    await this.testPrivacyPolicy()

    // Test 5: Consent Tracking
    await this.testConsentTracking()

    // Test 6: Client Scanning
    await this.testClientScanning()

    // Test 7: Admin Template Management
    await this.testAdminTemplates()

    // Print Results
    this.printResults()
  }

  private async testHealthCheck() {
    try {
      const response = await fetch(`${API_BASE}/api/health`)
      const data = await response.json()

      this.addResult('Health Check', response.ok, response.ok ? undefined : 'Health check failed', data)
    } catch (error) {
      this.addResult('Health Check', false, `Error: ${error}`)
    }
  }

  private async testSiteRegistration() {
    try {
      const registrationData = {
        domain: 'https://test-site.example.com',
        wp_version: '6.4.0',
        installed_plugins: ['contact-form-7', 'yoast-seo'],
        detected_forms: [
          { type: 'contact-form-7', count: 2 },
          { type: 'gravity-forms', count: 1 }
        ],
        plugin_version: '1.0.0'
      }

      const response = await fetch(`${API_BASE}/api/sites/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      })

      const data = await response.json()

      if (response.ok && data.site_id && data.api_token) {
        this.siteId = data.site_id
        this.apiToken = data.api_token
        this.addResult('Site Registration', true, undefined, data)
      } else {
        this.addResult('Site Registration', false, 'Registration failed', data)
      }
    } catch (error) {
      this.addResult('Site Registration', false, `Error: ${error}`)
    }
  }

  private async testWidgetConfiguration() {
    if (!this.siteId) {
      this.addResult('Widget Configuration', false, 'No site ID available')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/widget/${this.siteId}`)
      const data = await response.json()

      const hasRequiredFields = data.banner_html && data.banner_css && data.cookie_categories
      this.addResult('Widget Configuration', response.ok && hasRequiredFields, 
        response.ok ? undefined : 'Widget config incomplete', data)
    } catch (error) {
      this.addResult('Widget Configuration', false, `Error: ${error}`)
    }
  }

  private async testPrivacyPolicy() {
    if (!this.siteId) {
      this.addResult('Privacy Policy', false, 'No site ID available')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/policy/${this.siteId}`)
      const isHTML = response.headers.get('content-type')?.includes('text/html')

      this.addResult('Privacy Policy', response.ok && isHTML, 
        response.ok ? undefined : 'Policy generation failed')
    } catch (error) {
      this.addResult('Privacy Policy', false, `Error: ${error}`)
    }
  }

  private async testConsentTracking() {
    if (!this.siteId) {
      this.addResult('Consent Tracking', false, 'No site ID available')
      return
    }

    try {
      // Test consent creation
      const consentData = {
        site_id: this.siteId,
        visitor_hash: 'test-visitor-hash',
        consent_categories: ['essential', 'analytics'],
        timestamp: new Date().toISOString(),
        user_agent: 'Test User Agent'
      }

      const createResponse = await fetch(`${API_BASE}/api/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consentData)
      })

      const createData = await createResponse.json()

      // Test consent retrieval
      const getResponse = await fetch(`${API_BASE}/api/consent?site_id=${this.siteId}`, {
        headers: { 'User-Agent': 'Test User Agent' }
      })

      const getData = await getResponse.json()

      const success = createResponse.ok && getResponse.ok && getData.has_consent
      this.addResult('Consent Tracking', success, 
        success ? undefined : 'Consent tracking failed', { create: createData, get: getData })
    } catch (error) {
      this.addResult('Consent Tracking', false, `Error: ${error}`)
    }
  }

  private async testClientScanning() {
    if (!this.siteId || !this.apiToken) {
      this.addResult('Client Scanning', false, 'No site credentials available')
      return
    }

    try {
      const scanData = {
        site_id: this.siteId,
        detected_scripts: [
          {
            src: 'https://www.google-analytics.com/analytics.js',
            type: 'analytics' as const,
            domain: 'google-analytics.com'
          },
          {
            src: 'https://connect.facebook.net/en_US/fbevents.js',
            type: 'advertising' as const,
            domain: 'facebook.com'
          }
        ],
        detected_cookies: [
          {
            name: '_ga',
            domain: 'google-analytics.com',
            category: 'analytics'
          }
        ],
        scan_timestamp: new Date().toISOString()
      }

      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: JSON.stringify(scanData)
      })

      const data = await response.json()

      this.addResult('Client Scanning', response.ok, 
        response.ok ? undefined : 'Scan processing failed', data)
    } catch (error) {
      this.addResult('Client Scanning', false, `Error: ${error}`)
    }
  }

  private async testAdminTemplates() {
    try {
      // Test template listing
      const listResponse = await fetch(`${API_BASE}/api/admin/templates`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      })

      const listData = await listResponse.json()

      // Test template creation
      const templateData = {
        template_type: 'banner',
        content: '<div>Test Banner Template</div>',
        version: 'test-1.0.0'
      }

      const createResponse = await fetch(`${API_BASE}/api/admin/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify(templateData)
      })

      const createData = await createResponse.json()

      const success = listResponse.ok && createResponse.ok
      this.addResult('Admin Templates', success, 
        success ? undefined : 'Admin template management failed', 
        { list: listData, create: createData })
    } catch (error) {
      this.addResult('Admin Templates', false, `Error: ${error}`)
    }
  }

  private addResult(name: string, success: boolean, error?: string, data?: any) {
    this.results.push({ name, success, error, data })
    
    const status = success ? '✅' : '❌'
    console.log(`${status} ${name}`)
    if (error) console.log(`   Error: ${error}`)
    if (success && data) console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`)
    console.log()
  }

  private printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))
    
    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    
    console.log(`Passed: ${passed}/${total} tests`)
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`)
    
    if (passed < total) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`))
    }
    
    console.log('\n🎯 Next Steps:')
    if (passed === total) {
      console.log('✅ All tests passed! Ready to continue with Task 5 (JavaScript Widget)')
    } else {
      console.log('⚠️  Some tests failed. Check your environment configuration and database setup.')
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester()
  tester.runAllTests().catch(console.error)
}

export default APITester