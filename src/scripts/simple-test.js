// Simple test to verify API endpoints are working
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const API_BASE = 'http://localhost:3000'

async function testAPI() {
  console.log('🧪 Testing Vision Privacy API...\n')

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...')
    const healthResponse = await fetch(`${API_BASE}/api/health`)
    const healthData = await healthResponse.json()
    console.log(`   Status: ${healthResponse.status}`)
    console.log(`   Response: ${JSON.stringify(healthData, null, 2)}`)
    
    if (healthResponse.ok) {
      console.log('   ✅ Health check passed\n')
    } else {
      console.log('   ❌ Health check failed\n')
      return
    }

    // Test 2: Site Registration
    console.log('2. Testing Site Registration...')
    const timestamp = Date.now()
    const registrationData = {
      domain: `https://test-site-${timestamp}.example.com`,
      wp_version: '6.4.0',
      installed_plugins: ['contact-form-7'],
      detected_forms: [{ type: 'contact-form-7', count: 1 }],
      plugin_version: '1.0.0'
    }

    const regResponse = await fetch(`${API_BASE}/api/sites/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    })

    const regData = await regResponse.json()
    console.log(`   Status: ${regResponse.status}`)
    console.log(`   Response: ${JSON.stringify(regData, null, 2)}`)
    
    if (regResponse.ok && regData.site_id) {
      console.log('   ✅ Site registration passed')
      console.log(`   Site ID: ${regData.site_id}`)
      console.log(`   API Token: ${regData.api_token?.substring(0, 20)}...`)
      
      // Test 3: Widget Configuration
      console.log('\n3. Testing Widget Configuration...')
      const widgetResponse = await fetch(`${API_BASE}/api/widget/${regData.site_id}`)
      const widgetData = await widgetResponse.json()
      console.log(`   Status: ${widgetResponse.status}`)
      
      if (widgetResponse.ok) {
        console.log('   ✅ Widget configuration passed')
        console.log(`   Has banner HTML: ${!!widgetData.banner_html}`)
        console.log(`   Has banner CSS: ${!!widgetData.banner_css}`)
        console.log(`   Cookie categories: ${widgetData.cookie_categories?.length || 0}`)
      } else {
        console.log('   ❌ Widget configuration failed')
        console.log(`   Error: ${JSON.stringify(widgetData, null, 2)}`)
      }
      
    } else {
      console.log('   ❌ Site registration failed')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.log('\n💡 Make sure the development server is running with: npm run dev')
  }
}

testAPI()