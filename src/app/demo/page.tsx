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

  const submitConsent = useCallback(async (siteId: string, categories: string[]) => {
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
  })

  const showCustomizeModal = useCallback((siteId: string, categories: any[]) => {
    // Read saved consent from localStorage
    const savedConsent = localStorage.getItem('vision-privacy-consent')
    let savedCategories: string[] = []
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent)
        savedCategories = parsed.categories || []
      } catch (e) {
        console.error('Failed to parse saved consent:', e)
      }
    }
    
    // Create a simple modal for category selection
    const modal = document.createElement('div')
    modal.className = 'vision-privacy-modal'
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      animation: vp-fade-in 0.2s ease-out;
    `

    const modalContent = document.createElement('div')
    modalContent.style.cssText = `
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
    `

    const categoryDescriptions: Record<string, string> = {
      essential: 'Nödvändiga cookies är avgörande för webbplatsens grundläggande funktioner såsom säker inloggning, sessionshantering och säkerhetsfunktioner. Dessa cookies lagrar ingen personligt identifierbar information och kan inte stängas av enligt GDPR Artikel 6(1)(f) då de är nödvändiga för att tillhandahålla den tjänst du uttryckligen begärt.',
      functional: 'Funktionella cookies möjliggör förbättrad funktionalitet och personalisering, såsom videospelare, live-chattar och språkval. De kan sättas av oss eller av tredjepartsleverantörer vars tjänster vi använder. Om du inte tillåter dessa cookies kan vissa eller alla dessa funktioner inte fungera korrekt. Behandlingen baseras på ditt samtycke enligt GDPR Artikel 6(1)(a).',
      analytics: 'Analyscookies hjälper oss att förstå hur besökare interagerar med webbplatsen genom att samla in och rapportera information anonymt. Vi använder dessa för att förbättra webbplatsens prestanda och användarupplevelse. Informationen som samlas in inkluderar antal besökare, varifrån de kommer och vilka sidor de besöker. Behandlingen kräver ditt samtycke enligt e-Privacy-direktivet och GDPR Artikel 6(1)(a).',
      advertising: 'Marknadsföringscookies används för att spåra besökare över webbplatser för att visa relevanta och engagerande annonser. De kan användas av annonspartners för att bygga en profil av dina intressen och visa relevanta annonser på andra webbplatser. Dessa cookies lagrar information om din webbläsaraktivitet. Behandlingen kräver ditt uttryckliga samtycke enligt GDPR Artikel 6(1)(a) och e-Privacy-direktivet.'
    }

    let modalHTML = `
      <div style="padding: 24px 24px 20px 24px; border-bottom: 1px solid #f0f0f0; position: relative;">
        <button type="button" id="close-modal" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s ease;">&times;</button>
        <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #000; text-align: center; padding-right: 30px;">Cookie-inställningar</h3>
      </div>
      <div style="padding: 24px; overflow-y: auto; flex: 1;">
        <p style="margin: 0 0 24px 0; color: #666; line-height: 1.6; font-size: 14px;">Vi använder cookies och liknande tekniker för att förbättra din upplevelse på vår webbplats. Vissa cookies är nödvändiga för webbplatsens funktion, medan andra hjälper oss att analysera och förbättra webbplatsen samt visa personligt anpassat innehåll. Du kan när som helst ändra dina inställningar.</p>
        <form id="cookie-preferences-form">
    `

    categories.forEach((category, index) => {
      // Check if this category was previously consented
      const wasConsented = savedCategories.includes(category.id)
      const checked = category.is_essential || wasConsented ? 'checked' : ''
      const disabled = category.is_essential ? 'disabled' : ''
      const isExpanded = category.is_essential // Only essential is expanded by default
      const description = categoryDescriptions[category.id] || category.description
      
      modalHTML += `
        <div class="cookie-category" data-category-id="${category.id}" style="margin-bottom: 12px; border: 1px solid #e8e8e8; border-radius: 12px; background: #ffffff; transition: all 0.2s ease;">
          <div style="padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                <button type="button" class="accordion-toggle" data-target="desc-${category.id}" style="background: none; border: none; cursor: pointer; padding: 0; color: #666; font-size: 18px; line-height: 1; transition: transform 0.2s ease; transform: rotate(${isExpanded ? '0deg' : '-90deg'});">▼</button>
                <div style="font-weight: 600; font-size: 15px; color: #000; display: flex; align-items: center; gap: 8px;">
                  ${category.name}
                  ${category.is_essential ? '<span style="background: #e8e8e8; color: #666; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">KRÄVS</span>' : ''}
                </div>
              </div>
            </div>
            <div class="toggle-wrapper" style="position: relative; display: inline-block; width: 48px; height: 28px; flex-shrink: 0;">
              <input type="checkbox" class="toggle-input" name="category" value="${category.id}" ${checked} ${disabled} data-category="${category.id}" style="opacity: 0; width: 0; height: 0; position: absolute;">
              <span class="toggle-slider" style="position: absolute; cursor: ${category.is_essential ? 'not-allowed' : 'pointer'}; top: 0; left: 0; right: 0; bottom: 0; background-color: ${checked ? '#000000' : '#e0e0e0'}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 28px; ${category.is_essential ? 'opacity: 0.6;' : ''}">
                <span class="toggle-knob" style="position: absolute; content: ''; height: 24px; width: 24px; left: 2px; bottom: 2px; background-color: #ffffff; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transform: ${checked ? 'translateX(20px)' : 'translateX(0)'};"></span>
              </span>
            </div>
          </div>
          <div id="desc-${category.id}" class="accordion-content" style="max-height: ${isExpanded ? '500px' : '0'}; overflow: hidden; transition: max-height 0.3s ease;">
            <div style="padding: 0 18px 18px 18px;">
              <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6; padding-left: 30px;">${description}</p>
            </div>
          </div>
        </div>
      `
    })

    modalHTML += `
        </form>
      </div>
      <div style="padding: 20px 24px 24px 24px; display: flex; flex-direction: column; gap: 16px; border-top: 1px solid #f0f0f0;">
        <div style="display: flex; gap: 12px;">
          <button type="button" id="cancel-preferences" style="flex: 1; padding: 10px 20px; background: #ffffff; color: #333; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">Avbryt</button>
          <button type="submit" form="cookie-preferences-form" style="flex: 1; padding: 10px 24px; background: #000000; color: #ffffff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">Spara inställningar</button>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding-top: 12px; border-top: 1px solid #f5f5f5; font-size: 13px;">
          <button type="button" class="vp-policy-link" data-policy="privacy" style="background: none; border: none; color: #666; text-decoration: underline; cursor: pointer; padding: 0; font-size: 13px; transition: color 0.2s ease;">Integritetspolicy</button>
          <span style="color: #999;">•</span>
          <button type="button" class="vp-policy-link" data-policy="cookie" style="background: none; border: none; color: #666; text-decoration: underline; cursor: pointer; padding: 0; font-size: 13px; transition: color 0.2s ease;">Cookiepolicy</button>
        </div>
        <div style="text-align: center; padding-top: 16px; margin-top: 16px; border-top: 1px solid #f5f5f5;">
          <a href="https://visionmedia.io" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #999; text-decoration: none; transition: color 0.2s ease;">Drivs av Vision Media</a>
        </div>
      </div>
    `

    modalContent.innerHTML = modalHTML
    modal.appendChild(modalContent)
    document.body.appendChild(modal)

    // Handle close button (X)
    document.getElementById('close-modal')?.addEventListener('click', () => {
      document.body.removeChild(modal)
    })

    // Handle toggle switches
    modal.querySelectorAll('.toggle-wrapper').forEach(wrapper => {
      const input = wrapper.querySelector('.toggle-input') as HTMLInputElement
      const slider = wrapper.querySelector('.toggle-slider') as HTMLElement
      const knob = wrapper.querySelector('.toggle-knob') as HTMLElement
      
      if (!input || input.disabled) return
      
      wrapper.addEventListener('click', (e) => {
        e.preventDefault()
        input.checked = !input.checked
        
        // Update visual state
        if (input.checked) {
          slider.style.backgroundColor = '#000000'
          knob.style.transform = 'translateX(20px)'
        } else {
          slider.style.backgroundColor = '#e0e0e0'
          knob.style.transform = 'translateX(0)'
        }
      })
    })

    // Handle accordion toggles
    modal.querySelectorAll('.accordion-toggle').forEach(btn => {
      const button = btn as HTMLButtonElement
      button.addEventListener('click', (e) => {
        e.preventDefault()
        const target = button.getAttribute('data-target')
        const content = document.getElementById(target!) as HTMLElement
        const isExpanded = content.style.maxHeight !== '0px' && content.style.maxHeight !== ''
        
        if (isExpanded) {
          content.style.maxHeight = '0'
          button.style.transform = 'rotate(-90deg)'
        } else {
          content.style.maxHeight = '500px'
          button.style.transform = 'rotate(0deg)'
        }
      })
    })

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