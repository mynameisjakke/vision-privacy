/**
 * WordPress Plugin Integration Tests
 * Tests WordPress plugin functionality and API integration
 */

import { NextRequest } from 'next/server'
import { POST as registerSite } from '@/app/api/sites/register/route'

// Mock WordPress-specific functionality for testing
const mockWordPressEnvironment = {
  plugins: {
    'contact-form-7/wp-contact-form-7.php': {
      name: 'Contact Form 7',
      version: '5.8.0',
      active: true,
      description: 'Just another contact form plugin'
    },
    'woocommerce/woocommerce.php': {
      name: 'WooCommerce',
      version: '8.0.0',
      active: true,
      description: 'An eCommerce toolkit'
    },
    'yoast-seo/wp-seo.php': {
      name: 'Yoast SEO',
      version: '21.0.0',
      active: true,
      description: 'The first true all-in-one SEO solution'
    }
  },
  forms: {
    'contact-form-7': [
      { id: 1, title: 'Contact Form 1', status: 'publish' },
      { id: 2, title: 'Newsletter Signup', status: 'publish' }
    ],
    'gravity-forms': [],
    'wpforms': []
  },
  site: {
    url: 'https://example-wp-site.com',
    name: 'Example WordPress Site',
    admin_email: 'admin@example-wp-site.com',
    wp_version: '6.3.0',
    language: 'en_US',
    timezone: 'Europe/Stockholm'
  },
  theme: {
    name: 'Twenty Twenty-Four',
    version: '1.0.0',
    template: 'twentytwentyfour',
    stylesheet: 'twentytwentyfour'
  }
}

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
    SITES: 'sites'
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
  validateRequest: jest.fn()
}))

jest.mock('@/utils/crypto', () => ({
  generateApiToken: jest.fn(() => 'wp-api-token-12345678901234567890123456789012'),
  generateSiteId: jest.fn(() => 'wp-site-id-1234-5678-9012-123456789012'),
  isValidDomain: jest.fn(() => true)
}))

describe('WordPress Plugin Integration Tests', () => {
  const mockSupabaseAdmin = require('@/lib/supabase').supabaseAdmin
  const mockValidateRequest = require('@/lib/validation').validateRequest

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('WordPress Plugin Registration', () => {
    it('should register WordPress site with complete plugin data', async () => {
      const wordpressRegistrationData = {
        domain: mockWordPressEnvironment.site.url,
        wp_version: mockWordPressEnvironment.site.wp_version,
        installed_plugins: Object.entries(mockWordPressEnvironment.plugins).map(([file, plugin]) => ({
          name: plugin.name,
          version: plugin.version,
          file: file,
          active: plugin.active,
          description: plugin.description
        })),
        detected_forms: [
          {
            type: 'contact-form-7',
            count: mockWordPressEnvironment.forms['contact-form-7'].length,
            plugin: 'Contact Form 7'
          }
        ],
        plugin_version: '1.0.0',
        site_name: mockWordPressEnvironment.site.name,
        admin_email: mockWordPressEnvironment.site.admin_email,
        site_language: mockWordPressEnvironment.site.language,
        timezone: mockWordPressEnvironment.site.timezone,
        theme_data: mockWordPressEnvironment.theme,
        multisite: false,
        users_count: 5,
        posts_count: 25,
        pages_count: 8
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: wordpressRegistrationData
      })

      const registeredSite = {
        id: 'wp-site-id-1234-5678-9012-123456789012',
        ...wordpressRegistrationData,
        api_token: 'wp-api-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(wordpressRegistrationData),
        headers: {
          'User-Agent': 'VisionPrivacy-WP/1.0.0'
        }
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.site_id).toBe('wp-site-id-1234-5678-9012-123456789012')
      expect(data.api_token).toBe('wp-api-token-12345678901234567890123456789012')
      expect(data.widget_url).toContain('/api/widget/script')

      // Verify WordPress-specific data was stored
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.installed_plugins).toHaveLength(3)
      expect(insertCall.installed_plugins[0].name).toBe('Contact Form 7')
      expect(insertCall.detected_forms).toHaveLength(1)
      expect(insertCall.theme_data.name).toBe('Twenty Twenty-Four')
      expect(insertCall.site_name).toBe('Example WordPress Site')
    })

    it('should handle WordPress multisite registration', async () => {
      const multisiteData = {
        domain: 'https://multisite.example.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'WordPress MU Domain Mapping',
            version: '0.5.5.1',
            file: 'wordpress-mu-domain-mapping/domain_mapping.php',
            active: true,
            network: true
          }
        ],
        detected_forms: [],
        plugin_version: '1.0.0',
        multisite: true,
        network_sites: [
          { blog_id: 1, domain: 'multisite.example.com', path: '/' },
          { blog_id: 2, domain: 'site2.example.com', path: '/' },
          { blog_id: 3, domain: 'multisite.example.com', path: '/site3/' }
        ]
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: multisiteData
      })

      const registeredMultisite = {
        id: 'multisite-id-1234-5678-9012-123456789012',
        ...multisiteData,
        api_token: 'multisite-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredMultisite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(multisiteData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Verify multisite data was processed
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.multisite).toBe(true)
      expect(insertCall.network_sites).toHaveLength(3)
      expect(insertCall.installed_plugins[0].network).toBe(true)
    })

    it('should register WooCommerce site with ecommerce data', async () => {
      const wooCommerceData = {
        domain: 'https://shop.example.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'WooCommerce',
            version: '8.0.0',
            file: 'woocommerce/woocommerce.php',
            active: true
          },
          {
            name: 'WooCommerce Stripe Gateway',
            version: '7.5.0',
            file: 'woocommerce-gateway-stripe/woocommerce-gateway-stripe.php',
            active: true
          }
        ],
        detected_forms: [],
        plugin_version: '1.0.0',
        woocommerce_data: {
          active: true,
          version: '8.0.0',
          product_count: 250,
          order_count: 1500,
          currency: 'SEK',
          payment_gateways: [
            { id: 'stripe', title: 'Credit Card', method_title: 'Stripe' },
            { id: 'paypal', title: 'PayPal', method_title: 'PayPal Standard' },
            { id: 'bacs', title: 'Direct Bank Transfer', method_title: 'BACS' }
          ]
        },
        analytics_data: [
          {
            type: 'google-analytics',
            detected: true,
            method: 'plugin-woocommerce'
          },
          {
            type: 'facebook-pixel',
            detected: true,
            method: 'plugin-facebook-for-woocommerce'
          }
        ]
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: wooCommerceData
      })

      const registeredWooSite = {
        id: 'woo-site-id-1234-5678-9012-123456789012',
        ...wooCommerceData,
        api_token: 'woo-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredWooSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(wooCommerceData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Verify WooCommerce-specific data
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.woocommerce_data.active).toBe(true)
      expect(insertCall.woocommerce_data.product_count).toBe(250)
      expect(insertCall.woocommerce_data.payment_gateways).toHaveLength(3)
      expect(insertCall.analytics_data).toHaveLength(2)
    })
  })

  describe('WordPress Plugin Data Collection', () => {
    it('should detect and categorize form plugins correctly', async () => {
      const formPluginsData = {
        domain: 'https://forms.example.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'Contact Form 7',
            version: '5.8.0',
            file: 'contact-form-7/wp-contact-form-7.php',
            active: true
          },
          {
            name: 'Gravity Forms',
            version: '2.7.0',
            file: 'gravityforms/gravityforms.php',
            active: true
          },
          {
            name: 'WPForms Lite',
            version: '1.8.0',
            file: 'wpforms-lite/wpforms.php',
            active: true
          },
          {
            name: 'Ninja Forms',
            version: '3.6.0',
            file: 'ninja-forms/ninja-forms.php',
            active: true
          }
        ],
        detected_forms: [
          {
            type: 'contact-form-7',
            count: 3,
            plugin: 'Contact Form 7'
          },
          {
            type: 'gravity-forms',
            count: 2,
            plugin: 'Gravity Forms'
          },
          {
            type: 'wpforms',
            count: 1,
            plugin: 'WPForms'
          },
          {
            type: 'ninja-forms',
            count: 4,
            plugin: 'Ninja Forms'
          }
        ],
        plugin_version: '1.0.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: formPluginsData
      })

      const registeredSite = {
        id: 'forms-site-id-1234-5678-9012-123456789012',
        ...formPluginsData,
        api_token: 'forms-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(formPluginsData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Verify form detection
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.detected_forms).toHaveLength(4)
      expect(insertCall.detected_forms.find(f => f.type === 'contact-form-7').count).toBe(3)
      expect(insertCall.detected_forms.find(f => f.type === 'gravity-forms').count).toBe(2)
    })

    it('should detect analytics and tracking plugins', async () => {
      const analyticsPluginsData = {
        domain: 'https://analytics.example.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'MonsterInsights',
            version: '8.20.0',
            file: 'google-analytics-for-wordpress/googleanalytics.php',
            active: true
          },
          {
            name: 'Facebook for WooCommerce',
            version: '3.0.0',
            file: 'facebook-for-woocommerce/facebook-for-woocommerce.php',
            active: true
          },
          {
            name: 'Google Tag Manager for WordPress',
            version: '1.16.0',
            file: 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php',
            active: true
          }
        ],
        detected_forms: [],
        plugin_version: '1.0.0',
        analytics_data: [
          {
            type: 'google-analytics',
            detected: true,
            method: 'plugin-monsterinsights'
          },
          {
            type: 'facebook-pixel',
            detected: true,
            method: 'plugin-facebook-for-woocommerce'
          },
          {
            type: 'google-tag-manager',
            detected: true,
            method: 'plugin-gtm'
          }
        ]
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: analyticsPluginsData
      })

      const registeredSite = {
        id: 'analytics-site-id-1234-5678-9012-123456789012',
        ...analyticsPluginsData,
        api_token: 'analytics-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(analyticsPluginsData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Verify analytics detection
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.analytics_data).toHaveLength(3)
      expect(insertCall.analytics_data.find(a => a.type === 'google-analytics')).toBeDefined()
      expect(insertCall.analytics_data.find(a => a.type === 'facebook-pixel')).toBeDefined()
      expect(insertCall.analytics_data.find(a => a.type === 'google-tag-manager')).toBeDefined()
    })
  })

  describe('WordPress Plugin Error Handling', () => {
    it('should handle registration with missing WordPress data gracefully', async () => {
      const minimalWordPressData = {
        domain: 'https://minimal.example.com',
        wp_version: '6.3.0',
        installed_plugins: [],
        detected_forms: [],
        plugin_version: '1.0.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: minimalWordPressData
      })

      const registeredSite = {
        id: 'minimal-site-id-1234-5678-9012-123456789012',
        ...minimalWordPressData,
        api_token: 'minimal-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(minimalWordPressData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.site_id).toBe('minimal-site-id-1234-5678-9012-123456789012')
      
      // Should handle empty arrays gracefully
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.installed_plugins).toEqual([])
      expect(insertCall.detected_forms).toEqual([])
    })

    it('should handle invalid WordPress version format', async () => {
      const invalidVersionData = {
        domain: 'https://invalid.example.com',
        wp_version: 'invalid-version',
        installed_plugins: [],
        detected_forms: [],
        plugin_version: '1.0.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: invalidVersionData
      })

      const registeredSite = {
        id: 'invalid-site-id-1234-5678-9012-123456789012',
        ...invalidVersionData,
        api_token: 'invalid-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(invalidVersionData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Should accept invalid version but still register
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.wp_version).toBe('invalid-version')
    })

    it('should handle corrupted plugin data', async () => {
      const corruptedPluginData = {
        domain: 'https://corrupted.example.com',
        wp_version: '6.3.0',
        installed_plugins: [
          {
            name: 'Valid Plugin',
            version: '1.0.0',
            file: 'valid-plugin/valid-plugin.php',
            active: true
          },
          {
            // Missing required fields
            name: '',
            version: null,
            file: undefined,
            active: 'maybe' // Invalid boolean
          },
          null, // Null plugin entry
          {
            name: 'Another Valid Plugin',
            version: '2.0.0',
            file: 'another-plugin/another-plugin.php',
            active: false
          }
        ],
        detected_forms: [],
        plugin_version: '1.0.0'
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: corruptedPluginData
      })

      const registeredSite = {
        id: 'corrupted-site-id-1234-5678-9012-123456789012',
        ...corruptedPluginData,
        api_token: 'corrupted-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(corruptedPluginData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Should handle corrupted data gracefully
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(Array.isArray(insertCall.installed_plugins)).toBe(true)
    })
  })

  describe('WordPress Plugin Company Information', () => {
    it('should register site with complete company information', async () => {
      const companyInfoData = {
        domain: 'https://company.example.com',
        wp_version: '6.3.0',
        installed_plugins: [],
        detected_forms: [],
        plugin_version: '1.0.0',
        company_info: {
          company_name: 'Example AB',
          contact_email: 'privacy@example.com',
          country: 'Sweden',
          address: 'Storgatan 1, 111 22 Stockholm',
          phone: '+46 8 123 456 78',
          dpo_email: 'dpo@example.com',
          org_number: '556123-4567',
          website_url: 'https://company.example.com',
          site_name: 'Example Company Website'
        }
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: companyInfoData
      })

      const registeredSite = {
        id: 'company-site-id-1234-5678-9012-123456789012',
        ...companyInfoData,
        api_token: 'company-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(companyInfoData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Verify company information was stored
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.company_info.company_name).toBe('Example AB')
      expect(insertCall.company_info.contact_email).toBe('privacy@example.com')
      expect(insertCall.company_info.country).toBe('Sweden')
      expect(insertCall.company_info.org_number).toBe('556123-4567')
    })

    it('should handle partial company information', async () => {
      const partialCompanyData = {
        domain: 'https://partial.example.com',
        wp_version: '6.3.0',
        installed_plugins: [],
        detected_forms: [],
        plugin_version: '1.0.0',
        company_info: {
          company_name: 'Partial Company',
          contact_email: 'contact@partial.example.com',
          country: 'Sweden',
          // Missing optional fields
          address: '',
          phone: '',
          dpo_email: '',
          org_number: ''
        }
      }

      mockValidateRequest.mockReturnValue({
        success: true,
        data: partialCompanyData
      })

      const registeredSite = {
        id: 'partial-site-id-1234-5678-9012-123456789012',
        ...partialCompanyData,
        api_token: 'partial-token-12345678901234567890123456789012',
        status: 'active'
      }

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sites/register', {
        method: 'POST',
        body: JSON.stringify(partialCompanyData)
      })

      const response = await registerSite(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      
      // Should handle partial company info
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0]
      expect(insertCall.company_info.company_name).toBe('Partial Company')
      expect(insertCall.company_info.address).toBe('')
      expect(insertCall.company_info.phone).toBe('')
    })
  })
})