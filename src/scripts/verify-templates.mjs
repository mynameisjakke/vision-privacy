#!/usr/bin/env node
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verify() {
  console.log('🔍 Verifying Policy Templates\n')
  console.log('=' .repeat(70))
  
  const { data, error } = await supabase
    .from('policy_templates')
    .select('*')
    .in('template_type', ['cookie_notice', 'policy'])
    .order('template_type')
  
  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
  
  if (!data || data.length === 0) {
    console.error('❌ No templates found!')
    process.exit(1)
  }
  
  console.log(`\n✅ Found ${data.length} templates\n`)
  
  data.forEach(template => {
    console.log(`📄 Template: ${template.template_type}`)
    console.log(`   ID: ${template.id}`)
    console.log(`   Version: ${template.version}`)
    console.log(`   Active: ${template.is_active}`)
    console.log(`   Created by: ${template.created_by}`)
    console.log(`   Created at: ${new Date(template.created_at).toLocaleString()}`)
    console.log(`   Content length: ${template.content.length} characters`)
    console.log(`   Has variables: ${template.content.includes('{{') ? 'Yes' : 'No'}`)
    
    // Check for key variables
    const variables = [
      'DOMAIN_NAME',
      'COMPANY_NAME',
      'LAST_UPDATED_DATE',
      'ESSENTIAL_COOKIES_LIST',
      'COOKIE_DETAILS_TABLE'
    ]
    
    const foundVars = variables.filter(v => template.content.includes(`{{${v}}}`))
    console.log(`   Variables found: ${foundVars.length}/${variables.length}`)
    
    // Check for interactive elements
    const hasSettingsLink = template.content.includes('vp-settings-link')
    const hasPolicyLink = template.content.includes('vp-policy-link')
    console.log(`   Has settings link: ${hasSettingsLink ? 'Yes' : 'No'}`)
    console.log(`   Has policy link: ${hasPolicyLink ? 'Yes' : 'No'}`)
    
    console.log()
  })
  
  console.log('=' .repeat(70))
  console.log('✅ Verification complete!')
  console.log('\n📋 Summary:')
  console.log(`   - Total templates: ${data.length}`)
  console.log(`   - Active templates: ${data.filter(t => t.is_active).length}`)
  console.log(`   - Template types: ${data.map(t => t.template_type).join(', ')}`)
}

verify().catch(console.error)
