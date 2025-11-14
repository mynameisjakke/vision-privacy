/**
 * Vision Privacy - Floating Settings Button
 * Persistent button that allows users to change cookie preferences anytime
 */

(function() {
  'use strict';
  
  const BUTTON_ID = 'vision-privacy-floating-btn';
  
  /**
   * Get the storage key for the current site
   */
  function getStorageKey() {
    // Try to get site ID from global variable
    if (window.VP_SITE_ID) {
      return `vp_consent_${window.VP_SITE_ID}`;
    }
    // Fallback to generic key
    return 'vision-privacy-consent';
  }
  
  /**
   * Check if user has made a consent choice
   */
  function hasConsent() {
    try {
      const storageKey = getStorageKey();
      return localStorage.getItem(storageKey) !== null;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check if banner is currently visible
   */
  function isBannerVisible() {
    // Check for various banner selectors
    const bannerSelectors = [
      '.vision-privacy-banner',
      '#vp-banner',
      '[id^="vp-banner"]',
      '.vp-banner'
    ];
    
    for (const selector of bannerSelectors) {
      const banner = document.querySelector(selector);
      if (banner && banner.offsetParent !== null) {
        // Element is visible (has layout)
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Create and inject the floating button
   */
  function createFloatingButton() {
    // Don't create if user hasn't made a choice yet
    if (!hasConsent()) {
      return;
    }
    
    // Don't create if button already exists
    if (document.getElementById(BUTTON_ID)) {
      return;
    }
    
    // Create button element
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.className = 'vision-privacy-floating-btn';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', 'Ändra cookie-inställningar');
    button.setAttribute('title', 'Ändra cookie-inställningar');
    
    // Button content
    button.innerHTML = `
      <span class="floating-btn-icon" aria-hidden="true">🍪</span>
      <span class="floating-btn-text">Cookie-inställningar</span>
    `;
    
    // Add click handler
    button.addEventListener('click', handleButtonClick);
    
    // Add to page
    document.body.appendChild(button);
    
    // Hide button if banner is visible
    updateButtonVisibility();
  }
  
  /**
   * Handle button click - show settings modal
   */
  function handleButtonClick() {
    // Try to use the global VisionPrivacy API if available
    if (window.VisionPrivacy && typeof window.VisionPrivacy.showSettings === 'function') {
      window.VisionPrivacy.showSettings();
      return;
    }
    
    // Fallback: trigger customize action
    const customizeBtn = document.querySelector('[data-action="customize"]');
    if (customizeBtn) {
      customizeBtn.click();
      return;
    }
    
    // Last resort: show the banner again
    showBanner();
  }
  
  /**
   * Show the cookie banner
   */
  function showBanner() {
    const banner = document.querySelector('.vision-privacy-banner');
    if (banner) {
      banner.style.display = 'block';
      updateButtonVisibility();
    }
  }
  
  /**
   * Update button visibility based on banner state
   */
  function updateButtonVisibility() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    
    if (isBannerVisible()) {
      button.style.display = 'none';
    } else {
      button.style.display = 'flex';
    }
  }
  
  /**
   * Remove the floating button
   */
  function removeFloatingButton() {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.remove();
    }
  }
  
  /**
   * Initialize the floating button
   */
  function init() {
    // Create button when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
      createFloatingButton();
    }
    
    // Watch for banner visibility changes and DOM mutations
    const observer = new MutationObserver(function(mutations) {
      updateButtonVisibility();
    });
    
    // Start observing when DOM is ready
    const startObserving = function() {
      // Observe the entire body for banner additions/removals
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
    
    // Listen for consent changes
    window.addEventListener('storage', function(e) {
      const storageKey = getStorageKey();
      if (e.key === storageKey) {
        if (e.newValue) {
          createFloatingButton();
        } else {
          removeFloatingButton();
        }
      }
    });
    
    // Listen for custom events from the widget
    window.addEventListener('visionPrivacyConsentSaved', function() {
      createFloatingButton();
    });
    
    window.addEventListener('visionPrivacyConsentCleared', function() {
      removeFloatingButton();
    });
    
    // Listen for widget events (new event names)
    window.addEventListener('vp:consent_saved', function() {
      createFloatingButton();
    });
    
    window.addEventListener('vp:banner_shown', function() {
      updateButtonVisibility();
    });
    
    window.addEventListener('vp:banner_hidden', function() {
      updateButtonVisibility();
    });
  }
  
  // Expose API for external use
  window.VisionPrivacyFloatingButton = {
    show: createFloatingButton,
    hide: removeFloatingButton,
    toggle: function() {
      const button = document.getElementById(BUTTON_ID);
      if (button) {
        removeFloatingButton();
      } else {
        createFloatingButton();
      }
    }
  };
  
  // Initialize
  init();
  
})();