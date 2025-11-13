import { PolicyTemplateEngine, TemplateVariables } from '@/lib/policy-template'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn()
              }))
            }))
          }))
        }))
      }))
    }))
  }
}))

jest.mock('@/lib/database', () => ({
  SitesDB: {
    findById: jest.fn()
  }
}))

describe('PolicyTemplateEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear template cache before each test
    PolicyTemplateEngine.invalidateTemplateCache()
  })

  describe('formatDate', () => {
    it('should format Date object to DD-MM-YYYY', () => {
      const date = new Date('2024-03-15T10:30:00Z')
      const formatted = PolicyTemplateEngine.formatDate(date)
      expect(formatted).toBe('15-03-2024')
    })

    it('should format date string to DD-MM-YYYY', () => {
      const dateString = '2024-12-25T00:00:00Z'
      const formatted = PolicyTemplateEngine.formatDate(dateString)
      expect(formatted).toBe('25-12-2024')
    })

    it('should pad single digit day and month with zero', () => {
      const date = new Date('2024-01-05T10:30:00Z')
      const formatted = PolicyTemplateEngine.formatDate(date)
      expect(formatted).toBe('05-01-2024')
    })
  })

  describe('renderTemplate', () => {
    it('should replace all template variables with provided values', () => {
      const template = 'Hello {{NAME}}, welcome to {{SITE}}!'
      const variables = {
        NAME: 'John',
        SITE: 'Vision Privacy'
      } as Partial<TemplateVariables>

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toBe('Hello John, welcome to Vision Privacy!')
    })

    it('should replace multiple occurrences of the same variable', () => {
      const template = '{{NAME}} loves {{NAME}}'
      const variables = {
        NAME: 'Alice'
      } as Partial<TemplateVariables>

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toBe('Alice loves Alice')
    })

    it('should leave unreplaced variables when not provided', () => {
      const template = 'Company: {{COMPANY_NAME}}, Email: {{CONTACT_EMAIL}}'
      const variables = {
        COMPANY_NAME: 'Test Corp'
      } as Partial<TemplateVariables>

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toBe('Company: Test Corp, Email: {{CONTACT_EMAIL}}')
    })

    it('should handle template with no variables', () => {
      const template = 'This is plain text'
      const variables = {} as Partial<TemplateVariables>

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toBe('This is plain text')
    })

    it('should handle empty template', () => {
      const template = ''
      const variables = {
        NAME: 'Test'
      } as Partial<TemplateVariables>

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toBe('')
    })

    it('should replace all standard template variables', () => {
      const template = `
        Domain: {{DOMAIN_NAME}}
        Company: {{COMPANY_NAME}}
        Org: {{ORG_NUMBER}}
        Address: {{COMPANY_ADDRESS}}
        Email: {{CONTACT_EMAIL}}
        Updated: {{LAST_UPDATED_DATE}}
      `
      const variables: Partial<TemplateVariables> = {
        DOMAIN_NAME: 'example.com',
        COMPANY_NAME: 'Example AB',
        ORG_NUMBER: '556123-4567',
        COMPANY_ADDRESS: 'Street 123',
        CONTACT_EMAIL: 'info@example.com',
        LAST_UPDATED_DATE: '15-03-2024'
      }

      const result = PolicyTemplateEngine.renderTemplate(template, variables)
      expect(result).toContain('Domain: example.com')
      expect(result).toContain('Company: Example AB')
      expect(result).toContain('Org: 556123-4567')
      expect(result).toContain('Address: Street 123')
      expect(result).toContain('Email: info@example.com')
      expect(result).toContain('Updated: 15-03-2024')
    })
  })

  describe('generateCookieList', () => {
    const mockCookies = [
      {
        cookie_name: 'session_id',
        cookie_domain: 'example.com',
        cookie_category: 'essential',
        cookie_duration: 'Session',
        cookie_description: 'Session identifier'
      },
      {
        cookie_name: '_ga',
        cookie_domain: '.google.com',
        cookie_category: 'analytics',
        cookie_duration: '2 years',
        cookie_description: 'Google Analytics'
      },
      {
        cookie_name: 'consent',
        cookie_domain: 'example.com',
        cookie_category: 'essential',
        cookie_duration: '1 year'
      }
    ]

    it('should generate HTML list for cookies in specified category', () => {
      const result = PolicyTemplateEngine.generateCookieList(mockCookies, 'essential')
      
      expect(result).toContain('<ul>')
      expect(result).toContain('</ul>')
      expect(result).toContain('session_id')
      expect(result).toContain('consent')
      expect(result).not.toContain('_ga')
    })

    it('should include cookie description when available', () => {
      const result = PolicyTemplateEngine.generateCookieList(mockCookies, 'essential')
      
      expect(result).toContain('Session identifier')
    })

    it('should not include description separator when description is missing', () => {
      const result = PolicyTemplateEngine.generateCookieList(mockCookies, 'essential')
      
      // Check that consent cookie doesn't have " - " at the end
      expect(result).toContain('consent')
      expect(result).toContain('(example.com, 1 year)</li>')
    })

    it('should return fallback message for empty category', () => {
      const result = PolicyTemplateEngine.generateCookieList(mockCookies, 'advertising')
      
      expect(result).toContain('<p><em>Inga cookies i denna kategori har upptäckts på webbplatsen.</em></p>')
    })

    it('should be case-insensitive for category matching', () => {
      const result = PolicyTemplateEngine.generateCookieList(mockCookies, 'ESSENTIAL')
      
      expect(result).toContain('session_id')
      expect(result).toContain('consent')
    })

    it('should handle empty cookies array', () => {
      const result = PolicyTemplateEngine.generateCookieList([], 'essential')
      
      expect(result).toContain('<p><em>Inga cookies i denna kategori har upptäckts på webbplatsen.</em></p>')
    })
  })

  describe('generateCookieTable', () => {
    const mockCookies = [
      {
        cookie_name: 'session_id',
        cookie_domain: 'example.com',
        cookie_category: 'essential',
        cookie_duration: 'Session'
      },
      {
        cookie_name: '_ga',
        cookie_domain: '.google.com',
        cookie_category: 'analytics',
        cookie_duration: '2 years'
      },
      {
        cookie_name: 'prefs',
        cookie_domain: 'example.com',
        cookie_category: 'functional',
        cookie_duration: '1 year'
      }
    ]

    it('should generate HTML table with all cookies', () => {
      const result = PolicyTemplateEngine.generateCookieTable(mockCookies)
      
      expect(result).toContain('<table')
      expect(result).toContain('</table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<tbody>')
      expect(result).toContain('Cookie-namn')
      expect(result).toContain('Kategori')
      expect(result).toContain('Lagringstid')
    })

    it('should include all cookie names in table', () => {
      const result = PolicyTemplateEngine.generateCookieTable(mockCookies)
      
      expect(result).toContain('session_id')
      expect(result).toContain('_ga')
      expect(result).toContain('prefs')
    })

    it('should translate category names to Swedish', () => {
      const result = PolicyTemplateEngine.generateCookieTable(mockCookies)
      
      expect(result).toContain('Nödvändiga')
      expect(result).toContain('Analys')
      expect(result).toContain('Funktionella')
    })

    it('should include cookie durations', () => {
      const result = PolicyTemplateEngine.generateCookieTable(mockCookies)
      
      expect(result).toContain('Session')
      expect(result).toContain('2 years')
      expect(result).toContain('1 year')
    })

    it('should return fallback message for empty cookies array', () => {
      const result = PolicyTemplateEngine.generateCookieTable([])
      
      expect(result).toContain('<p><em>Inga cookies har upptäckts på webbplatsen ännu.</em></p>')
    })

    it('should handle unknown category gracefully', () => {
      const unknownCookie = [{
        cookie_name: 'test',
        cookie_domain: 'test.com',
        cookie_category: 'unknown',
        cookie_duration: '1 day'
      }]
      
      const result = PolicyTemplateEngine.generateCookieTable(unknownCookie)
      
      expect(result).toContain('unknown')
    })
  })

  describe('getDemoVariables', () => {
    it('should return complete set of demo variables', () => {
      const variables = PolicyTemplateEngine.getDemoVariables()
      
      expect(variables.DOMAIN_NAME).toBe('demo.visionprivacy.com')
      expect(variables.COMPANY_NAME).toBe('Demo Företag AB')
      expect(variables.ORG_NUMBER).toBe('556123-4567')
      expect(variables.COMPANY_ADDRESS).toBe('Demovägen 123, 123 45 Stockholm')
      expect(variables.CONTACT_EMAIL).toBe('info@demo.visionprivacy.com')
      expect(variables.FORM_PLUGIN_NAME).toBe('Contact Form 7')
      expect(variables.ECOM_PLUGIN_NAME).toBe('WooCommerce')
    })

    it('should include formatted date', () => {
      const variables = PolicyTemplateEngine.getDemoVariables()
      
      expect(variables.LAST_UPDATED_DATE).toMatch(/^\d{2}-\d{2}-\d{4}$/)
    })

    it('should include cookie lists for all categories', () => {
      const variables = PolicyTemplateEngine.getDemoVariables()
      
      expect(variables.ESSENTIAL_COOKIES_LIST).toContain('vp_consent')
      expect(variables.ANALYTICS_COOKIES_LIST).toContain('_ga')
      expect(variables.FUNCTIONAL_COOKIES_LIST).toContain('YSC')
      expect(variables.ADVERTISING_COOKIES_LIST).toContain('_fbp')
    })

    it('should include cookie details table', () => {
      const variables = PolicyTemplateEngine.getDemoVariables()
      
      expect(variables.COOKIE_DETAILS_TABLE).toContain('<table')
      expect(variables.COOKIE_DETAILS_TABLE).toContain('vp_consent')
      expect(variables.COOKIE_DETAILS_TABLE).toContain('_ga')
    })

    it('should use COMPANY_NAME for COMPANY_NAME_OR_DOMAIN', () => {
      const variables = PolicyTemplateEngine.getDemoVariables()
      
      expect(variables.COMPANY_NAME_OR_DOMAIN).toBe('Demo Företag AB')
    })
  })

  describe('getSiteVariables', () => {
    const mockSitesDB = require('@/lib/database').SitesDB
    const mockSupabaseAdmin = require('@/lib/supabase').supabaseAdmin

    beforeEach(() => {
      // Reset the mock chain for each test
      const mockChain = {
        single: jest.fn()
      }
      const limitMock = jest.fn(() => mockChain)
      const orderMock = jest.fn(() => ({ limit: limitMock }))
      const eqMock2 = jest.fn(() => ({ order: orderMock }))
      const eqMock1 = jest.fn(() => ({ eq: eqMock2 }))
      const selectMock = jest.fn(() => ({ eq: eqMock1 }))
      
      mockSupabaseAdmin.from.mockReturnValue({ select: selectMock })
    })

    it('should fetch site data and return variables', async () => {
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        company_name: 'Example Corp',
        org_number: '556789-0123',
        company_address: 'Main St 456',
        contact_email: 'contact@example.com',
        installed_plugins: ['Contact Form 7', 'WooCommerce']
      }

      mockSitesDB.findById.mockResolvedValue(mockSite)
      
      const mockScan = {
        detected_cookies: [
          {
            name: 'test_cookie',
            domain: 'example.com',
            category: 'essential',
            description: 'Test cookie'
          }
        ]
      }

      // Mock the full chain
      const mockChain = {
        single: jest.fn().mockResolvedValue({
          data: mockScan,
          error: null
        })
      }
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChain)
              })
            })
          })
        })
      })

      const variables = await PolicyTemplateEngine.getSiteVariables('site-123')
      
      expect(variables.DOMAIN_NAME).toBe('example.com')
      expect(variables.COMPANY_NAME).toBe('Example Corp')
      expect(variables.ORG_NUMBER).toBe('556789-0123')
      expect(variables.COMPANY_ADDRESS).toBe('Main St 456')
      expect(variables.CONTACT_EMAIL).toBe('contact@example.com')
      expect(variables.FORM_PLUGIN_NAME).toBe('Contact Form 7')
      expect(variables.ECOM_PLUGIN_NAME).toBe('WooCommerce')
    })

    it('should use domain as fallback for COMPANY_NAME_OR_DOMAIN when company name is empty', async () => {
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        installed_plugins: []
      }

      mockSitesDB.findById.mockResolvedValue(mockSite)
      
      const mockChain = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChain)
              })
            })
          })
        })
      })

      const variables = await PolicyTemplateEngine.getSiteVariables('site-123')
      
      expect(variables.COMPANY_NAME_OR_DOMAIN).toBe('example.com')
    })

    it('should throw error when site is not found', async () => {
      mockSitesDB.findById.mockResolvedValue(null)

      await expect(
        PolicyTemplateEngine.getSiteVariables('invalid-site')
      ).rejects.toThrow('Site not found: invalid-site')
    })

    it('should handle missing scan data gracefully', async () => {
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        installed_plugins: []
      }

      mockSitesDB.findById.mockResolvedValue(mockSite)
      
      const mockChain = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChain)
              })
            })
          })
        })
      })

      const variables = await PolicyTemplateEngine.getSiteVariables('site-123')
      
      expect(variables.ESSENTIAL_COOKIES_LIST).toContain('Inga cookies')
      expect(variables.COOKIE_DETAILS_TABLE).toContain('Inga cookies')
    })

    it('should detect form plugin from installed plugins', async () => {
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        installed_plugins: ['wpforms', 'some-other-plugin']
      }

      mockSitesDB.findById.mockResolvedValue(mockSite)
      
      const mockChain = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChain)
              })
            })
          })
        })
      })

      const variables = await PolicyTemplateEngine.getSiteVariables('site-123')
      
      expect(variables.FORM_PLUGIN_NAME).toBe('WPForms')
    })

    it('should use fallback text when no form plugin detected', async () => {
      const mockSite = {
        id: 'site-123',
        domain: 'example.com',
        installed_plugins: []
      }

      mockSitesDB.findById.mockResolvedValue(mockSite)
      
      const mockChain = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(mockChain)
              })
            })
          })
        })
      })

      const variables = await PolicyTemplateEngine.getSiteVariables('site-123')
      
      expect(variables.FORM_PLUGIN_NAME).toBe('kontaktformulär')
      expect(variables.ECOM_PLUGIN_NAME).toBe('e-handelsplattform')
    })
  })
})
