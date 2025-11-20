/**
 * Vision Privacy Widget
 * Lightweight JavaScript widget for cookie consent management
 * Version: 1.0.0
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.VisionPrivacy) {
    return;
  }

  /**
   * Main VisionPrivacy Widget Class
   */
  class VisionPrivacyWidget {
    constructor(siteId, apiEndpoint) {
      this.siteId = siteId;
      this.apiEndpoint = apiEndpoint || 'https://your-api.vercel.app';
      this.config = null;
      this.consent = null;
      this.bannerElement = null;
      this.settingsModal = null;
      this.isInitialized = false;
      this.retryCount = 0;
      this.maxRetries = 3;
      this.scanIntervalId = null;
      
      // Storage keys
      this.CONSENT_KEY = `vp_consent_${this.siteId}`;
      this.CONFIG_KEY = `vp_config_${this.siteId}`;
      
      // Bind methods to preserve context
      this.init = this.init.bind(this);
      this.handleError = this.handleError.bind(this);
      this.fetchConfig = this.fetchConfig.bind(this);
      this.loadStoredConsent = this.loadStoredConsent.bind(this);
    }

    /**
     * Initialize the widget
     */
    async init() {
      if (this.isInitialized) {
        return;
      }

      try {
        // Validate required parameters
        if (!this.siteId) {
          throw new Error('Site ID is required');
        }

        // Load stored consent first
        this.consent = this.loadStoredConsent();
        
        // Fetch configuration from API
        await this.fetchConfig();
        
        // Check if we need to show the banner
        if (!this.hasValidConsent()) {
          await this.showBanner();
        } else {
          // Enforce existing consent preferences
          this.enforceConsent();
        }
        
        // Setup policy modal event listeners
        this.setupPolicyModal();
        
        // Start periodic scanning
        this.startPeriodicScanning();
        
        this.isInitialized = true;
        this.dispatchEvent('vp:initialized');
        
      } catch (error) {
        this.handleError('Initialization failed', error);
      }
    }

    /**
     * Fetch widget configuration from API
     */
    async fetchConfig() {
      try {
        // Try to load cached config first
        const cachedConfig = this.loadCachedConfig();
        if (cachedConfig && this.isCacheValid(cachedConfig)) {
          this.config = cachedConfig.data;
          return;
        }

        const response = await this.makeRequest(`/api/widget/${this.siteId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.config = data;
        
        // Inject floating button JavaScript
        if (data.floating_button_js) {
          const floatingScript = document.createElement('script');
          floatingScript.id = 'vp-floating-button-script';
          floatingScript.textContent = data.floating_button_js;
          if (!document.getElementById('vp-floating-button-script')) {
            document.head.appendChild(floatingScript);
          }
        }

        // Inject floating button CSS
        if (data.floating_button_css) {
          const floatingStyle = document.createElement('style');
          floatingStyle.id = 'vp-floating-button-styles';
          floatingStyle.textContent = data.floating_button_css;
          if (!document.getElementById('vp-floating-button-styles')) {
            document.head.appendChild(floatingStyle);
          }
        }
        
        // Cache the configuration
        this.cacheConfig(data);
        
      } catch (error) {
        // Try to use cached config as fallback
        const cachedConfig = this.loadCachedConfig();
        if (cachedConfig) {
          this.config = cachedConfig.data;
          console.warn('Using cached config due to API error:', error);
        } else {
          throw new Error(`Failed to fetch configuration: ${error.message}`);
        }
      }
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(endpoint, options = {}) {
      const url = `${this.apiEndpoint}${endpoint}`;
      
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers
            }
          });
          
          return response;
          
        } catch (error) {
          if (attempt === this.maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    /**
     * Load stored consent from localStorage
     */
    loadStoredConsent() {
      try {
        const stored = localStorage.getItem(this.CONSENT_KEY);
        if (!stored) return null;
        
        const consent = JSON.parse(stored);
        
        // Check if consent has expired
        if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
          localStorage.removeItem(this.CONSENT_KEY);
          return null;
        }
        
        return consent;
      } catch (error) {
        console.warn('Failed to load stored consent:', error);
        return null;
      }
    }

    /**
     * Load cached configuration
     */
    loadCachedConfig() {
      try {
        const cached = localStorage.getItem(this.CONFIG_KEY);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.warn('Failed to load cached config:', error);
        return null;
      }
    }

    /**
     * Cache configuration with timestamp
     */
    cacheConfig(config) {
      try {
        const cacheData = {
          data: config,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        };
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to cache config:', error);
      }
    }

    /**
     * Check if cached config is still valid
     */
    isCacheValid(cachedConfig) {
      const now = Date.now();
      return (now - cachedConfig.timestamp) < cachedConfig.ttl;
    }

    /**
     * Check if user has valid consent
     */
    hasValidConsent() {
      return this.consent && 
             this.consent.consent_categories && 
             this.consent.expires_at && 
             new Date(this.consent.expires_at) > new Date();
    }

    /**
     * Show cookie banner
     */
    async showBanner() {
      if (!this.config) {
        throw new Error('Configuration not loaded');
      }

      // Remove existing banner if present
      this.hideBanner();

      // Create banner element
      this.bannerElement = this.createElement(this.config.banner_html);
      
      // Inject CSS
      this.injectCSS(this.config.banner_css);
      
      // Attach event listeners
      this.attachBannerEvents();
      
      // Add to DOM
      document.body.appendChild(this.bannerElement);
      
      // Dispatch event
      this.dispatchEvent('vp:banner_shown');
    }

    /**
     * Hide cookie banner
     */
    hideBanner() {
      if (this.bannerElement && this.bannerElement.parentNode) {
        this.bannerElement.parentNode.removeChild(this.bannerElement);
        this.bannerElement = null;
      }
      
      this.dispatchEvent('vp:banner_hidden');
    }

    /**
     * Create DOM element from HTML string
     */
    createElement(htmlString) {
      const div = document.createElement('div');
      div.innerHTML = htmlString.trim();
      return div.firstChild;
    }

    /**
     * Inject CSS into document head
     */
    injectCSS(cssString) {
      // Check if CSS already injected
      if (document.getElementById('vp-widget-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'vp-widget-styles';
      style.textContent = cssString;
      document.head.appendChild(style);
    }

    /**
     * Attach event listeners to banner elements
     */
    attachBannerEvents() {
      if (!this.bannerElement) return;

      // Accept all button
      const acceptBtn = this.bannerElement.querySelector('#vp-accept-all');
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => this.acceptAll());
      }

      // Reject all button
      const rejectBtn = this.bannerElement.querySelector('#vp-reject-all');
      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => this.rejectAll());
      }

      // Settings button
      const settingsBtn = this.bannerElement.querySelector('#vp-settings');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => this.showSettings());
      }
    }

    /**
     * Accept all cookies
     */
    async acceptAll() {
      if (!this.config || !this.config.cookie_categories) {
        return;
      }

      const allCategories = this.config.cookie_categories.map(cat => cat.id);
      await this.saveConsent(allCategories);
      this.hideBanner();
    }

    /**
     * Reject all non-essential cookies
     */
    async rejectAll() {
      if (!this.config || !this.config.cookie_categories) {
        return;
      }

      const essentialCategories = this.config.cookie_categories
        .filter(cat => cat.is_essential)
        .map(cat => cat.id);
      
      await this.saveConsent(essentialCategories);
      this.hideBanner();
    }

    /**
     * Show cookie settings modal
     */
    showSettings() {
      if (!this.config || !this.config.cookie_categories) {
        console.error('Cannot show settings: configuration not loaded');
        return;
      }

      // Remove existing modal if present
      this.hideSettings();

      // Create settings modal
      this.settingsModal = this.createSettingsModal();
      
      // Attach event listeners
      this.attachSettingsEvents();
      
      // Add to DOM
      document.body.appendChild(this.settingsModal);
      
      // Show modal
      this.settingsModal.style.display = 'flex';
      
      this.dispatchEvent('vp:settings_shown');
    }

    /**
     * Hide cookie settings modal
     */
    hideSettings() {
      if (this.settingsModal && this.settingsModal.parentNode) {
        this.settingsModal.parentNode.removeChild(this.settingsModal);
        this.settingsModal = null;
      }
      
      this.dispatchEvent('vp:settings_hidden');
    }

    /**
     * Create settings modal DOM element
     */
    createSettingsModal() {
      const modalHtml = `
        <div id="vp-settings-modal" class="vp-modal">
          <div class="vp-modal-content">
            <div class="vp-modal-header">
              <h3>Cookie-inställningar</h3>
              <button id="vp-close-settings" class="vp-close">&times;</button>
            </div>
            <div class="vp-modal-body">
              <p>Hantera dina cookie-preferenser nedan. Nödvändiga cookies kan inte inaktiveras eftersom de krävs för att webbplatsen ska fungera korrekt.</p>
              <div id="vp-cookie-categories">
                ${this.generateCategoryToggles()}
              </div>
            </div>
            <div class="vp-modal-footer">
              <div class="vp-modal-footer-actions">
                <button id="vp-save-settings" class="vp-btn vp-btn-primary">Spara inställningar</button>
                <button id="vp-cancel-settings" class="vp-btn vp-btn-secondary">Avbryt</button>
              </div>
              <div class="vp-branding">
                <a href="https://visionmedia.io" target="_blank" rel="noopener noreferrer">Drivs av Vision Media</a>
              </div>
            </div>
          </div>
        </div>
      `;
      
      return this.createElement(modalHtml);
    }

    /**
     * Generate HTML for cookie category toggles
     */
    generateCategoryToggles() {
      if (!this.config || !this.config.cookie_categories) {
        return '<p>Inga cookie-kategorier tillgängliga</p>';
      }

      const currentConsent = this.consent ? this.consent.consent_categories : [];
      
      // Swedish category name mapping
      const categoryNameMap = {
        'essential': 'Nödvändiga',
        'functional': 'Funktionella',
        'analytics': 'Analytiska',
        'marketing': 'Marknadsföring',
        'advertising': 'Marknadsföring'
      };
      
      return this.config.cookie_categories
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(category => {
          const isChecked = currentConsent.includes(category.id);
          const isDisabled = category.is_essential;
          
          // Use name_sv if available, otherwise map from English, fallback to original name
          const categoryName = category.name_sv || categoryNameMap[category.id] || category.name;
          const categoryDescription = category.description_sv || category.description;
          
          // Get cookies for this category from last scan
          const categoryServices = this.getCategoryServices(category.id);
          
          return `
            <div class="vp-category" data-category-id="${category.id}">
              <div class="vp-category-header" role="button" aria-expanded="false" tabindex="0">
                <div class="vp-category-info">
                  <div class="vp-category-name">
                    ${this.escapeHtml(categoryName)}
                    ${category.is_essential ? '<span class="vp-essential-badge">Nödvändig</span>' : ''}
                    <span class="vp-expand-icon" aria-hidden="true">▼</span>
                  </div>
                </div>
                <label class="vp-toggle" onclick="event.stopPropagation()">
                  <input type="checkbox" 
                         ${isChecked ? 'checked' : ''} 
                         ${isDisabled ? 'disabled' : ''}
                         data-category="${category.id}">
                  <span class="vp-slider"></span>
                </label>
              </div>
              <div class="vp-category-details" style="display: none;">
                <p class="vp-category-description">${this.escapeHtml(categoryDescription)}</p>
                ${categoryServices.length > 0 ? `
                  <div class="vp-category-services">
                    <h4>Upptäckta tjänster och cookies:</h4>
                    <ul class="vp-category-cookies">
                      ${categoryServices.map(service => `<li>${this.escapeHtml(service)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
    }

    /**
     * Get services/cookies for a specific category
     */
    getCategoryServices(categoryId) {
      const services = [];
      const lastScan = this.getLastScanData();
      
      if (!lastScan) {
        return services;
      }

      // Map category IDs to their variations
      const categoryMap = {
        'essential': ['essential'],
        'functional': ['functional'],
        'analytics': ['analytics'],
        'marketing': ['advertising', 'marketing'],
        'advertising': ['advertising', 'marketing']
      };

      const matchCategories = categoryMap[categoryId] || [categoryId];

      // Add cookies from this category
      if (lastScan.detected_cookies) {
        lastScan.detected_cookies.forEach(cookie => {
          if (matchCategories.includes(cookie.category)) {
            services.push(cookie.name);
          }
        });
      }

      // Add scripts from this category
      if (lastScan.detected_scripts) {
        lastScan.detected_scripts.forEach(script => {
          if (matchCategories.includes(script.type)) {
            try {
              const url = new URL(script.src);
              services.push(url.hostname);
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });
      }

      // Remove duplicates and return
      return [...new Set(services)];
    }

    /**
     * Attach event listeners to settings modal
     */
    attachSettingsEvents() {
      if (!this.settingsModal) return;

      // Close button
      const closeBtn = this.settingsModal.querySelector('#vp-close-settings');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideSettings());
      }

      // Cancel button
      const cancelBtn = this.settingsModal.querySelector('#vp-cancel-settings');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.hideSettings());
      }

      // Save button
      const saveBtn = this.settingsModal.querySelector('#vp-save-settings');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveSettingsAndClose());
      }

      // Close on backdrop click
      this.settingsModal.addEventListener('click', (event) => {
        if (event.target === this.settingsModal) {
          this.hideSettings();
        }
      });

      // Escape key to close
      const escapeHandler = (event) => {
        if (event.key === 'Escape') {
          this.hideSettings();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);

      // Accordion functionality for category headers
      this.attachAccordionEvents();
    }

    /**
     * Attach accordion event listeners to category headers
     */
    attachAccordionEvents() {
      if (!this.settingsModal) return;

      const categoryHeaders = this.settingsModal.querySelectorAll('.vp-category-header');
      
      categoryHeaders.forEach(header => {
        // Click event
        header.addEventListener('click', (e) => {
          // Don't toggle if clicking on the toggle switch
          if (e.target.closest('.vp-toggle')) {
            return;
          }
          
          this.toggleCategoryAccordion(header);
        });

        // Keyboard support (Enter and Space)
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            
            // Don't toggle if focus is on the toggle switch
            if (e.target.closest('.vp-toggle')) {
              return;
            }
            
            this.toggleCategoryAccordion(header);
          }
        });
      });
    }

    /**
     * Toggle accordion state for a category
     */
    toggleCategoryAccordion(header) {
      const category = header.closest('.vp-category');
      if (!category) return;

      const details = category.querySelector('.vp-category-details');
      const icon = header.querySelector('.vp-expand-icon');
      
      if (!details) return;

      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      
      // Toggle aria-expanded attribute
      header.setAttribute('aria-expanded', !isExpanded);
      
      // Toggle details visibility
      if (isExpanded) {
        details.style.display = 'none';
        if (icon) icon.textContent = '▼';
      } else {
        details.style.display = 'block';
        if (icon) icon.textContent = '▲';
      }
    }

    /**
     * Save settings from modal and close
     */
    async saveSettingsAndClose() {
      if (!this.settingsModal) return;

      const checkboxes = this.settingsModal.querySelectorAll('input[type="checkbox"]');
      const selectedCategories = [];

      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          selectedCategories.push(checkbox.dataset.category);
        }
      });

      // Ensure essential categories are always included
      if (this.config && this.config.cookie_categories) {
        this.config.cookie_categories.forEach(category => {
          if (category.is_essential && !selectedCategories.includes(category.id)) {
            selectedCategories.push(category.id);
          }
        });
      }

      await this.saveConsent(selectedCategories);
      this.hideSettings();
      this.hideBanner();
    }

    /**
     * Save consent preferences
     */
    async saveConsent(categories) {
      try {
        const consentData = {
          site_id: this.siteId,
          visitor_hash: await this.generateVisitorHash(),
          consent_categories: categories,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        };

        // Save to API
        const response = await this.makeRequest('/api/consent', {
          method: 'POST',
          body: JSON.stringify(consentData)
        });

        if (!response.ok) {
          throw new Error(`Failed to save consent: ${response.statusText}`);
        }

        // Save locally with expiration
        const localConsent = {
          ...consentData,
          expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString() // 1 year
        };
        
        // Log consent data structure when saved
        console.log('[VP] Consent saved:', {
          key: this.CONSENT_KEY,
          categories: categories,
          expires_at: localConsent.expires_at,
          timestamp: localConsent.timestamp,
          site_id: this.siteId
        });
        
        localStorage.setItem(this.CONSENT_KEY, JSON.stringify(localConsent));
        this.consent = localConsent;

        // Verify consent in storage - read back from localStorage after save
        const verified = localStorage.getItem(this.CONSENT_KEY);
        if (verified) {
          try {
            const parsedConsent = JSON.parse(verified);
            const isValid = parsedConsent.consent_categories && 
                           parsedConsent.expires_at && 
                           parsedConsent.site_id === this.siteId;
            
            console.log('[VP] Consent verified in storage:', {
              success: true,
              valid: isValid,
              categories_match: JSON.stringify(parsedConsent.consent_categories) === JSON.stringify(categories),
              expires_at: parsedConsent.expires_at
            });
          } catch (parseError) {
            console.error('[VP] Consent verification failed - invalid JSON:', parseError);
          }
        } else {
          console.error('[VP] Consent verification failed - not found in localStorage');
        }

        // Enforce consent immediately
        this.enforceConsent();
        
        this.dispatchEvent('vp:consent_saved', { categories });
        
        // Show floating settings button after consent is saved
        if (window.VisionPrivacyFloatingButton && typeof window.VisionPrivacyFloatingButton.show === 'function') {
          window.VisionPrivacyFloatingButton.show();
        }
        
      } catch (error) {
        this.handleError('Failed to save consent', error);
      }
    }

    /**
     * Generate visitor hash for privacy
     */
    async generateVisitorHash() {
      const data = `${this.getClientIP()}_${navigator.userAgent}_${this.siteId}`;
      
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback for older browsers
        return this.simpleHash(data);
      }
    }

    /**
     * Get client IP (best effort)
     */
    getClientIP() {
      // This is a placeholder - actual IP detection would require server-side support
      return 'unknown';
    }

    /**
     * Simple hash function for fallback
     */
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    }

    /**
     * Enforce consent preferences
     */
    enforceConsent() {
      if (!this.consent || !this.consent.consent_categories) {
        return;
      }

      // Block/allow scripts based on consent
      this.manageScriptExecution();
      
      // Manage cookies based on consent
      this.manageCookies();
      
      this.dispatchEvent('vp:consent_enforced', { 
        categories: this.consent.consent_categories 
      });
    }

    /**
     * Manage script execution based on consent
     */
    manageScriptExecution() {
      if (!this.consent || !this.config) return;

      const consentedCategories = this.consent.consent_categories;
      
      // Find all scripts with data-category attributes
      const scripts = document.querySelectorAll('script[data-category]');
      
      scripts.forEach(script => {
        const category = script.getAttribute('data-category');
        
        if (consentedCategories.includes(category)) {
          // Allow script execution
          this.enableScript(script);
        } else {
          // Block script execution
          this.disableScript(script);
        }
      });
    }

    /**
     * Enable a blocked script
     */
    enableScript(script) {
      if (script.hasAttribute('data-vp-blocked')) {
        // Re-enable the script by changing type back
        const originalType = script.getAttribute('data-vp-original-type') || 'text/javascript';
        script.type = originalType;
        script.removeAttribute('data-vp-blocked');
        script.removeAttribute('data-vp-original-type');
        
        // If it's an external script, reload it
        if (script.src && !script.hasAttribute('data-vp-executed')) {
          const newScript = document.createElement('script');
          newScript.src = script.src;
          newScript.type = originalType;
          
          // Copy other attributes
          Array.from(script.attributes).forEach(attr => {
            if (attr.name !== 'type' && attr.name !== 'src') {
              newScript.setAttribute(attr.name, attr.value);
            }
          });
          
          script.parentNode.insertBefore(newScript, script);
          script.setAttribute('data-vp-executed', 'true');
        }
      }
    }

    /**
     * Disable a script
     */
    disableScript(script) {
      if (!script.hasAttribute('data-vp-blocked')) {
        // Store original type and block execution
        const originalType = script.type || 'text/javascript';
        script.setAttribute('data-vp-original-type', originalType);
        script.setAttribute('data-vp-blocked', 'true');
        script.type = 'text/plain';
      }
    }

    /**
     * Manage cookies based on consent
     */
    manageCookies() {
      if (!this.consent || !this.config) return;

      const consentedCategories = this.consent.consent_categories;
      
      // Get all cookies
      const cookies = document.cookie.split(';');
      
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        
        // Check if this cookie should be removed based on category
        const cookieCategory = this.getCookieCategory(name);
        
        if (cookieCategory && !consentedCategories.includes(cookieCategory)) {
          // Remove non-consented cookies
          this.deleteCookie(name);
        }
      });
    }

    /**
     * Get cookie category based on cookie name
     */
    getCookieCategory(cookieName) {
      // Common cookie patterns - this could be enhanced with server-side configuration
      const cookiePatterns = {
        'analytics': ['_ga', '_gid', '_gat', '_gtag', '_utm', 'gtm'],
        'advertising': ['_fbp', '_fbc', 'fr', 'ads', 'doubleclick'],
        'social': ['_twitter', 'facebook', 'linkedin', 'instagram'],
        'functional': ['session', 'auth', 'csrf', 'preferences']
      };

      for (const [category, patterns] of Object.entries(cookiePatterns)) {
        if (patterns.some(pattern => cookieName.toLowerCase().includes(pattern))) {
          return category;
        }
      }

      return 'functional'; // Default to functional for unknown cookies
    }

    /**
     * Delete a cookie
     */
    deleteCookie(name) {
      // Delete for current domain
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      
      // Delete for parent domain
      const domain = window.location.hostname;
      const parts = domain.split('.');
      
      if (parts.length > 1) {
        const parentDomain = '.' + parts.slice(-2).join('.');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${parentDomain}`;
      }
    }

    /**
     * Handle errors gracefully
     */
    handleError(message, error) {
      console.error(`Vision Privacy Widget: ${message}`, error);
      
      // Dispatch error event for external handling
      this.dispatchEvent('vp:error', { 
        message, 
        error: error.message || error 
      });
      
      // Graceful degradation - don't block the host site
      if (!this.hasValidConsent()) {
        // Show minimal fallback banner if possible
        this.showFallbackBanner();
      }
    }

    /**
     * Show minimal fallback banner when API fails
     */
    showFallbackBanner() {
      try {
        const fallbackHtml = `
          <div id="vp-fallback-banner" style="
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            background: #fff; 
            border-top: 1px solid #ccc; 
            padding: 15px; 
            text-align: center; 
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
          ">
            <p style="margin: 0 0 10px 0;">This site uses cookies. By continuing to browse, you agree to our use of cookies.</p>
            <button id="vp-fallback-accept" style="
              background: #007cba; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 4px; 
              cursor: pointer;
            ">Accept</button>
          </div>
        `;
        
        const fallbackElement = this.createElement(fallbackHtml);
        document.body.appendChild(fallbackElement);
        
        // Handle accept click
        const acceptBtn = fallbackElement.querySelector('#vp-fallback-accept');
        if (acceptBtn) {
          acceptBtn.addEventListener('click', () => {
            // Save minimal consent locally
            const fallbackConsent = {
              site_id: this.siteId,
              consent_categories: ['essential'],
              timestamp: new Date().toISOString(),
              expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(),
              fallback: true
            };
            
            localStorage.setItem(this.CONSENT_KEY, JSON.stringify(fallbackConsent));
            this.consent = fallbackConsent;
            
            // Remove fallback banner
            if (fallbackElement.parentNode) {
              fallbackElement.parentNode.removeChild(fallbackElement);
            }
          });
        }
        
      } catch (error) {
        console.error('Failed to show fallback banner:', error);
      }
    }

    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, detail = {}) {
      try {
        const event = new CustomEvent(eventName, { 
          detail: { 
            widget: this, 
            ...detail 
          } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to dispatch event:', eventName, error);
      }
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
      if (!text) return '';
      
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Show consent modification interface
     */
    showConsentInterface() {
      this.showSettings();
    }

    /**
     * Update consent for specific category
     */
    async updateConsentCategory(categoryId, granted) {
      if (!this.consent) {
        this.consent = {
          site_id: this.siteId,
          consent_categories: [],
          timestamp: new Date().toISOString(),
          expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString()
        };
      }

      const categories = [...this.consent.consent_categories];
      
      if (granted && !categories.includes(categoryId)) {
        categories.push(categoryId);
      } else if (!granted && categories.includes(categoryId)) {
        const index = categories.indexOf(categoryId);
        categories.splice(index, 1);
      }

      await this.saveConsent(categories);
    }

    /**
     * Check if consent needs renewal
     */
    needsConsentRenewal() {
      if (!this.consent || !this.consent.expires_at) {
        return true;
      }

      const expiryDate = new Date(this.consent.expires_at);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      return expiryDate < thirtyDaysFromNow;
    }

    /**
     * Renew consent with current preferences
     */
    async renewConsent() {
      if (this.consent && this.consent.consent_categories) {
        await this.saveConsent(this.consent.consent_categories);
      }
    }

    /**
     * Public API methods
     */
    
    /**
     * Get current consent status
     */
    getConsent() {
      return this.consent;
    }

    /**
     * Check if specific category is consented
     */
    hasConsentFor(categoryId) {
      return this.consent && 
             this.consent.consent_categories && 
             this.consent.consent_categories.includes(categoryId);
    }

    /**
     * Manually trigger consent update
     */
    async updateConsent(categories) {
      await this.saveConsent(categories);
    }

    /**
     * Show banner manually
     */
    async showConsentBanner() {
      await this.showBanner();
    }

    /**
     * Get widget configuration
     */
    getConfig() {
      return this.config;
    }

    /**
     * Refresh configuration from API
     */
    async refreshConfig() {
      // Clear cache
      localStorage.removeItem(this.CONFIG_KEY);
      await this.fetchConfig();
    }

    /**
     * Reset all consent and show banner again
     */
    resetConsent() {
      localStorage.removeItem(this.CONSENT_KEY);
      this.consent = null;
      this.showBanner();
    }

    /**
     * Check if widget is ready
     */
    isReady() {
      return this.isInitialized && this.config !== null;
    }

    /**
     * Get consent expiry date
     */
    getConsentExpiry() {
      return this.consent ? this.consent.expires_at : null;
    }

    /**
     * Get days until consent expires
     */
    getDaysUntilExpiry() {
      if (!this.consent || !this.consent.expires_at) {
        return null;
      }

      const expiry = new Date(this.consent.expires_at);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    }

    /**
     * Export consent data for GDPR compliance
     */
    exportConsentData() {
      return {
        site_id: this.siteId,
        consent: this.consent,
        config: this.config ? {
          privacy_policy_url: this.config.privacy_policy_url,
          cookie_categories: this.config.cookie_categories
        } : null,
        exported_at: new Date().toISOString()
      };
    }

    /**
     * Delete all stored data (GDPR right to be forgotten)
     */
    deleteAllData() {
      // Stop scanning
      this.stopPeriodicScanning();
      
      // Clear all stored data
      localStorage.removeItem(this.CONSENT_KEY);
      localStorage.removeItem(this.CONFIG_KEY);
      localStorage.removeItem(`vp_last_scan_${this.siteId}`);
      
      this.consent = null;
      this.config = null;
      
      // Remove any injected elements
      this.hideBanner();
      this.hideSettings();
      
      // Remove CSS
      const styleElement = document.getElementById('vp-widget-styles');
      if (styleElement) {
        styleElement.remove();
      }
      
      this.dispatchEvent('vp:data_deleted');
    }

    /**
     * Destroy the widget and clean up resources
     */
    destroy() {
      this.stopPeriodicScanning();
      this.hideBanner();
      this.hideSettings();
      
      // Remove CSS
      const styleElement = document.getElementById('vp-widget-styles');
      if (styleElement) {
        styleElement.remove();
      }
      
      this.isInitialized = false;
      this.dispatchEvent('vp:destroyed');
    }

    /**
     * Start periodic scanning for scripts and cookies
     */
    startPeriodicScanning() {
      if (!this.config || !this.config.site_config) {
        return;
      }

      const scanInterval = this.config.site_config.scan_interval || 300000; // Default 5 minutes
      
      // Perform initial scan
      this.performScan();
      
      // Set up periodic scanning
      this.scanIntervalId = setInterval(() => {
        this.performScan();
      }, scanInterval);
      
      this.dispatchEvent('vp:scanning_started', { interval: scanInterval });
    }

    /**
     * Stop periodic scanning
     */
    stopPeriodicScanning() {
      if (this.scanIntervalId) {
        clearInterval(this.scanIntervalId);
        this.scanIntervalId = null;
        this.dispatchEvent('vp:scanning_stopped');
      }
    }

    /**
     * Perform a single scan of the page
     */
    async performScan() {
      try {
        const scanData = {
          site_id: this.siteId,
          detected_scripts: this.scanScripts(),
          detected_cookies: this.scanCookies(),
          scan_timestamp: new Date().toISOString()
        };

        // Only report if we found something new
        if (this.hasNewDetections(scanData)) {
          await this.reportScan(scanData);
          this.updateLastScanData(scanData);
        }

        this.dispatchEvent('vp:scan_completed', scanData);
        
      } catch (error) {
        console.warn('Scan failed:', error);
        this.dispatchEvent('vp:scan_failed', { error: error.message });
      }
    }

    /**
     * Scan for third-party scripts on the page
     */
    scanScripts() {
      const scripts = [];
      const scriptElements = document.querySelectorAll('script[src]');
      
      scriptElements.forEach(script => {
        const src = script.src;
        if (!src) return;
        
        try {
          const url = new URL(src);
          const currentDomain = window.location.hostname;
          
          // Check if it's a third-party script
          if (!this.isSameDomain(url.hostname, currentDomain)) {
            const scriptInfo = {
              src: src,
              domain: url.hostname,
              type: this.categorizeScript(url.hostname, src),
              detected_at: new Date().toISOString()
            };
            
            scripts.push(scriptInfo);
          }
        } catch (error) {
          // Invalid URL, skip
          console.warn('Invalid script URL:', src);
        }
      });

      // Also scan for inline scripts that might load external resources
      const inlineScripts = document.querySelectorAll('script:not([src])');
      inlineScripts.forEach(script => {
        const content = script.textContent || script.innerHTML;
        const externalUrls = this.extractUrlsFromScript(content);
        
        externalUrls.forEach(url => {
          try {
            const urlObj = new URL(url);
            const currentDomain = window.location.hostname;
            
            if (!this.isSameDomain(urlObj.hostname, currentDomain)) {
              scripts.push({
                src: url,
                domain: urlObj.hostname,
                type: this.categorizeScript(urlObj.hostname, url),
                detected_at: new Date().toISOString(),
                inline_reference: true
              });
            }
          } catch (error) {
            // Invalid URL, skip
          }
        });
      });

      return scripts;
    }

    /**
     * Scan for cookies on the page
     */
    scanCookies() {
      const cookies = [];
      const cookieString = document.cookie;
      
      // Scan document.cookie for HTTP cookies
      if (cookieString) {
        const cookiePairs = cookieString.split(';');
        
        cookiePairs.forEach(pair => {
          const [name, value] = pair.trim().split('=');
          if (name) {
            const cookieInfo = {
              name: name.trim(),
              domain: window.location.hostname,
              category: this.categorizeCookie(name.trim()),
              detected_at: new Date().toISOString(),
              has_value: !!value,
              storage_type: 'cookie'
            };
            
            cookies.push(cookieInfo);
          }
        });
      }

      // ALWAYS include Vision Privacy consent cookie
      // This ensures it shows in policies even before user consents
      const consentKey = this.CONSENT_KEY; // vp_consent_{siteId}
      const vpConsentCookie = {
        name: consentKey,
        domain: window.location.hostname,
        category: 'essential',
        detected_at: new Date().toISOString(),
        has_value: true,
        storage_type: 'localStorage',
        description: 'Lagrar dina cookie-preferenser för denna webbplats',
        duration: '12 månader'
      };
      
      cookies.push(vpConsentCookie);

      return cookies;
    }

    /**
     * Categorize a script based on its domain and URL
     */
    categorizeScript(domain, url) {
      const lowerDomain = domain.toLowerCase();
      const lowerUrl = url.toLowerCase();
      
      // Analytics
      if (this.matchesPatterns(lowerDomain, ['google-analytics', 'googletagmanager', 'gtag', 'analytics']) ||
          this.matchesPatterns(lowerUrl, ['analytics', 'gtag', 'ga.js', 'gtm.js'])) {
        return 'analytics';
      }
      
      // Advertising
      if (this.matchesPatterns(lowerDomain, ['doubleclick', 'googlesyndication', 'googleadservices', 'facebook.com', 'ads']) ||
          this.matchesPatterns(lowerUrl, ['ads', 'advertising', 'doubleclick'])) {
        return 'advertising';
      }
      
      // Social Media
      if (this.matchesPatterns(lowerDomain, ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok']) ||
          this.matchesPatterns(lowerUrl, ['social', 'share', 'like', 'tweet'])) {
        return 'social';
      }
      
      // Functional (CDNs, libraries, etc.)
      if (this.matchesPatterns(lowerDomain, ['cdn', 'jsdelivr', 'unpkg', 'cdnjs', 'bootstrap']) ||
          this.matchesPatterns(lowerUrl, ['jquery', 'bootstrap', 'font', 'css'])) {
        return 'functional';
      }
      
      return 'unknown';
    }

    /**
     * Categorize a cookie based on its name
     */
    categorizeCookie(cookieName) {
      const lowerName = cookieName.toLowerCase();
      
      // Analytics cookies
      if (this.matchesPatterns(lowerName, ['_ga', '_gid', '_gat', '_gtag', '_utm', 'gtm'])) {
        return 'analytics';
      }
      
      // Advertising cookies
      if (this.matchesPatterns(lowerName, ['_fbp', '_fbc', 'fr', 'ads', 'doubleclick', 'adsystem'])) {
        return 'advertising';
      }
      
      // Social media cookies
      if (this.matchesPatterns(lowerName, ['twitter', 'facebook', 'linkedin', 'instagram', 'social'])) {
        return 'social';
      }
      
      // Essential/Functional cookies
      if (this.matchesPatterns(lowerName, ['session', 'auth', 'csrf', 'preferences', 'consent', 'security'])) {
        return 'essential';
      }
      
      return 'functional';
    }

    /**
     * Check if a string matches any of the given patterns
     */
    matchesPatterns(str, patterns) {
      return patterns.some(pattern => str.includes(pattern));
    }

    /**
     * Check if two domains are the same (including subdomains)
     */
    isSameDomain(domain1, domain2) {
      // Normalize domains
      const normalize = (domain) => {
        return domain.replace(/^www\./, '').toLowerCase();
      };
      
      const norm1 = normalize(domain1);
      const norm2 = normalize(domain2);
      
      return norm1 === norm2 || norm1.endsWith('.' + norm2) || norm2.endsWith('.' + norm1);
    }

    /**
     * Extract URLs from script content
     */
    extractUrlsFromScript(scriptContent) {
      const urls = [];
      
      // Common patterns for URLs in JavaScript
      const urlPatterns = [
        /https?:\/\/[^\s"']+/g,
        /"(https?:\/\/[^"]+)"/g,
        /'(https?:\/\/[^']+)'/g
      ];
      
      urlPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Clean up the match
            const cleanUrl = match.replace(/['"]/g, '');
            if (cleanUrl.startsWith('http')) {
              urls.push(cleanUrl);
            }
          });
        }
      });
      
      return [...new Set(urls)]; // Remove duplicates
    }

    /**
     * Check if scan data contains new detections
     */
    hasNewDetections(scanData) {
      const lastScan = this.getLastScanData();
      if (!lastScan) return true; // First scan
      
      // Check for new scripts
      const newScripts = scanData.detected_scripts.filter(script => 
        !lastScan.detected_scripts.some(lastScript => 
          lastScript.src === script.src && lastScript.domain === script.domain
        )
      );
      
      // Check for new cookies
      const newCookies = scanData.detected_cookies.filter(cookie => 
        !lastScan.detected_cookies.some(lastCookie => 
          lastCookie.name === cookie.name && lastCookie.domain === cookie.domain
        )
      );
      
      return newScripts.length > 0 || newCookies.length > 0;
    }

    /**
     * Get last scan data from storage
     */
    getLastScanData() {
      try {
        const stored = localStorage.getItem(`vp_last_scan_${this.siteId}`);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.warn('Failed to load last scan data:', error);
        return null;
      }
    }

    /**
     * Update last scan data in storage
     */
    updateLastScanData(scanData) {
      try {
        localStorage.setItem(`vp_last_scan_${this.siteId}`, JSON.stringify(scanData));
      } catch (error) {
        console.warn('Failed to save scan data:', error);
      }
    }

    /**
     * Report scan results to API
     */
    async reportScan(scanData) {
      try {
        const response = await this.makeRequest('/api/scan', {
          method: 'POST',
          body: JSON.stringify(scanData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        this.dispatchEvent('vp:scan_reported', { scanData, result });
        
        return result;
        
      } catch (error) {
        console.warn('Failed to report scan:', error);
        this.dispatchEvent('vp:scan_report_failed', { scanData, error: error.message });
        throw error;
      }
    }

    /**
     * Manually trigger a scan
     */
    async triggerScan() {
      await this.performScan();
    }

    /**
     * Get current scan statistics
     */
    getScanStats() {
      const lastScan = this.getLastScanData();
      if (!lastScan) {
        return {
          last_scan: null,
          scripts_detected: 0,
          cookies_detected: 0,
          categories: {}
        };
      }

      const categories = {};
      
      // Count by category
      lastScan.detected_scripts.forEach(script => {
        categories[script.type] = (categories[script.type] || 0) + 1;
      });
      
      lastScan.detected_cookies.forEach(cookie => {
        categories[cookie.category] = (categories[cookie.category] || 0) + 1;
      });

      return {
        last_scan: lastScan.scan_timestamp,
        scripts_detected: lastScan.detected_scripts.length,
        cookies_detected: lastScan.detected_cookies.length,
        categories
      };
    }

    /**
     * Fetch policy content from API
     */
    async fetchPolicy(policyType) {
      try {
        const response = await this.makeRequest(`/api/policy/${this.siteId}/${policyType}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch policy: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.content) {
          throw new Error('Invalid policy response format');
        }

        return data.data.content;
        
      } catch (error) {
        console.error('Failed to fetch policy:', error);
        throw error;
      }
    }

    /**
     * Open policy modal
     */
    async openPolicy(policyType) {
      const modal = document.getElementById('vp-policy-modal');
      if (!modal) {
        console.warn('Policy modal not found');
        return;
      }

      // Store last focused element for accessibility
      this.lastFocusedElement = document.activeElement;
      this.currentPolicyType = policyType;

      // Show modal and update ARIA attributes
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');

      // Set title
      const title = document.getElementById('vp-policy-title');
      if (title) {
        title.textContent = policyType === 'privacy' ? 'Integritetspolicy' : 'Cookiepolicy';
      }

      // Load policy content
      await this.loadPolicyContent(policyType);

      // Trap focus for accessibility
      this.trapPolicyFocus();
    }

    /**
     * Load policy content into modal
     */
    async loadPolicyContent(policyType) {
      const loadingEl = document.getElementById('vp-policy-loading');
      const contentEl = document.getElementById('vp-policy-content');
      const errorEl = document.getElementById('vp-policy-error');

      // Batch DOM updates to minimize reflows
      const showLoading = () => {
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
      };

      const showContent = (content) => {
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) {
            contentEl.style.display = 'block';
            // Single innerHTML update instead of multiple DOM operations
            contentEl.innerHTML = content;
          }
          if (errorEl) errorEl.style.display = 'none';
        });
      };

      const showError = () => {
        requestAnimationFrame(() => {
          if (loadingEl) loadingEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'none';
          if (errorEl) errorEl.style.display = 'block';
        });
      };

      showLoading();

      try {
        const content = await this.fetchPolicy(policyType);
        showContent(content);

        // Update focus trap to include new focusable elements in content
        this.trapPolicyFocus();
        
      } catch (error) {
        console.error('Failed to load policy:', error);
        showError();

        // Update focus trap for error state
        this.trapPolicyFocus();
      }
    }

    /**
     * Close policy modal
     */
    closePolicy() {
      const modal = document.getElementById('vp-policy-modal');
      if (!modal) return;

      // Remove focus trap
      this.removePolicyFocusTrap();

      // Hide modal and update ARIA attributes
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      this.currentPolicyType = null;

      // Return focus to triggering element
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        try {
          this.lastFocusedElement.focus();
        } catch (error) {
          console.warn('Failed to return focus:', error);
        }
        this.lastFocusedElement = null;
      }
    }

    /**
     * Handle settings link click from policy modal
     */
    handlePolicySettingsLink() {
      // Store the settings link as the last focused element
      // so focus returns to it if settings modal is closed
      const settingsLink = document.activeElement;
      
      // Close policy modal
      this.closePolicy();

      // Open settings modal after a brief delay
      setTimeout(() => {
        this.showSettings();
        
        // Focus the first interactive element in settings modal
        if (this.settingsModal) {
          const firstFocusable = this.settingsModal.querySelector(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 100);
    }

    /**
     * Trap focus within policy modal for accessibility
     */
    trapPolicyFocus() {
      const modal = document.getElementById('vp-policy-modal');
      if (!modal) return;

      // Remove any existing focus trap handler
      if (this.policyFocusTrapHandler) {
        modal.removeEventListener('keydown', this.policyFocusTrapHandler);
      }

      // Get all focusable elements
      const getFocusableElements = () => {
        return modal.querySelectorAll(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
      };

      // Focus the first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Focus the close button first as it's the most common action
        const closeButton = modal.querySelector('#vp-close-policy');
        if (closeButton) {
          closeButton.focus();
        } else {
          focusableElements[0].focus();
        }
      }

      // Create focus trap handler
      this.policyFocusTrapHandler = (e) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      modal.addEventListener('keydown', this.policyFocusTrapHandler);
    }

    /**
     * Remove focus trap from policy modal
     */
    removePolicyFocusTrap() {
      const modal = document.getElementById('vp-policy-modal');
      if (modal && this.policyFocusTrapHandler) {
        modal.removeEventListener('keydown', this.policyFocusTrapHandler);
        this.policyFocusTrapHandler = null;
      }
    }

    /**
     * Setup policy modal event listeners
     */
    setupPolicyModal() {
      // Policy link clicks (both in banner and within policy content)
      const handlePolicyLinkActivation = (e, policyLink) => {
        e.preventDefault();
        const policyType = policyLink.dataset.policy;
        
        const modal = document.getElementById('vp-policy-modal');
        // Check if we're navigating within an open modal
        const isInModal = modal && modal.contains(policyLink);
        if (isInModal && modal.style.display !== 'none') {
          // Cross-policy navigation - keep modal open
          this.loadPolicyContent(policyType);
          // Update title
          const title = document.getElementById('vp-policy-title');
          if (title) {
            title.textContent = policyType === 'privacy' ? 'Integritetspolicy' : 'Cookiepolicy';
          }
          this.currentPolicyType = policyType;
        } else {
          // Opening policy from banner or other location
          this.openPolicy(policyType);
        }
      };

      document.addEventListener('click', (e) => {
        const policyLink = e.target.closest('[data-policy]');
        if (policyLink) {
          handlePolicyLinkActivation(e, policyLink);
        }
      });

      // Keyboard support for policy links
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const policyLink = e.target.closest('[data-policy]');
          if (policyLink) {
            handlePolicyLinkActivation(e, policyLink);
          }
        }
      });

      // Settings link clicks and keyboard support
      const handleSettingsLinkActivation = (e, settingsLink) => {
        const modal = document.getElementById('vp-policy-modal');
        if (settingsLink && modal && modal.style.display !== 'none') {
          e.preventDefault();
          this.handlePolicySettingsLink();
        }
      };

      document.addEventListener('click', (e) => {
        const settingsLink = e.target.closest('.vp-settings-link');
        if (settingsLink) {
          handleSettingsLinkActivation(e, settingsLink);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const settingsLink = e.target.closest('.vp-settings-link');
          if (settingsLink) {
            handleSettingsLinkActivation(e, settingsLink);
          }
        }
      });

      // Close button
      const closeBtn = document.getElementById('vp-close-policy');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closePolicy());
      }

      // Backdrop click
      const modal = document.getElementById('vp-policy-modal');
      if (modal) {
        const backdrop = modal.querySelector('.vp-modal-backdrop');
        if (backdrop) {
          backdrop.addEventListener('click', () => this.closePolicy());
        }
      }

      // Escape key
      document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('vp-policy-modal');
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
          this.closePolicy();
        }
      });
    }
  }

  /**
   * Auto-initialization when DOM is ready
   */
  function autoInit() {
    // Check if required globals are available
    if (!window.VP_SITE_ID) {
      console.error('Vision Privacy Widget: VP_SITE_ID not found');
      return;
    }

    // Initialize widget
    window.VisionPrivacy = new VisionPrivacyWidget(
      window.VP_SITE_ID,
      window.VP_API_ENDPOINT
    );

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.VisionPrivacy.init();
      });
    } else {
      // DOM already loaded
      window.VisionPrivacy.init();
    }
  }

  // Start auto-initialization
  autoInit();

})();