'use client'

import { useEffect, useState, useCallback } from 'react'

// Extend Window interface for floating button API
declare global {
  interface Window {
    VisionPrivacyFloatingButton?: {
      show: () => void
      hide: () => void
    }
  }
}

export default function DemoPage() {
  const [bannerLoaded, setBannerLoaded] = useState(false)
  const [siteId] = useState('demo-site-123')

  const generateVisitorHash = () => {
    // Simple hash generation for demo
    return 'demo-visitor-' + Math.random().toString(36).substr(2, 9)
  }

  const hideBanner = () => {
    // Hide the container
    const bannerContainer = document.getElementById('vision-privacy-banner')
    if (bannerContainer) {
      bannerContainer.style.display = 'none'
    }
    
    // Also hide the banner element itself (for floating button detection)
    const bannerElement = document.querySelector('.vision-privacy-banner')
    if (bannerElement) {
      (bannerElement as HTMLElement).style.display = 'none'
    }
    
    console.log('🚫 Banner hidden')
  }

  const submitConsent = async (siteId: string, categories: string[]) => {
    try {
      const response = await fetch('/api/demo-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: siteId,
          visitor_hash: generateVisitorHash(),
          consent_categories: categories,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        })
      })

      if (response.ok) {
        console.log('Consent submitted successfully')
        // Store consent in localStorage for demo purposes
        localStorage.setItem('vision-privacy-consent', JSON.stringify({
          siteId,
          categories,
          timestamp: new Date().toISOString()
        }))
        
        // Trigger floating button to appear after a delay
        console.log('⏳ Waiting for banner to hide before showing floating button...')
        
        setTimeout(() => {
          if (window.VisionPrivacyFloatingButton) {
            console.log('🎯 Triggering floating button...')
            window.VisionPrivacyFloatingButton.show()
            
            // Debug: Check if button exists and is visible
            setTimeout(() => {
              const btn = document.getElementById('vision-privacy-floating-btn')
              if (btn) {
                const styles = window.getComputedStyle(btn)
                console.log('✅ Button element exists in DOM')
                console.log('📊 Button computed styles:', {
                  display: styles.display,
                  position: styles.position,
                  bottom: styles.bottom,
                  right: styles.right,
                  zIndex: styles.zIndex,
                  visibility: styles.visibility,
                  opacity: styles.opacity,
                  background: styles.background
                })
                
                // Check if banner is actually hidden
                const banner = document.querySelector('.vision-privacy-banner')
                const bannerHidden = banner ? window.getComputedStyle(banner as HTMLElement).display === 'none' : true
                console.log('🚫 Banner hidden:', bannerHidden)
                
                if (styles.display === 'none') {
                  console.warn('⚠️ Button exists but display is "none"!')
                }
              } else {
                console.error('❌ Button element NOT found in DOM!')
                console.log('🔍 Checking why...')
                console.log('  - Has consent:', !!localStorage.getItem('vision-privacy-consent'))
                console.log('  - API available:', !!window.VisionPrivacyFloatingButton)
              }
            }, 200)
          } else {
            console.error('❌ VisionPrivacyFloatingButton API not available!')
          }
        }, 600)
      }
    } catch (error) {
      console.error('Failed to submit consent:', error)
    }
  }

  const showCustomizeModal = useCallback((siteId: string, categories: any[]) => {
    // Create a simple modal for category selection
    const modal = document.createElement('div')
    modal.className = 'vision-privacy-modal'
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `

    const modalContent = document.createElement('div')
    modalContent.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `

    let modalHTML = `
      <h3 style="margin-top: 0;">Anpassa cookie-inställningar</h3>
      <p>Välj vilka typer av cookies du vill tillåta:</p>
      <form id="cookie-preferences-form">
    `

    categories.forEach(category => {
      const checked = category.is_essential ? 'checked disabled' : ''
      const disabled = category.is_essential ? 'disabled' : ''
      modalHTML += `
        <div style="margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 4px;">
          <label style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <input type="checkbox" name="category" value="${category.id}" ${checked} ${disabled}>
            <div>
              <strong>${category.name}</strong>
              ${category.is_essential ? '<span style="color: #666; font-size: 0.8em;">(Krävs)</span>' : ''}
              <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9em;">${category.description}</p>
            </div>
          </label>
        </div>
      `
    })

    modalHTML += `
        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
          <button type="button" id="cancel-preferences" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Avbryt</button>
          <button type="submit" style="padding: 0.5rem 1rem; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">Spara inställningar</button>
        </div>
      </form>
    `

    modalContent.innerHTML = modalHTML
    modal.appendChild(modalContent)
    document.body.appendChild(modal)

    // Handle form submission
    const form = document.getElementById('cookie-preferences-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form as HTMLFormElement)
      const selectedCategories = formData.getAll('category') as string[]
      
      await submitConsent(siteId, selectedCategories)
      document.body.removeChild(modal)
      hideBanner()
    })

    // Handle cancel
    document.getElementById('cancel-preferences')?.addEventListener('click', () => {
      document.body.removeChild(modal)
    })

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    })
  }, [submitConsent])

  const setupBannerEventListeners = useCallback((siteId: string, widgetData: any) => {
    // Accept All button
    const acceptAllBtn = document.querySelector('[data-action="accept-all"]')
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', async () => {
        await submitConsent(siteId, widgetData.cookie_categories.map((c: any) => c.id))
        hideBanner()
      })
    }

    // Reject All button
    const rejectAllBtn = document.querySelector('[data-action="reject-all"]')
    if (rejectAllBtn) {
      rejectAllBtn.addEventListener('click', async () => {
        const essentialCategories = widgetData.cookie_categories
          .filter((c: any) => c.is_essential)
          .map((c: any) => c.id)
        await submitConsent(siteId, essentialCategories)
        hideBanner()
      })
    }

    // Customize button
    const customizeBtn = document.querySelector('[data-action="customize"]')
    if (customizeBtn) {
      customizeBtn.addEventListener('click', () => {
        showCustomizeModal(siteId, widgetData.cookie_categories)
      })
    }
  }, [showCustomizeModal, submitConsent])

  useEffect(() => {
    // Simulate loading the Vision Privacy widget
    const loadWidget = async () => {
      try {
        // Using demo site ID for testing
        const actualSiteId = siteId

        // Load the widget configuration (using demo endpoint)
        const widgetResponse = await fetch('/api/demo-widget')
        if (widgetResponse.ok) {
          const widgetData = await widgetResponse.json()
          
          // Inject the banner HTML and CSS
          const bannerContainer = document.getElementById('vision-privacy-banner')
          if (bannerContainer && widgetData.banner_html) {
            bannerContainer.innerHTML = widgetData.banner_html
            
            // Add CSS if provided
            if (widgetData.banner_css) {
              const style = document.createElement('style')
              style.textContent = widgetData.banner_css
              document.head.appendChild(style)
            }

            // Add floating button CSS FIRST
            if (widgetData.floating_button_css) {
              const floatingStyle = document.createElement('style')
              floatingStyle.id = 'vision-privacy-floating-css'
              floatingStyle.textContent = widgetData.floating_button_css
              document.head.appendChild(floatingStyle)
              console.log('✅ Floating button CSS loaded')
            } else {
              console.warn('⚠️ No floating button CSS in widget data')
            }

            // Add floating button JS AFTER CSS
            if (widgetData.floating_button_js) {
              const floatingScript = document.createElement('script')
              floatingScript.id = 'vision-privacy-floating-js'
              floatingScript.textContent = widgetData.floating_button_js
              document.body.appendChild(floatingScript)
              console.log('✅ Floating button script loaded')
            } else {
              console.warn('⚠️ No floating button JS in widget data')
            }

            // Add event listeners for banner interactions
            setupBannerEventListeners(actualSiteId, widgetData)
            setBannerLoaded(true)
          }
        }
      } catch (error) {
        console.error('Failed to load Vision Privacy widget:', error)
      }
    }

    loadWidget()
  }, [setupBannerEventListeners, siteId])

  const resetConsent = () => {
    localStorage.removeItem('vision-privacy-consent')
    window.location.reload()
  }

  const showCurrentConsent = () => {
    const consent = localStorage.getItem('vision-privacy-consent')
    if (consent) {
      alert('Current consent: ' + consent)
    } else {
      alert('No consent stored')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo page header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vision Privacy Demo</h1>
              <p className="text-sm text-gray-600">Experience the cookie banner in action</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetConsent}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Reset Consent
              </button>
              <button
                onClick={showCurrentConsent}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Show Consent
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Demo website content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Demo Website Content</h2>
          <p className="text-gray-600 mb-4">
            This is a demo page that simulates how the Vision Privacy banner would appear on a real website.
            The banner should appear at the bottom of the page when you first visit.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Cookie consent banner display</li>
                <li>Accept All functionality</li>
                <li>Reject All functionality</li>
                <li>Customize preferences modal</li>
                <li>Consent storage and retrieval</li>
                <li>API integration</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Status:</h3>
              <div className="text-sm space-y-1">
                <p>Site ID: <code className="bg-gray-100 px-1 rounded">{siteId}</code></p>
                <p>Banner Loaded: <span className={bannerLoaded ? 'text-green-600' : 'text-red-600'}>{bannerLoaded ? 'Yes' : 'No'}</span></p>
                <p>API Endpoint: <code className="bg-gray-100 px-1 rounded">/api/demo-widget</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Sample content to make the page feel more realistic */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Sample Article</h3>
            <p className="text-gray-600 text-sm">
              This is sample content to demonstrate how the cookie banner appears over real website content.
              The banner should not interfere with the user experience while still being prominent enough to notice.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Another Section</h3>
            <p className="text-gray-600 text-sm">
              More sample content here. The Vision Privacy system automatically detects cookies and scripts
              on your website and categorizes them appropriately.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Contact Form</h3>
            <p className="text-gray-600 text-sm mb-3">
              This simulates a contact form that might use cookies for functionality.
            </p>
            <form className="space-y-2">
              <input type="text" placeholder="Name" className="w-full p-2 border rounded text-sm" />
              <input type="email" placeholder="Email" className="w-full p-2 border rounded text-sm" />
              <button type="button" className="w-full bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Vision Privacy Banner Container */}
      <div id="vision-privacy-banner"></div>
    </div>
  )
}