/**
 * Widget Functionality Integration Tests
 * Tests JavaScript widget behavior and browser compatibility
 */

import { JSDOM } from 'jsdom'

// Mock browser environment for widget testing
const setupBrowserEnvironment = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <script src="https://www.google-analytics.com/analytics.js"></script>
        <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
        <script data-category="analytics" src="https://example.com/analytics.js"></script>
        <script data-category="advertising" type="text/plain">
          // Blocked advertising script
          console.log('This should be blocked');
        </script>
      </body>
    </html>
  `, {
    url: 'https://example.com',
    pretendToBeVisual: true,
    resources: 'usable'
  })

  // Setup global objects
  global.window = dom.window as any
  global.document = dom.window.document
  global.navigator = dom.window.navigator
  global.localStorage = dom.window.localStorage
  global.fetch = jest.fn()
  global.CustomEvent = dom.window.CustomEvent
  global.Event = dom.window.Event

  // Mock crypto API
  global.crypto = {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  } as any

  return dom
}

// Mock widget configuration
const mockWidgetConfig = {
  banner_html: `
    <div id="vp-banner" class="vp-banner">
      <div class="vp-banner-content">
        <p>We use cookies to improve your experience.</p>
        <div class="vp-banner-buttons">
          <button id="vp-accept-all" class="vp-btn vp-btn-primary">Accept All</button>
          <button id="vp-reject-all" class="vp-btn vp-btn-secondary">Reject All</button>
          <button id="vp-settings" class="vp-btn vp-btn-link">Settings</button>
        </div>
      </div>
    </div>
  `,
  banner_css: `
    .vp-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 1px solid #ccc;
      padding: 20px;
      z-index: 999999;
    }
    .vp-btn {
      padding: 8px 16px;
      margin: 0 5px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .vp-btn-primary {
      background: #007cba;
      color: white;
    }
  `,
  cookie_categories: [
    {
      id: 'essential',
      name: 'Essential',
      description: 'Required for basic site functionality',
      is_essential: true,
      sort_order: 0
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Help us understand how visitors use our site',
      is_essential: false,
      sort_order: 1
    },
    {
      id: 'advertising',
      name: 'Advertising',
      description: 'Used to show relevant ads',
      is_essential: false,
      sort_order: 2
    }
  ],
  privacy_policy_url: 'https://api.example.com/api/policy/test-site-id',
  consent_endpoint: 'https://api.example.com/api/consent',
  site_config: {
    domain: 'example.com',
    scan_interval: 300000
  }
}

// Load widget code (simplified version for testing)
const createMockWidget = () => {
  return `
    class VisionPrivacyWidget {
      constructor(siteId, apiEndpoint) {
        this.siteId = siteId;
        this.apiEndpoint = apiEndpoint;
        this.config = null;
        this.consent = null;
        this.bannerElement = null;
        this.isInitialized = false;
        this.CONSENT_KEY = \`vp_consent_\${this.siteId}\`;
      }

      async init() {
        if (this.isInitialized) return;
        
        this.consent = this.loadStoredConsent();
        await this.fetchConfig();
        
        if (!this.hasValidConsent()) {
          await this.showBanner();
        } else {
          this.enforceConsent();
        }
        
        this.isInitialized = true;
        this.dispatchEvent('vp:initialized');
      }

      async fetchConfig() {
        const response = await fetch(\`\${this.apiEndpoint}/api/widget/\${this.siteId}\`);
        if (response.ok) {
          this.config = await response.json();
        } else {
          throw new Error('Failed to fetch config');
        }
      }

      loadStoredConsent() {
        try {
          const stored = localStorage.getItem(this.CONSENT_KEY);
          if (!stored) return null;
          
          const consent = JSON.parse(stored);
          if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
            localStorage.removeItem(this.CONSENT_KEY);
            return null;
          }
          
          return consent;
        } catch (error) {
          return null;
        }
      }

      hasValidConsent() {
        return this.consent && 
               this.consent.consent_categories && 
               this.consent.expires_at && 
               new Date(this.consent.expires_at) > new Date();
      }

      async showBanner() {
        if (!this.config) return;
        
        this.hideBanner();
        this.bannerElement = this.createElement(this.config.banner_html);
        this.injectCSS(this.config.banner_css);
        this.attachBannerEvents();
        document.body.appendChild(this.bannerElement);
        this.dispatchEvent('vp:banner_shown');
      }

      hideBanner() {
        if (this.bannerElement && this.bannerElement.parentNode) {
          this.bannerElement.parentNode.removeChild(this.bannerElement);
          this.bannerElement = null;
        }
        this.dispatchEvent('vp:banner_hidden');
      }

      createElement(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
      }

      injectCSS(cssString) {
        if (document.getElementById('vp-widget-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'vp-widget-styles';
        style.textContent = cssString;
        document.head.appendChild(style);
      }

      attachBannerEvents() {
        if (!this.bannerElement) return;

        const acceptBtn = this.bannerElement.querySelector('#vp-accept-all');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', () => this.acceptAll());
        }

        const rejectBtn = this.bannerElement.querySelector('#vp-reject-all');
        if (rejectBtn) {
          rejectBtn.addEventListener('click', () => this.rejectAll());
        }

        const settingsBtn = this.bannerElement.querySelector('#vp-settings');
        if (settingsBtn) {
          settingsBtn.addEventListener('click', () => this.showSettings());
        }
      }

      async acceptAll() {
        if (!this.config) return;
        const allCategories = this.config.cookie_categories.map(cat => cat.id);
        await this.saveConsent(allCategories);
        this.hideBanner();
      }

      async rejectAll() {
        if (!this.config) return;
        const essentialCategories = this.config.cookie_categories
          .filter(cat => cat.is_essential)
          .map(cat => cat.id);
        await this.saveConsent(essentialCategories);
        this.hideBanner();
      }

      showSettings() {
        // Simplified settings implementation
        this.dispatchEvent('vp:settings_shown');
      }

      async saveConsent(categories) {
        try {
          const consentData = {
            site_id: this.siteId,
            consent_categories: categories,
            timestamp: new Date().toISOString(),
            expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString()
          };

          const response = await fetch(\`\${this.apiEndpoint}/api/consent\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consentData)
          });

          if (response.ok) {
            localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consentData));
            this.consent = consentData;
            this.enforceConsent();
            this.dispatchEvent('vp:consent_saved', { categories });
          }
        } catch (error) {
          console.error('Failed to save consent:', error);
        }
      }

      enforceConsent() {
        if (!this.consent) return;
        
        this.manageScriptExecution();
        this.dispatchEvent('vp:consent_enforced', { 
          categories: this.consent.consent_categories 
        });
      }

      manageScriptExecution() {
        const scripts = document.querySelectorAll('script[data-category]');
        const consentedCategories = this.consent.consent_categories;
        
        scripts.forEach(script => {
          const category = script.getAttribute('data-category');
          if (consentedCategories.includes(category)) {
            this.enableScript(script);
          } else {
            this.disableScript(script);
          }
        });
      }

      enableScript(script) {
        if (script.hasAttribute('data-vp-blocked')) {
          const originalType = script.getAttribute('data-vp-original-type') || 'text/javascript';
          script.type = originalType;
          script.removeAttribute('data-vp-blocked');
          script.removeAttribute('data-vp-original-type');
        }
      }

      disableScript(script) {
        if (!script.hasAttribute('data-vp-blocked')) {
          const originalType = script.type || 'text/javascript';
          script.setAttribute('data-vp-original-type', originalType);
          script.setAttribute('data-vp-blocked', 'true');
          script.type = 'text/plain';
        }
      }

      dispatchEvent(eventName, detail = {}) {
        try {
          const event = new CustomEvent(eventName, { 
            detail: { widget: this, ...detail } 
          });
          window.dispatchEvent(event);
        } catch (error) {
          console.warn('Failed to dispatch event:', eventName, error);
        }
      }

      // Public API methods
      getConsent() { return this.consent; }
      hasConsentFor(categoryId) {
        return this.consent && 
               this.consent.consent_categories && 
               this.consent.consent_categories.includes(categoryId);
      }
      isReady() { return this.isInitialized && this.config !== null; }
    }

    window.VisionPrivacy = new VisionPrivacyWidget(
      window.VP_SITE_ID, 
      window.VP_API_ENDPOINT
    );
  `
}

describe('Widget Functionality Integration Tests', () => {
  let dom: JSDOM
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    dom = setupBrowserEnvironment()
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    
    // Setup window globals for widget
    ;(global.window as any).VP_SITE_ID = 'test-site-id-1234'
    ;(global.window as any).VP_API_ENDPOINT = 'https://api.example.com'
    
    // Clear localStorage
    global.localStorage.clear()
    
    jest.clearAllMocks()
  })

  afterEach(() => {
    dom.window.close()
  })

  describe('Widget Initialization', () => {
    it('should initialize widget and fetch configuration', async () => {
      // Mock successful config fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      // Load and execute widget code
      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      // Initialize widget
      const widget = (global.window as any).VisionPrivacy
      expect(widget).toBeDefined()
      expect(widget.siteId).toBe('test-site-id-1234')

      // Track events
      const events: string[] = []
      global.window.addEventListener('vp:initialized', () => events.push('initialized'))
      global.window.addEventListener('vp:banner_shown', () => events.push('banner_shown'))

      await widget.init()

      expect(widget.isReady()).toBe(true)
      expect(widget.config).toEqual(mockWidgetConfig)
      expect(events).toContain('initialized')
      expect(events).toContain('banner_shown')
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/widget/test-site-id-1234')
    })

    it('should handle configuration fetch failure gracefully', async () => {
      // Mock failed config fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy

      try {
        await widget.init()
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Failed to fetch config')
      }

      expect(widget.isReady()).toBe(false)
    })

    it('should skip banner when valid consent exists', async () => {
      // Setup existing consent
      const existingConsent = {
        site_id: 'test-site-id-1234',
        consent_categories: ['essential', 'analytics'],
        timestamp: '2024-01-01T12:00:00.000Z',
        expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 days from now
      }
      global.localStorage.setItem('vp_consent_test-site-id-1234', JSON.stringify(existingConsent))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy

      const events: string[] = []
      global.window.addEventListener('vp:initialized', () => events.push('initialized'))
      global.window.addEventListener('vp:banner_shown', () => events.push('banner_shown'))
      global.window.addEventListener('vp:consent_enforced', () => events.push('consent_enforced'))

      await widget.init()

      expect(widget.hasValidConsent()).toBe(true)
      expect(widget.hasConsentFor('analytics')).toBe(true)
      expect(widget.hasConsentFor('advertising')).toBe(false)
      expect(events).toContain('initialized')
      expect(events).toContain('consent_enforced')
      expect(events).not.toContain('banner_shown')
    })
  })

  describe('Banner Interaction', () => {
    let widget: any

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      widget = (global.window as any).VisionPrivacy
      await widget.init()
    })

    it('should show banner with correct content and styling', () => {
      const banner = global.document.getElementById('vp-banner')
      expect(banner).toBeTruthy()
      expect(banner?.textContent).toContain('We use cookies to improve your experience')

      const acceptBtn = global.document.getElementById('vp-accept-all')
      const rejectBtn = global.document.getElementById('vp-reject-all')
      const settingsBtn = global.document.getElementById('vp-settings')

      expect(acceptBtn).toBeTruthy()
      expect(rejectBtn).toBeTruthy()
      expect(settingsBtn).toBeTruthy()

      // Check CSS injection
      const styleElement = global.document.getElementById('vp-widget-styles')
      expect(styleElement).toBeTruthy()
      expect(styleElement?.textContent).toContain('.vp-banner')
    })

    it('should handle accept all button click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent_id: 'test-consent-123' })
      } as Response)

      const events: string[] = []
      global.window.addEventListener('vp:consent_saved', () => events.push('consent_saved'))
      global.window.addEventListener('vp:banner_hidden', () => events.push('banner_hidden'))

      const acceptBtn = global.document.getElementById('vp-accept-all')
      acceptBtn?.click()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(events).toContain('consent_saved')
      expect(events).toContain('banner_hidden')
      expect(widget.hasConsentFor('essential')).toBe(true)
      expect(widget.hasConsentFor('analytics')).toBe(true)
      expect(widget.hasConsentFor('advertising')).toBe(true)

      // Banner should be removed
      const banner = global.document.getElementById('vp-banner')
      expect(banner).toBeFalsy()
    })

    it('should handle reject all button click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent_id: 'test-consent-456' })
      } as Response)

      const events: string[] = []
      global.window.addEventListener('vp:consent_saved', () => events.push('consent_saved'))
      global.window.addEventListener('vp:banner_hidden', () => events.push('banner_hidden'))

      const rejectBtn = global.document.getElementById('vp-reject-all')
      rejectBtn?.click()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(events).toContain('consent_saved')
      expect(events).toContain('banner_hidden')
      expect(widget.hasConsentFor('essential')).toBe(true)
      expect(widget.hasConsentFor('analytics')).toBe(false)
      expect(widget.hasConsentFor('advertising')).toBe(false)
    })

    it('should handle settings button click', () => {
      const events: string[] = []
      global.window.addEventListener('vp:settings_shown', () => events.push('settings_shown'))

      const settingsBtn = global.document.getElementById('vp-settings')
      settingsBtn?.click()

      expect(events).toContain('settings_shown')
    })
  })

  describe('Script Management', () => {
    let widget: any

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      widget = (global.window as any).VisionPrivacy
      await widget.init()
    })

    it('should block scripts when consent is not given', async () => {
      // Reject all cookies (only essential)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent_id: 'test-consent-reject' })
      } as Response)

      const rejectBtn = global.document.getElementById('vp-reject-all')
      rejectBtn?.click()

      await new Promise(resolve => setTimeout(resolve, 0))

      // Check that analytics script is blocked
      const analyticsScript = global.document.querySelector('script[data-category="analytics"]')
      expect(analyticsScript?.getAttribute('type')).toBe('text/plain')
      expect(analyticsScript?.hasAttribute('data-vp-blocked')).toBe(true)

      // Check that advertising script remains blocked
      const advertisingScript = global.document.querySelector('script[data-category="advertising"]')
      expect(advertisingScript?.getAttribute('type')).toBe('text/plain')
      expect(advertisingScript?.hasAttribute('data-vp-blocked')).toBe(true)
    })

    it('should enable scripts when consent is given', async () => {
      // Accept all cookies
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent_id: 'test-consent-accept' })
      } as Response)

      const acceptBtn = global.document.getElementById('vp-accept-all')
      acceptBtn?.click()

      await new Promise(resolve => setTimeout(resolve, 0))

      // Check that analytics script is enabled
      const analyticsScript = global.document.querySelector('script[data-category="analytics"]')
      expect(analyticsScript?.getAttribute('type')).not.toBe('text/plain')
      expect(analyticsScript?.hasAttribute('data-vp-blocked')).toBe(false)

      // Check that advertising script is enabled
      const advertisingScript = global.document.querySelector('script[data-category="advertising"]')
      expect(advertisingScript?.getAttribute('type')).not.toBe('text/plain')
      expect(advertisingScript?.hasAttribute('data-vp-blocked')).toBe(false)
    })
  })

  describe('Local Storage Management', () => {
    let widget: any

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      widget = (global.window as any).VisionPrivacy
      await widget.init()
    })

    it('should save consent to localStorage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent_id: 'test-consent-storage' })
      } as Response)

      const acceptBtn = global.document.getElementById('vp-accept-all')
      acceptBtn?.click()

      await new Promise(resolve => setTimeout(resolve, 0))

      const storedConsent = global.localStorage.getItem('vp_consent_test-site-id-1234')
      expect(storedConsent).toBeTruthy()

      const consentData = JSON.parse(storedConsent!)
      expect(consentData.site_id).toBe('test-site-id-1234')
      expect(consentData.consent_categories).toEqual(['essential', 'analytics', 'advertising'])
      expect(consentData.expires_at).toBeTruthy()
    })

    it('should handle expired consent', () => {
      // Setup expired consent
      const expiredConsent = {
        site_id: 'test-site-id-1234',
        consent_categories: ['essential'],
        timestamp: '2023-01-01T12:00:00.000Z',
        expires_at: '2023-12-31T23:59:59.999Z' // Expired
      }
      global.localStorage.setItem('vp_consent_test-site-id-1234', JSON.stringify(expiredConsent))

      const loadedConsent = widget.loadStoredConsent()
      expect(loadedConsent).toBeNull()

      // Should have removed expired consent from storage
      const storedConsent = global.localStorage.getItem('vp_consent_test-site-id-1234')
      expect(storedConsent).toBeNull()
    })

    it('should handle corrupted localStorage data', () => {
      // Setup corrupted consent data
      global.localStorage.setItem('vp_consent_test-site-id-1234', 'invalid-json-data')

      const loadedConsent = widget.loadStoredConsent()
      expect(loadedConsent).toBeNull()
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should handle network errors during consent save', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWidgetConfig)
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy
      await widget.init()

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const acceptBtn = global.document.getElementById('vp-accept-all')
      acceptBtn?.click()

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save consent:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should prevent multiple initializations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWidgetConfig)
      } as Response)

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy

      await widget.init()
      const firstInitState = widget.isInitialized

      await widget.init() // Second initialization
      const secondInitState = widget.isInitialized

      expect(firstInitState).toBe(true)
      expect(secondInitState).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should only fetch config once
    })
  })

  describe('Cross-Browser Compatibility', () => {
    it('should work without modern JavaScript features', () => {
      // Remove modern features
      delete (global.window as any).fetch
      delete (global.crypto as any).subtle

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy
      expect(widget).toBeDefined()
      expect(widget.siteId).toBe('test-site-id-1234')
    })

    it('should handle missing localStorage gracefully', () => {
      // Mock localStorage to throw errors
      const mockLocalStorage = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage not available')
        }),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage not available')
        }),
        removeItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage not available')
        })
      }

      Object.defineProperty(global.window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      })

      const widgetCode = createMockWidget()
      const script = global.document.createElement('script')
      script.textContent = widgetCode
      global.document.head.appendChild(script)

      const widget = (global.window as any).VisionPrivacy
      
      // Should not throw errors
      expect(() => widget.loadStoredConsent()).not.toThrow()
    })
  })
})