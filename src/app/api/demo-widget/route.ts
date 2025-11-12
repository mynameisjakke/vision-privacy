import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'

/**
 * Demo widget endpoint that returns mock data for testing
 * This bypasses database requirements for demo purposes
 */
export async function GET(request: NextRequest) {
  try {
    // Return mock widget configuration for demo
    const mockWidgetConfig: any = {
      banner_html: `
        <div class="vision-privacy-banner" style="
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid #ddd;
          padding: 1rem;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="flex: 1; min-width: 300px;">
              <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 600;">🍪 Vi värnar om din integritet</h3>
              <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.4;">
                Vi använder cookies för att ge dig den bästa upplevelsen på vår webbplats. 
                Genom att klicka på "Acceptera alla" godkänner du vår användning av cookies.
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button 
                data-action="accept-all" 
                style="
                  background: #007cba; 
                  color: white; 
                  border: none; 
                  padding: 0.75rem 1.5rem; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 0.9rem;
                  font-weight: 500;
                "
              >
                Acceptera alla
              </button>
              <button 
                data-action="reject-all" 
                style="
                  background: #f0f0f0; 
                  color: #333; 
                  border: 1px solid #ddd; 
                  padding: 0.75rem 1.5rem; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 0.9rem;
                "
              >
                Avvisa alla
              </button>
              <button 
                data-action="customize" 
                style="
                  background: transparent; 
                  color: #007cba; 
                  border: 1px solid #007cba; 
                  padding: 0.75rem 1.5rem; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 0.9rem;
                "
              >
                Anpassa
              </button>
            </div>
          </div>
        </div>
      `,
      banner_css: `
        .vision-privacy-banner button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .vision-privacy-banner button[data-action="accept-all"]:hover {
          background: #005a87;
        }
        
        .vision-privacy-banner button[data-action="reject-all"]:hover {
          background: #e0e0e0;
        }
        
        .vision-privacy-banner button[data-action="customize"]:hover {
          background: #f0f8ff;
        }
        
        @media (max-width: 768px) {
          .vision-privacy-banner > div {
            flex-direction: column;
            text-align: center;
          }
          
          .vision-privacy-banner button {
            flex: 1;
            min-width: 120px;
          }
        }
      `,
      cookie_categories: [
        {
          id: 'essential',
          name: 'Nödvändiga',
          description: 'Nödvändiga cookies för grundläggande webbplatsfunktionalitet. Dessa kan inte stängas av.',
          is_essential: true,
          sort_order: 1,
          is_active: true
        },
        {
          id: 'functional',
          name: 'Funktionella',
          description: 'Cookies som förbättrar webbplatsfunktionalitet och personalisering.',
          is_essential: false,
          sort_order: 2,
          is_active: true
        },
        {
          id: 'analytics',
          name: 'Analys',
          description: 'Cookies för webbplatsanalys och prestandaövervakning.',
          is_essential: false,
          sort_order: 3,
          is_active: true
        },
        {
          id: 'advertising',
          name: 'Marknadsföring',
          description: 'Cookies som används för reklam och marknadsföring.',
          is_essential: false,
          sort_order: 4,
          is_active: true
        }
      ],
      privacy_policy_url: '/privacy-policy',
      consent_endpoint: '/api/demo-consent'
    }

    // Add floating button assets
    mockWidgetConfig.floating_button_js = getFloatingButtonJs()
    mockWidgetConfig.floating_button_css = getFloatingButtonCss()

    return createSuccessResponse(mockWidgetConfig)

  } catch (error) {
    console.error('Demo widget error:', error)
    return createSuccessResponse({
      error: 'Failed to load demo widget',
      banner_html: '<div>Demo widget failed to load</div>',
      banner_css: '',
      cookie_categories: [],
      privacy_policy_url: '',
      consent_endpoint: ''
    }, 500)
  }
}


function getFloatingButtonJs(): string {
  return `
(function() {
  'use strict';
  const STORAGE_KEY = 'vision-privacy-consent';
  const BUTTON_ID = 'vision-privacy-floating-btn';
  
  function hasConsent() {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch (e) { return false; }
  }
  
  function isBannerVisible() {
    const banner = document.querySelector('.vision-privacy-banner');
    return banner && banner.style.display !== 'none';
  }
  
  function createFloatingButton() {
    console.log('🔍 Checking floating button conditions:', {
      hasConsent: hasConsent(),
      buttonExists: !!document.getElementById(BUTTON_ID),
      bannerVisible: isBannerVisible()
    });
    
    if (!hasConsent()) {
      console.log('⏸️ No consent yet, button will not appear');
      return;
    }
    
    const existingButton = document.getElementById(BUTTON_ID);
    if (existingButton) {
      console.log('✅ Button already exists, updating visibility');
      // Button exists, just make sure it's visible
      existingButton.style.display = isBannerVisible() ? 'none' : 'flex';
      console.log('👁️ Button display set to:', existingButton.style.display);
      return;
    }
    
    console.log('🎉 Creating floating button!');
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.className = 'vision-privacy-floating-btn';
    button.setAttribute('aria-label', 'Ändra cookie-inställningar');
    button.innerHTML = '<span class="floating-btn-icon">🍪</span><span class="floating-btn-text">Cookie-inställningar</span>';
    
    // Explicitly set display to flex
    button.style.display = 'flex';
    
    button.addEventListener('click', function() {
      console.log('🖱️ Floating button clicked');
      const customizeBtn = document.querySelector('[data-action="customize"]');
      if (customizeBtn) {
        customizeBtn.click();
      } else {
        console.warn('Customize button not found');
      }
    });
    
    document.body.appendChild(button);
    console.log('✅ Floating button added to page with display: flex');
    
    // Update visibility based on banner state
    updateButtonVisibility();
  }
  
  function removeFloatingButton() {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.remove();
      console.log('🗑️ Floating button removed');
    }
  }
  
  function updateButtonVisibility() {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      const shouldShow = !isBannerVisible();
      button.style.display = shouldShow ? 'flex' : 'none';
      console.log('👁️ Button visibility updated:', shouldShow ? 'VISIBLE' : 'HIDDEN', {
        bannerVisible: isBannerVisible(),
        buttonDisplay: button.style.display
      });
    }
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
  
  // Watch for storage changes (from other tabs)
  window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
      if (e.newValue) {
        createFloatingButton();
      } else {
        removeFloatingButton();
      }
    }
  });
  
  // Expose API for programmatic control
  window.VisionPrivacyFloatingButton = {
    show: createFloatingButton,
    hide: removeFloatingButton
  };
  
  console.log('✅ Floating button script initialized');
})();
  `
}

function getFloatingButtonCss(): string {
  return `
.vision-privacy-floating-btn {
  position: fixed; bottom: 20px; right: 20px; z-index: 999998;
  display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; border: none; border-radius: 50px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: all 0.3s ease; animation: slideIn 0.5s ease-out;
}
@keyframes slideIn { from { transform: translateX(150px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.vision-privacy-floating-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5); }
.floating-btn-icon { font-size: 1.5rem; animation: wiggle 2s infinite; }
@keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
@media (max-width: 768px) {
  .vision-privacy-floating-btn { padding: 1rem; border-radius: 50%; width: 60px; height: 60px; justify-content: center; }
  .floating-btn-text { display: none; }
  .floating-btn-icon { font-size: 1.75rem; }
}
  `
}