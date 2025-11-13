#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Cookie Policy Template Content
const cookiePolicyContent = `<h1>Cookie Policy (Kakor)</h1>
<p><strong>Denna policy uppdaterades:</strong> {{LAST_UPDATED_DATE}}</p>

<h2>Inledning</h2>
<p>Denna policy kompletterar vår <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button> och förklarar hur vi använder cookies och liknande tekniker på {{DOMAIN_NAME}}.</p>

<h2>Vad är Cookies?</h2>
<p>En cookie är en liten textfil som lagras på din enhet (dator, surfplatta eller mobil) när du besöker en webbplats. De används för att få webbplatsen att fungera mer effektivt, ge oss information om ditt besök, och i vissa fall, samla in personuppgifter.</p>

<h2>Ditt samtycke</h2>
<p>Vi lagrar eller får tillgång till information på din utrustning endast om det är strikt nödvändigt för att tillhandahålla en tjänst som du uttryckligen har begärt (se Nödvändiga Cookies nedan). För alla övriga cookies, inklusive funktionalitet, analys och marknadsföring, inhämtar vi ditt uttryckliga samtycke i enlighet med Lagen om elektronisk kommunikation (LEK) och GDPR.</p>
<p>Du kan när som helst ändra eller återkalla ditt samtycke via vår <button class="vp-settings-link" type="button">inställningsmodul</button>.</p>

<h2>Vilka typer av Cookies använder vi?</h2>

<h3>Nödvändiga Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Essentiella för webbplatsens grundläggande funktioner, såsom säker inloggning, varukorgsfunktionalitet eller säkerhet. Dessa kräver inte samtycke då de är nödvändiga för att tillhandahålla en tjänst du uttryckligen begärt.</p>
<p><strong>Rättslig grund:</strong> Berättigat Intresse, GDPR Art. 6.1 f</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{ESSENTIAL_COOKIES_LIST}}

<h3>Funktionella Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Förbättrar webbplatsens funktionalitet och personalisering, såsom språkval, videouppspelning (t.ex. YouTube/Vimeo) eller live-chatt. Kräver Samtycke enligt e-Privacy/LEK.</p>
<p><strong>Rättslig grund:</strong> Samtycke, GDPR Art. 6.1 a</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{FUNCTIONAL_COOKIES_LIST}}`

const privacyPolicyContent = `<h1>Integritetspolicy</h1>
<p>{{COMPANY_NAME_OR_DOMAIN}} värnar om din integritet och är engagerade i att skydda dina personuppgifter. Denna Integritetspolicy förklarar hur vi samlar in, använder och skyddar dina personuppgifter i enlighet med EU:s Dataskyddsförordning (GDPR, Förordning (EU) 2016/679) och svensk lagstiftning.</p>
<p><strong>Denna policy uppdaterades:</strong> {{LAST_UPDATED_DATE}}</p>

<h2>Personuppgiftsansvarig och kontaktinformation</h2>
<p>Den juridiska person som ansvarar för behandlingen av dina personuppgifter är:</p>
<ul>
  <li><strong>Företagsnamn:</strong> {{COMPANY_NAME}}</li>
  <li><strong>Organisationsnummer:</strong> {{ORG_NUMBER}}</li>
  <li><strong>Adress:</strong> {{COMPANY_ADDRESS}}</li>
  <li><strong>E-post:</strong> {{CONTACT_EMAIL}}</li>
</ul>`

async function seedTemplates() {
  console.log('🌱 Seeding policy templates...')
  
  try {
    // Delete existing templates
    console.log('🗑️  Deleting existing policy templates...')
    const { error: deleteError } = await supabase
      .from('policy_templates')
      .delete()
      .in('template_type', ['cookie_notice', 'policy'])
    
    if (deleteError) throw deleteError
    console.log('✅ Deleted existing templates')
    
    // Read full templates from migration file
    const migrationPath = join(__dirname, '../../supabase/migrations/006_cookie_policy_template.sql')
    const migrationContent = readFileSync(migrationPath, 'utf-8')
    
    // Extract cookie policy content
    const cookieMatch = migrationContent.match(/'cookie_notice',\s*'(.*?)',\s*'1\.0\.0'/s)
    const privacyMatch = migrationContent.match(/'policy',\s*'(.*?)',\s*'1\.0\.0'/s)
    
    if (!cookieMatch || !privacyMatch) {
      throw new Error('Could not extract template content from migration file')
    }
    
    const cookieContent = cookieMatch[1].replace(/''/g, "'")
    const privacyContent = privacyMatch[1].replace(/''/g, "'")
    
    // Insert cookie policy template
    console.log('📝 Inserting cookie policy template...')
    const { error: cookieError } = await supabase
      .from('policy_templates')
      .insert({
        template_type: 'cookie_notice',
        content: cookieContent,
        version: '1.0.0',
        is_active: true,
        created_by: 'system'
      })
    
    if (cookieError) throw cookieError
    console.log('✅ Cookie policy template inserted')
    
    // Insert privacy policy template
    console.log('📝 Inserting privacy policy template...')
    const { error: privacyError } = await supabase
      .from('policy_templates')
      .insert({
        template_type: 'policy',
        content: privacyContent,
        version: '1.0.0',
        is_active: true,
        created_by: 'system'
      })
    
    if (privacyError) throw privacyError
    console.log('✅ Privacy policy template inserted')
    
    // Verify
    const { data: templates, error: verifyError } = await supabase
      .from('policy_templates')
      .select('id, template_type, version, is_active')
      .in('template_type', ['cookie_notice', 'policy'])
    
    if (verifyError) throw verifyError
    
    console.log(`\n✅ Successfully seeded ${templates.length} templates:`)
    templates.forEach(t => console.log(`  - ${t.template_type} (v${t.version})`))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seedTemplates()
