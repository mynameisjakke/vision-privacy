#!/usr/bin/env node
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Extract template content from SQL file
function extractTemplate(sql, type) {
  const pattern = new RegExp(
    `INSERT INTO policy_templates.*?VALUES\\s*\\(\\s*'${type}'\\s*,\\s*'([\\s\\S]*?)'\\s*,\\s*'([^']+)'\\s*,\\s*(true|false)\\s*,\\s*'([^']+)'\\s*\\)`,
    'i'
  )
  const match = sql.match(pattern)
  if (!match) return null
  
  return {
    template_type: type,
    content: match[1].replace(/''/g, "'"),
    version: match[2],
    is_active: match[3] === 'true',
    created_by: match[4]
  }
}

async function main() {
  console.log('🗄️ Seeding Policy Templates\n')
  
  const sqlPath = join(__dirname, '../../supabase/migrations/006_cookie_policy_template.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  
  // Delete existing
  console.log('🗑️  Deleting existing templates...')
  await supabase.from('policy_templates').delete().in('template_type', ['cookie_notice', 'policy'])
  console.log('✅ Deleted\n')
  
  // Insert cookie_notice
  console.log('📝 Inserting cookie_notice template...')
  const cookie = extractTemplate(sql, 'cookie_notice')
  if (cookie) {
    const { error } = await supabase.from('policy_templates').insert(cookie)
    if (error) throw error
    console.log('✅ Inserted\n')
  }
  
  // Insert policy
  console.log('📝 Inserting policy template...')
  const policy = extractTemplate(sql, 'policy')
  if (policy) {
    const { error } = await supabase.from('policy_templates').insert(policy)
    if (error) throw error
    console.log('✅ Inserted\n')
  }
  
  // Verify
  const { data } = await supabase.from('policy_templates')
    .select('template_type, version, is_active')
    .in('template_type', ['cookie_notice', 'policy'])
  
  console.log('📋 Verification:')
  data.forEach(t => console.log(`  ✓ ${t.template_type} v${t.version} (active: ${t.is_active})`))
  console.log('\n🎉 Migration complete!')
}

main().catch(console.error)
