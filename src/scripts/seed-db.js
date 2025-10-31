// Seed database with initial data
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...\n')

  try {
    // 1. Seed cookie categories
    console.log('1. Creating cookie categories...')
    const categories = [
      {
        name: 'Essential',
        description: 'These cookies are necessary for the website to function and cannot be switched off.',
        is_essential: true,
        sort_order: 1,
        is_active: true
      },
      {
        name: 'Analytics',
        description: 'These cookies help us understand how visitors interact with our website.',
        is_essential: false,
        sort_order: 2,
        is_active: true
      },
      {
        name: 'Marketing',
        description: 'These cookies are used to deliver relevant advertisements to you.',
        is_essential: false,
        sort_order: 3,
        is_active: true
      },
      {
        name: 'Functional',
        description: 'These cookies enable enhanced functionality and personalization.',
        is_essential: false,
        sort_order: 4,
        is_active: true
      }
    ]

    const { data: categoryData, error: categoryError } = await supabase
      .from('cookie_categories')
      .upsert(categories, { onConflict: 'name' })
      .select()

    if (categoryError) {
      console.error('   ❌ Failed to create categories:', categoryError)
    } else {
      console.log(`   ✅ Created ${categoryData.length} cookie categories`)
    }

    // 2. Seed policy templates
    console.log('\n2. Creating policy templates...')
    
    const bannerTemplate = {
      template_type: 'banner',
      content: `
        <div id="vp-cookie-banner" class="vp-banner">
          <div class="vp-banner-content">
            <div class="vp-banner-text">
              <h3>We value your privacy</h3>
              <p>We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
            </div>
            <div class="vp-banner-actions">
              <button id="vp-accept-all" class="vp-btn vp-btn-primary">Accept All</button>
              <button id="vp-reject-all" class="vp-btn vp-btn-secondary">Reject All</button>
              <button id="vp-settings" class="vp-btn vp-btn-link">Cookie Settings</button>
            </div>
          </div>
        </div>
      `,
      version: '1.0.0',
      is_active: true,
      created_by: 'system'
    }

    const policyTemplate = {
      template_type: 'policy',
      content: `
        <h1>Privacy Policy for {{SITE_NAME}}</h1>
        <p class="last-updated">Last updated: {{LAST_UPDATED}}</p>
        
        <div class="section">
          <h2>1. Information We Collect</h2>
          <p>When you visit {{SITE_NAME}}, we may collect certain information about your device and your interaction with our website through cookies and similar technologies.</p>
        </div>
        
        <div class="section">
          <h2>2. How We Use Cookies</h2>
          <p>We use cookies and similar tracking technologies to track activity on our website and store certain information.</p>
        </div>
        
        <div class="section">
          <h2>3. Third-Party Services</h2>
          <p>Our website may use third-party services that collect, monitor and analyze user behavior.</p>
          {{DETECTED_SERVICES}}
        </div>
        
        <div class="section">
          <h2>4. Your Rights and Choices</h2>
          <p>You have the right to accept or decline cookies through our cookie banner and modify your preferences at any time.</p>
        </div>
        
        <div class="section">
          <h2>5. Contact Information</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at {{CONTACT_EMAIL}}</p>
        </div>
      `,
      version: '1.0.0',
      is_active: true,
      created_by: 'system'
    }

    const { data: templateData, error: templateError } = await supabase
      .from('policy_templates')
      .insert([bannerTemplate, policyTemplate])
      .select()

    if (templateError) {
      console.error('   ❌ Failed to create templates:', templateError)
    } else {
      console.log(`   ✅ Created ${templateData.length} policy templates`)
    }

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - Cookie Categories: ${categoryData?.length || 0}`)
    console.log(`   - Policy Templates: ${templateData?.length || 0}`)
    console.log('\n✅ Ready to test the API!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

seedDatabase()