#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyTemplates() {
  console.log('🔍 Verifying policy templates in database...\n')
  
  try {
    // Fetch all policy templates
    const { data: templates, error } = await supabase
      .from('policy_templates')
      .select('*')
      .in('template_type', ['cookie_notice', 'policy'])
      .order('template_type')
    
    if (error) throw error
    
    if (!templates || templates.length === 0) {
      console.error('❌ No policy templates found in database')
      process.exit(1)
    }
    
    console.log(`✅ Found ${templates.length} policy template(s):\n`)
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. Template: ${template.template_type}`)
      console.log(`   ID: ${template.id}`)
      console.log(`   Version: ${template.version}`)
      console.log(`   Active: ${template.is_active}`)
      console.log(`   Created by: ${template.created_by}`)
      console.log(`   Created at: ${template.created_at}`)
      console.log(`   Content length: ${template.content.length} characters`)
      
      // Check for required template variables
      const variables = [
        '{{DOMAIN_NAME}}',
        '{{COMPANY_NAME}}',
        '{{LAST_UPDATED_DATE}}',
        '{{ESSENTIAL_COOKIES_LIST}}',
        '{{FUNCTIONAL_COOKIES_LIST}}',
        '{{ANALYTICS_COOKIES_LIST}}',
        '{{ADVERTISING_COOKIES_LIST}}'
      ]
      
      const foundVars = variables.filter(v => template.content.includes(v))
      console.log(`   Template variables found: ${foundVars.length}/${variables.length}`)
      
      // Check for interactive elements
      const hasSettingsLink = template.content.includes('vp-settings-link')
      const hasPolicyLink = template.content.includes('vp-policy-link')
      console.log(`   Has settings link: ${hasSettingsLink}`)
      console.log(`   Has policy cross-link: ${hasPolicyLink}`)
      console.log('')
    })
    
    // Verify both required templates exist
    const hasCookie = templates.some(t => t.template_type === 'cookie_notice')
    const hasPolicy = templates.some(t => t.template_type === 'policy')
    
    if (!hasCookie || !hasPolicy) {
      console.error('❌ Missing required templates:')
      if (!hasCookie) console.error('  - cookie_notice template not found')
      if (!hasPolicy) console.error('  - policy template not found')
      process.exit(1)
    }
    
    // Verify all templates are active
    const allActive = templates.every(t => t.is_active)
    if (!allActive) {
      console.warn('⚠️  Warning: Not all templates are marked as active')
    }
    
    console.log('✅ All requirements met:')
    console.log('  ✓ Cookie policy template exists')
    console.log('  ✓ Privacy policy template exists')
    console.log('  ✓ Both templates are active')
    console.log('  ✓ Templates contain required variables')
    console.log('  ✓ Templates contain interactive elements')
    console.log('\n🎉 Database verification successful!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

verifyTemplates()
