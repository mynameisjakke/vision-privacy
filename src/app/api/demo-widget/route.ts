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
        <div class="vision-privacy-banner vp-banner">
          <div class="vp-banner-container">
            <div class="vp-banner-icon">
              🍪
            </div>
            <div class="vp-banner-text">
              <p>Genom att klicka på "Acceptera" godkänner du lagring av cookies på din enhet. <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button> • <button class="vp-policy-link" data-policy="cookie" type="button">Cookiepolicy</button></p>
            </div>
            <div class="vp-banner-actions">
              <button data-action="customize" class="vp-btn vp-btn-icon" aria-label="Cookie-inställningar" title="Cookie-inställningar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.43 10.98C17.47 10.66 17.5 10.34 17.5 10C17.5 9.66 17.47 9.34 17.43 9.02L19.54 7.37C19.73 7.22 19.78 6.95 19.66 6.73L17.66 3.27C17.54 3.05 17.27 2.97 17.05 3.05L14.56 4.05C14.04 3.65 13.48 3.32 12.87 3.07L12.49 0.42C12.46 0.18 12.25 0 12 0H8C7.75 0 7.54 0.18 7.51 0.42L7.13 3.07C6.52 3.32 5.96 3.66 5.44 4.05L2.95 3.05C2.72 2.96 2.46 3.05 2.34 3.27L0.34 6.73C0.21 6.95 0.27 7.22 0.46 7.37L2.57 9.02C2.53 9.34 2.5 9.67 2.5 10C2.5 10.33 2.53 10.66 2.57 10.98L0.46 12.63C0.27 12.78 0.22 13.05 0.34 13.27L2.34 16.73C2.46 16.95 2.73 17.03 2.95 16.95L5.44 15.95C5.96 16.35 6.52 16.68 7.13 16.93L7.51 19.58C7.54 19.82 7.75 20 8 20H12C12.25 20 12.46 19.82 12.49 19.58L12.87 16.93C13.48 16.68 14.04 16.34 14.56 15.95L17.05 16.95C17.28 17.04 17.54 16.95 17.66 16.73L19.66 13.27C19.78 13.05 19.73 12.78 19.54 12.63L17.43 10.98ZM10 13.5C8.07 13.5 6.5 11.93 6.5 10C6.5 8.07 8.07 6.5 10 6.5C11.93 6.5 13.5 8.07 13.5 10C13.5 11.93 11.93 13.5 10 13.5Z" fill="currentColor"/>
                </svg>
              </button>
              <button data-action="reject-all" class="vp-btn vp-btn-secondary">Avvisa</button>
              <button data-action="accept-all" class="vp-btn vp-btn-primary">Acceptera</button>
            </div>
          </div>
        </div>
      `,
      banner_css: `
        /* Banner Container - Floating Design */
        .vp-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 1200px;
          width: calc(100% - 48px);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          animation: vp-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes vp-slide-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .vp-banner.vp-banner-hiding {
          animation: vp-slide-down 0.3s cubic-bezier(0.7, 0, 0.84, 0);
          animation-fill-mode: forwards;
        }
        
        @keyframes vp-slide-down {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
        }
        
        .vp-banner-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        /* Cookie Icon */
        .vp-banner-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: vp-cookie-wiggle 2s ease-in-out infinite;
        }
        
        @keyframes vp-cookie-wiggle {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-10deg); }
          20%, 40% { transform: rotate(10deg); }
          50%, 60%, 70%, 80%, 90% { transform: rotate(0deg); }
        }
        
        /* Banner Text */
        .vp-banner-text {
          flex: 1;
          min-width: 0;
        }
        
        .vp-banner-text p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }
        
        /* Policy Links in Text */
        .vp-policy-link {
          background: none;
          border: none;
          color: #666;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          font-family: inherit;
          line-height: inherit;
          transition: color 0.2s ease;
        }
        
        .vp-policy-link:hover {
          color: #000;
        }
        
        .vp-policy-link:focus {
          outline: 2px solid #000;
          outline-offset: 2px;
          border-radius: 2px;
        }
        
        /* Banner Actions */
        .vp-banner-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        
        /* Button Styles */
        .vp-btn {
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        
        .vp-btn:focus {
          outline: 2px solid #000;
          outline-offset: 2px;
        }
        
        /* Settings Icon Button */
        .vp-btn-icon {
          width: 40px;
          height: 40px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          color: #666;
        }
        
        .vp-btn-icon:hover {
          background: #e8e8e8;
          color: #000;
          transform: rotate(45deg);
        }
        
        .vp-btn-icon:active {
          transform: rotate(45deg) scale(0.95);
        }
        
        /* Secondary Button (Reject) */
        .vp-btn-secondary {
          padding: 10px 20px;
          background: #ffffff;
          color: #333;
          border: 1px solid #e0e0e0;
        }
        
        .vp-btn-secondary:hover {
          background: #f5f5f5;
          border-color: #d0d0d0;
        }
        
        .vp-btn-secondary:active {
          transform: scale(0.98);
        }
        
        /* Primary Button (Accept) */
        .vp-btn-primary {
          padding: 10px 24px;
          background: #000000;
          color: #ffffff;
        }
        
        .vp-btn-primary:hover {
          background: #333333;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .vp-btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .vp-banner {
            bottom: 16px;
            width: calc(100% - 32px);
          }
          
          .vp-banner-container {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 12px;
          }
          
          .vp-banner-icon {
            display: none;
          }
          
          .vp-banner-text p {
            font-size: 13px;
            text-align: center;
          }
          
          .vp-banner-actions {
            flex-direction: row;
            justify-content: center;
            gap: 8px;
          }
          
          .vp-btn-secondary,
          .vp-btn-primary {
            flex: 1;
            padding: 12px 16px;
          }
          
          .vp-btn-icon {
            width: 36px;
            height: 36px;
            flex-shrink: 0;
          }
        }
        
        @media (max-width: 480px) {
          .vp-banner {
            bottom: 12px;
            width: calc(100% - 24px);
          }
          
          .vp-banner-container {
            padding: 12px;
          }
          
          .vp-banner-text p {
            font-size: 12px;
          }
          
          .vp-btn-secondary,
          .vp-btn-primary {
            font-size: 13px;
            padding: 10px 12px;
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
    mockWidgetConfig.floating_button_js = getFloatingButtonJs() + '\n\n' + getPolicyModalJs()
    mockWidgetConfig.floating_button_css = getFloatingButtonCss()
    
    // Add policy modal CSS to banner CSS
    mockWidgetConfig.banner_css += '\n\n' + getPolicyModalCss()
    
    // Add policy modal HTML to banner HTML
    mockWidgetConfig.banner_html += '\n\n' + getPolicyModalHtml()

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
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 999998;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  background: #ffffff;
  color: #666;
  border: none;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInFromLeft 0.5s ease-out;
}

@keyframes slideInFromLeft {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.vision-privacy-floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #f8f8f8;
}

.vision-privacy-floating-btn:active {
  transform: translateY(0);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.vision-privacy-floating-btn:focus {
  outline: 3px solid #000;
  outline-offset: 3px;
}

.floating-btn-icon {
  font-size: 28px;
  line-height: 1;
  animation: vp-cookie-wiggle 2s ease-in-out infinite;
}

@keyframes vp-cookie-wiggle {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
  50%, 60%, 70%, 80%, 90% { transform: rotate(0deg); }
}

.floating-btn-text {
  display: none;
}

@media (max-width: 768px) {
  .vision-privacy-floating-btn {
    bottom: 16px;
    left: 16px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
  .floating-btn-icon { font-size: 24px; }
}

@media (max-width: 480px) {
  .vision-privacy-floating-btn {
    bottom: 12px;
    left: 12px;
    width: 44px;
    height: 44px;
  }
  .floating-btn-icon { font-size: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .vision-privacy-floating-btn { animation: none; transition: none; }
  .floating-btn-icon { animation: none; }
  .vision-privacy-floating-btn:hover { transform: none; }
}

@media print {
  .vision-privacy-floating-btn { display: none !important; }
}
  `
}

function getPolicyModalHtml(): string {
  return `
    <div id="vp-policy-modal" class="vp-modal vp-policy-modal" role="dialog" aria-modal="true" aria-labelledby="vp-policy-title" aria-describedby="vp-policy-content" aria-hidden="true" style="display: none;">
      <div class="vp-modal-backdrop"></div>
      <div class="vp-modal-content">
        <div class="vp-modal-header">
          <h3 id="vp-policy-title"></h3>
          <button id="vp-close-policy" class="vp-close" aria-label="Stäng policy">&times;</button>
        </div>
        <div class="vp-modal-body">
          <div id="vp-policy-loading" class="vp-loading" role="status" aria-live="polite">
            <span class="vp-spinner"></span>
            <p>Laddar policy...</p>
          </div>
          <div id="vp-policy-content" class="vp-policy-text" style="display: none;"></div>
          <div id="vp-policy-error" class="vp-error" style="display: none;" role="alert" aria-live="assertive">
            <p>Det gick inte att ladda policyn. Försök igen senare.</p>
          </div>
          <div class="vp-branding">
            <a href="https://visionmedia.io" target="_blank" rel="noopener noreferrer">Drivs av Vision Media</a>
          </div>
        </div>
      </div>
    </div>
  `
}

function getPolicyModalCss(): string {
  return `
    /* Policy Modal - Inherits base modal styles, only adds specific overrides */
    .vp-policy-modal .vp-modal-content {
      max-width: 800px;
    }
    
    .vp-policy-modal .vp-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }
    
    /* Policy content styling */
    .vp-policy-text {
      color: #333;
      line-height: 1.6;
    }
    
    .vp-policy-text h1 {
      font-size: 24px;
      margin: 0 0 20px 0;
      font-weight: 600;
      color: #000;
    }
    
    .vp-policy-text h2 {
      font-size: 18px;
      margin: 30px 0 15px 0;
      font-weight: 600;
      color: #000;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 12px;
    }
    
    .vp-policy-text h3 {
      font-size: 16px;
      margin: 20px 0 10px 0;
      font-weight: 600;
      color: #333;
    }
    
    .vp-policy-text p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #666;
    }
    
    .vp-policy-text ul, .vp-policy-text ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
      color: #666;
    }
    
    .vp-policy-text li {
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    /* Settings link styling */
    .vp-settings-link {
      background: none;
      border: none;
      color: #0066cc;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
      transition: color 0.2s ease;
    }
    
    .vp-settings-link:hover {
      color: #004499;
    }
    
    .vp-settings-link:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Cross-policy link styling within content */
    .vp-policy-text .vp-policy-link {
      background: none;
      border: none;
      color: #0066cc;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
      transition: color 0.2s ease;
    }
    
    .vp-policy-text .vp-policy-link:hover {
      color: #004499;
    }
    
    .vp-policy-text .vp-policy-link:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    /* Loading state */
    .vp-loading {
      text-align: center;
      padding: 60px 20px;
    }
    
    .vp-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #000;
      border-radius: 50%;
      animation: vp-spin 1s linear infinite;
      margin-bottom: 15px;
    }
    
    @keyframes vp-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .vp-loading p {
      color: #666;
      font-size: 14px;
      margin: 0;
    }
    
    /* Error state */
    .vp-error {
      text-align: center;
      padding: 60px 20px;
      color: #d32f2f;
    }
    
    /* Base modal styles (shared with settings modal) */
    .vp-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
      animation: vp-fade-in 0.2s ease-out;
    }
    
    /* Policy modal needs higher z-index to appear above settings modal */
    .vp-policy-modal {
      z-index: 1000001 !important;
    }
    
    @keyframes vp-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .vp-modal-content {
      background: #ffffff;
      border-radius: 16px;
      max-width: 600px;
      width: calc(100% - 32px);
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      animation: vp-modal-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    @keyframes vp-modal-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .vp-modal-header {
      padding: 24px 24px 20px 24px;
      border-bottom: 1px solid #f0f0f0;
      position: relative;
      flex-shrink: 0;
    }
    
    .vp-modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #000;
      text-align: center;
      padding-right: 30px;
    }
    
    .vp-close {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 4px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .vp-close:hover {
      background: #f5f5f5;
      color: #000;
    }
    
    .vp-close:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    .vp-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    
    /* Branding */
    .vp-branding {
      text-align: center;
      padding-top: 16px;
      margin-top: 16px;
      border-top: 1px solid #f5f5f5;
    }
    
    .vp-branding a {
      font-size: 11px;
      color: #999;
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    .vp-branding a:hover {
      color: #666;
    }
    
    .vp-branding a:focus {
      outline: 2px solid #000;
      outline-offset: 2px;
      border-radius: 2px;
    }
    
    @media (max-width: 768px) {
      .vp-modal-content {
        width: 95%;
        max-height: 90vh;
        border-radius: 12px;
      }
      
      .vp-modal-header {
        padding: 20px 20px 16px 20px;
      }
      
      .vp-modal-header h3 {
        font-size: 18px;
      }
      
      .vp-modal-body {
        padding: 20px;
      }
      
      /* Ensure tables are scrollable on mobile */
      .vp-policy-text table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        white-space: nowrap;
      }
      
      /* Set minimum font size for mobile */
      .vp-policy-text,
      .vp-policy-text p,
      .vp-policy-text li {
        font-size: 13px !important;
      }
      
      .vp-policy-text h1 {
        font-size: 20px;
      }
      
      .vp-policy-text h2 {
        font-size: 16px;
      }
      
      .vp-policy-text h3 {
        font-size: 14px;
      }
    }
    
    /* Prevent body scroll when modal is open */
    body.vp-modal-open {
      overflow: hidden;
      position: fixed;
      width: 100%;
    }
  `
}

function getPolicyModalJs(): string {
  return `
/**
 * Vision Privacy - Policy Modal Manager
 */
(function() {
  'use strict';
  
  class PolicyModalManager {
    constructor() {
      this.modal = null;
      this.cache = new Map();
      this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
      this.lastFocusedElement = null;
      this.currentPolicyType = null;
      this.init();
    }
    
    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupModal());
      } else {
        this.setupModal();
      }
    }
    
    setupModal() {
      this.modal = document.getElementById('vp-policy-modal');
      if (!this.modal) {
        console.warn('[Vision Privacy] Policy modal not found');
        return;
      }
      
      this.attachEventListeners();
      console.log('[Vision Privacy] Policy modal initialized');
    }
    
    attachEventListeners() {
      // Policy link clicks (both in banner and within policy content)
      document.addEventListener('click', (e) => {
        const policyLink = e.target.closest('[data-policy]');
        if (policyLink) {
          e.preventDefault();
          const policyType = policyLink.dataset.policy;
          
          // Check if we're navigating within an open modal
          const isInModal = this.modal && this.modal.contains(policyLink);
          if (isInModal && this.modal.style.display !== 'none') {
            // Cross-policy navigation - keep modal open
            this.loadPolicy(policyType);
          } else {
            // Opening policy from banner or other location
            this.openPolicy(policyType);
          }
        }
      });
      
      // Settings link clicks
      document.addEventListener('click', (e) => {
        const settingsLink = e.target.closest('.vp-settings-link');
        if (settingsLink && this.modal && this.modal.style.display !== 'none') {
          e.preventDefault();
          this.handleSettingsLink();
        }
      });
      
      // Close button
      const closeBtn = document.getElementById('vp-close-policy');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closePolicy());
      }
      
      // Backdrop click
      const backdrop = this.modal.querySelector('.vp-modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.closePolicy());
      }
      
      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
          this.closePolicy();
        }
      });
    }
    
    async openPolicy(policyType) {
      if (!this.modal) return;
      
      this.lastFocusedElement = document.activeElement;
      this.currentPolicyType = policyType;
      
      // Prevent body scroll
      document.body.classList.add('vp-modal-open');
      
      // Show modal
      this.modal.style.display = 'flex';
      this.modal.setAttribute('aria-hidden', 'false');
      
      // Load policy content
      await this.loadPolicy(policyType);
      
      // Trap focus after content is loaded
      this.trapFocus();
    }
    
    async loadPolicy(policyType) {
      if (!this.modal) return;
      
      this.currentPolicyType = policyType;
      
      // Set title
      const title = document.getElementById('vp-policy-title');
      if (title) {
        title.textContent = policyType === 'privacy' ? 'Integritetspolicy' : 'Cookiepolicy';
      }
      
      // Show loading
      this.showLoading();
      
      try {
        const content = await this.fetchPolicy(policyType);
        this.renderPolicyContent(content);
      } catch (error) {
        console.error('Failed to load policy:', error);
        this.showError();
      }
    }
    
    async fetchPolicy(policyType) {
      // Check cache first
      const cacheKey = \`policy_\${policyType}\`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('[Vision Privacy] Using cached policy:', policyType);
        return cached.content;
      }
      
      // Fetch from API
      console.log('[Vision Privacy] Fetching policy from API:', policyType);
      const response = await fetch(\`/api/demo-policy/\${policyType}\`);
      
      if (!response.ok) {
        throw new Error(\`Failed to fetch policy: \${response.status}\`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.content) {
        throw new Error('Invalid policy response format');
      }
      
      const content = data.data.content;
      
      // Cache the content
      this.cache.set(cacheKey, {
        content,
        timestamp: Date.now()
      });
      
      return content;
    }
    
    handleSettingsLink() {
      console.log('[Vision Privacy] Settings link clicked from policy modal');
      
      // Close policy modal
      this.closePolicy();
      
      // Open cookie settings modal
      const customizeBtn = document.querySelector('[data-action="customize"]');
      if (customizeBtn) {
        // Small delay to ensure policy modal is closed first
        setTimeout(() => {
          customizeBtn.click();
        }, 100);
      } else {
        console.warn('[Vision Privacy] Customize button not found');
      }
    }
    
    closePolicy() {
      if (!this.modal) return;
      
      // Re-enable body scroll
      document.body.classList.remove('vp-modal-open');
      
      this.modal.style.display = 'none';
      this.modal.setAttribute('aria-hidden', 'true');
      this.currentPolicyType = null;
      
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    }
    
    renderPolicyContent(content) {
      const loadingEl = document.getElementById('vp-policy-loading');
      const contentEl = document.getElementById('vp-policy-content');
      const errorEl = document.getElementById('vp-policy-error');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';
      if (contentEl) {
        contentEl.style.display = 'block';
        contentEl.innerHTML = content;
      }
    }
    
    showLoading() {
      const loadingEl = document.getElementById('vp-policy-loading');
      const contentEl = document.getElementById('vp-policy-content');
      const errorEl = document.getElementById('vp-policy-error');
      
      if (loadingEl) loadingEl.style.display = 'block';
      if (contentEl) contentEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';
    }
    
    showError() {
      const loadingEl = document.getElementById('vp-policy-loading');
      const contentEl = document.getElementById('vp-policy-content');
      const errorEl = document.getElementById('vp-policy-error');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'block';
    }
    
    trapFocus() {
      if (!this.modal) return;
      
      const focusableElements = this.modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      firstElement.focus();
      
      const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      this.modal.addEventListener('keydown', handleTab);
    }
  }
  
  // Initialize policy modal manager
  window.VisionPrivacyPolicyModal = new PolicyModalManager();
  console.log('[Vision Privacy] Policy modal script loaded');
})();
  `
}
