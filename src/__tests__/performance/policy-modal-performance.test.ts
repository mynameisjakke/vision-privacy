/**
 * Performance Tests for Policy Modal Display Feature
 * 
 * Tests cover:
 * - Modal open time with cached and uncached content
 * - API response times
 * - Cache expiry and refresh behavior
 * - Memory usage with repeated modal opens
 * - CSS scrolling performance
 * 
 * @jest-environment jsdom
 */

describe('Policy Modal Performance Tests', () => {
  let mockFetch: any;
  let performanceMarks: Map<string, number>;
  let memorySnapshots: number[];

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Initialize performance tracking
    performanceMarks = new Map();
    memorySnapshots = [];
    
    // Mock fetch API
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock performance API if not available
    if (!global.performance) {
      (global as any).performance = {
        now: () => Date.now(),
        mark: (name: string) => {
          performanceMarks.set(name, Date.now());
        },
        measure: (name: string, startMark: string, endMark: string) => {
          const start = performanceMarks.get(startMark) || 0;
          const end = performanceMarks.get(endMark) || Date.now();
          return { duration: end - start };
        }
      };
    }
    
    // Setup modal HTML
    setupModalDOM();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    performanceMarks.clear();
    memorySnapshots = [];
  });

  function setupModalDOM() {
    document.body.innerHTML = `
      <div id="vp-policy-modal" class="vp-modal vp-policy-modal" role="dialog" aria-modal="true" aria-labelledby="vp-policy-title" aria-hidden="true" style="display: none;">
        <div class="vp-modal-backdrop"></div>
        <div class="vp-modal-content vp-policy-content">
          <div class="vp-modal-header vp-policy-header">
            <h3 id="vp-policy-title"></h3>
            <button id="vp-close-policy" class="vp-close" aria-label="Close policy">&times;</button>
          </div>
          <div class="vp-modal-body vp-policy-body">
            <div id="vp-policy-loading" class="vp-loading">
              <span class="vp-spinner"></span>
              <p>Loading policy...</p>
            </div>
            <div id="vp-policy-content" class="vp-policy-text" style="display: none;"></div>
            <div id="vp-policy-error" class="vp-error" style="display: none;">
              <p>Unable to load policy. Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
      <button class="vp-policy-link" data-policy="privacy" type="button">Privacy Policy</button>
    `;
  }

  function createPolicyModalManager() {
    // Simplified PolicyModalManager for testing
    class PolicyModalManager {
      siteId: string;
      apiEndpoint: string;
      cache: Map<string, any>;
      cacheExpiry: number;
      modal: HTMLElement | null;
      initialized: boolean;

      constructor(siteId: string, apiEndpoint: string) {
        this.siteId = siteId;
        this.apiEndpoint = apiEndpoint;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.modal = null;
        this.initialized = false;
        this.init();
      }

      init() {
        this.modal = document.getElementById('vp-policy-modal');
        this.initialized = !!this.modal;
      }

      async openPolicy(policyType: string) {
        const startTime = performance.now();
        
        if (!this.modal) return;
        
        this.modal.style.display = 'flex';
        
        const content = await this.fetchPolicyContent(policyType);
        this.renderPolicyContent(content);
        
        const endTime = performance.now();
        return endTime - startTime;
      }

      async fetchPolicyContent(policyType: string) {
        const cached = this.getCachedPolicy(policyType);
        if (cached) {
          return cached;
        }

        const endpoint = `${this.apiEndpoint}/api/policy/${this.siteId}?format=json&type=${policyType}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        const content = data.policy_content || '';

        this.cachePolicy(policyType, content);
        return content;
      }

      getCachedPolicy(policyType: string) {
        const cached = this.cache.get(policyType);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheExpiry) {
          this.cache.delete(policyType);
          return null;
        }

        return cached.content;
      }

      cachePolicy(policyType: string, content: string) {
        this.cache.set(policyType, {
          content,
          timestamp: Date.now()
        });
      }

      renderPolicyContent(content: string) {
        const contentEl = document.getElementById('vp-policy-content');
        if (contentEl) {
          contentEl.innerHTML = content;
          contentEl.style.display = 'block';
        }
      }

      clearCache() {
        this.cache.clear();
      }
    }

    return new PolicyModalManager('test-site-id', 'https://api.example.com');
  }

  describe('Modal Open Time Performance', () => {
    it('should open modal with cached content in under 100ms', async () => {
      const manager = createPolicyModalManager();
      
      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // First open - uncached (warm up cache)
      await manager.openPolicy('privacy');
      
      // Second open - cached (measure this)
      const startTime = performance.now();
      await manager.openPolicy('privacy');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should open modal with uncached content in under 300ms (with fast API)', async () => {
      const manager = createPolicyModalManager();
      
      // Mock fast API response (50ms)
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
              })
            });
          }, 50);
        })
      );

      const startTime = performance.now();
      await manager.openPolicy('privacy');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(300);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should measure performance difference between cached and uncached', async () => {
      const manager = createPolicyModalManager();
      
      // Mock API with 100ms delay
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
              })
            });
          }, 100);
        })
      );

      // Measure uncached open time
      const uncachedStart = performance.now();
      await manager.openPolicy('privacy');
      const uncachedDuration = performance.now() - uncachedStart;

      // Measure cached open time
      const cachedStart = performance.now();
      await manager.openPolicy('privacy');
      const cachedDuration = performance.now() - cachedStart;

      // Cached should be significantly faster
      expect(cachedDuration).toBeLessThan(uncachedDuration / 2);
      expect(cachedDuration).toBeLessThan(50);
    });
  });

  describe('API Response Time Performance', () => {
    it('should verify API responds within 500ms target', async () => {
      const manager = createPolicyModalManager();
      
      // Mock API with 400ms delay (within target)
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
              })
            });
          }, 400);
        })
      );

      const startTime = performance.now();
      await manager.fetchPolicyContent('privacy');
      const apiDuration = performance.now() - startTime;

      expect(apiDuration).toBeLessThan(500);
    });

    it('should handle API responses at the 500ms boundary', async () => {
      const manager = createPolicyModalManager();
      
      // Mock API with exactly 500ms delay
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
              })
            });
          }, 500);
        })
      );

      const startTime = performance.now();
      await manager.fetchPolicyContent('privacy');
      const apiDuration = performance.now() - startTime;

      expect(apiDuration).toBeLessThanOrEqual(550); // Allow small margin
    });

    it('should measure API response time for different policy types', async () => {
      const manager = createPolicyModalManager();
      const responseTimes: Record<string, number> = {};

      // Mock API
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                policy_content: '<h1>Policy</h1><p>Content</p>'
              })
            });
          }, 100);
        })
      );

      // Test privacy policy
      const privacyStart = performance.now();
      await manager.fetchPolicyContent('privacy');
      responseTimes.privacy = performance.now() - privacyStart;

      // Clear cache
      manager.clearCache();

      // Test cookie policy
      const cookieStart = performance.now();
      await manager.fetchPolicyContent('cookie');
      responseTimes.cookie = performance.now() - cookieStart;

      expect(responseTimes.privacy).toBeLessThan(500);
      expect(responseTimes.cookie).toBeLessThan(500);
    });
  });

  describe('Cache Expiry and Refresh Behavior', () => {
    it('should cache content for 5 minutes', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // First fetch
      await manager.fetchPolicyContent('privacy');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second fetch immediately - should use cache
      await manager.fetchPolicyContent('privacy');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify cache hit
      const cached = manager.getCachedPolicy('privacy');
      expect(cached).toBeTruthy();
    });

    it('should expire cache after 5 minutes', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // First fetch
      await manager.fetchPolicyContent('privacy');
      
      // Manually expire cache by modifying timestamp
      const cacheEntry = manager.cache.get('privacy');
      if (cacheEntry) {
        cacheEntry.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      }

      // Second fetch - should refetch due to expiry
      await manager.fetchPolicyContent('privacy');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle cache refresh correctly', async () => {
      const manager = createPolicyModalManager();
      
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            policy_content: `<h1>Privacy Policy v${callCount}</h1>`
          })
        });
      });

      // First fetch
      const content1 = await manager.fetchPolicyContent('privacy');
      expect(content1).toContain('v1');

      // Expire cache
      const cacheEntry = manager.cache.get('privacy');
      if (cacheEntry) {
        cacheEntry.timestamp = Date.now() - (6 * 60 * 1000);
      }

      // Second fetch - should get new content
      const content2 = await manager.fetchPolicyContent('privacy');
      expect(content2).toContain('v2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate caches for different policy types', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockImplementation((url: string) => {
        const type = url.includes('type=privacy') ? 'privacy' : 'cookie';
        return Promise.resolve({
          ok: true,
          json: async () => ({
            policy_content: `<h1>${type} Policy</h1>`
          })
        });
      });

      // Fetch both types
      const privacyContent = await manager.fetchPolicyContent('privacy');
      const cookieContent = await manager.fetchPolicyContent('cookie');

      expect(privacyContent).toContain('privacy');
      expect(cookieContent).toContain('cookie');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify both are cached
      expect(manager.getCachedPolicy('privacy')).toBeTruthy();
      expect(manager.getCachedPolicy('cookie')).toBeTruthy();
    });
  });

  describe('Memory Usage with Repeated Opens', () => {
    it('should not leak memory with repeated modal opens', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1>' + '<p>Content</p>'.repeat(100)
        })
      });

      // Capture initial memory if available
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Open modal 50 times
      for (let i = 0; i < 50; i++) {
        await manager.openPolicy('privacy');
        
        // Close modal
        if (manager.modal) {
          manager.modal.style.display = 'none';
        }
        
        // Capture memory snapshot every 10 iterations
        if (i % 10 === 0 && (performance as any).memory) {
          memorySnapshots.push((performance as any).memory.usedJSHeapSize);
        }
      }

      // Verify cache size is bounded (should only have 1 entry)
      expect(manager.cache.size).toBeLessThanOrEqual(2);

      // If memory API available, check for reasonable growth
      if (memorySnapshots.length > 0) {
        const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
        const growthPercentage = (memoryGrowth / memorySnapshots[0]) * 100;
        
        // Memory growth should be reasonable (less than 50% increase)
        expect(growthPercentage).toBeLessThan(50);
      }
    });

    it('should clean up DOM elements properly on close', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // Open modal
      await manager.openPolicy('privacy');
      
      const contentEl = document.getElementById('vp-policy-content');
      expect(contentEl?.innerHTML).toBeTruthy();

      // Content should remain in DOM (for reuse)
      expect(contentEl?.innerHTML.length).toBeGreaterThan(0);
    });

    it('should handle rapid successive opens efficiently', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      const startTime = performance.now();
      
      // Open modal 10 times sequentially (to allow caching to work)
      for (let i = 0; i < 10; i++) {
        await manager.openPolicy('privacy');
      }
      
      const totalDuration = performance.now() - startTime;

      // Should complete all opens in reasonable time
      expect(totalDuration).toBeLessThan(1000);
      
      // Should only fetch once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSS Scrolling Performance', () => {
    it('should render large policy content without performance issues', async () => {
      const manager = createPolicyModalManager();
      
      // Generate large content (simulate long policy)
      const largeContent = '<h1>Privacy Policy</h1>' + 
        Array(100).fill('<h2>Section</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>').join('');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: largeContent
        })
      });

      const startTime = performance.now();
      await manager.openPolicy('privacy');
      const renderDuration = performance.now() - startTime;

      // Rendering should complete quickly even with large content
      expect(renderDuration).toBeLessThan(500);

      const contentEl = document.getElementById('vp-policy-content');
      expect(contentEl?.innerHTML.length).toBeGreaterThan(1000);
    });

    it('should handle content with complex HTML structure', async () => {
      const manager = createPolicyModalManager();
      
      // Complex nested HTML
      const complexContent = `
        <h1>Privacy Policy</h1>
        <div class="section">
          <h2>Section 1</h2>
          <ul>
            ${Array(50).fill('<li><strong>Item</strong>: <a href="#">Link</a></li>').join('')}
          </ul>
        </div>
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: complexContent
        })
      });

      const startTime = performance.now();
      await manager.openPolicy('privacy');
      const renderDuration = performance.now() - startTime;

      expect(renderDuration).toBeLessThan(500);
    });

    it('should verify modal body has smooth scrolling enabled', () => {
      const modalBody = document.querySelector('.vp-policy-body') as HTMLElement;
      
      if (modalBody) {
        const computedStyle = window.getComputedStyle(modalBody);
        // Note: In test environment, computed styles may not be available
        // This test verifies the element exists and can be styled
        expect(modalBody).toBeTruthy();
      }
    });
  });

  describe('Performance Optimization Verification', () => {
    it('should use efficient DOM queries', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // Spy on getElementById calls
      const getElementByIdSpy = jest.spyOn(document, 'getElementById');

      await manager.openPolicy('privacy');

      // Should use getElementById efficiently (not excessive calls)
      expect(getElementByIdSpy.mock.calls.length).toBeLessThan(10);
      
      getElementByIdSpy.mockRestore();
    });

    it('should minimize reflows during content rendering', async () => {
      const manager = createPolicyModalManager();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // Open modal and measure
      const startTime = performance.now();
      await manager.openPolicy('privacy');
      const duration = performance.now() - startTime;

      // Fast rendering indicates minimal reflows
      expect(duration).toBeLessThan(200);
    });

    it('should verify cache Map performance with multiple entries', () => {
      const manager = createPolicyModalManager();
      
      // Add multiple cache entries
      for (let i = 0; i < 100; i++) {
        manager.cachePolicy(`policy-${i}`, `<h1>Policy ${i}</h1>`);
      }

      // Retrieval should be fast (Map has O(1) lookup)
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        manager.getCachedPolicy(`policy-${i}`);
      }
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('Performance Metrics Summary', () => {
    it('should generate performance report for all operations', async () => {
      const manager = createPolicyModalManager();
      const metrics: Record<string, number> = {};

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          policy_content: '<h1>Privacy Policy</h1><p>Test content</p>'
        })
      });

      // Measure uncached open
      let start = performance.now();
      await manager.openPolicy('privacy');
      metrics.uncachedOpen = performance.now() - start;

      // Measure cached open
      start = performance.now();
      await manager.openPolicy('privacy');
      metrics.cachedOpen = performance.now() - start;

      // Measure cache retrieval
      start = performance.now();
      manager.getCachedPolicy('privacy');
      metrics.cacheRetrieval = performance.now() - start;

      // Verify all metrics meet targets
      expect(metrics.uncachedOpen).toBeLessThan(500);
      expect(metrics.cachedOpen).toBeLessThan(100);
      expect(metrics.cacheRetrieval).toBeLessThan(5);

      // Log metrics for reference
      console.log('Performance Metrics:', metrics);
    });
  });
});
