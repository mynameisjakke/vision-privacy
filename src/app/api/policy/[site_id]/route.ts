import { NextRequest } from 'next/server'
import { createSuccessResponse, createNotFoundResponse, createValidationErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, widgetConfigSchema } from '@/lib/validation'
import { SitesDB, PolicyTemplatesDB, ClientScansDB } from '@/lib/database'
import { PolicyTemplateEngine } from '@/lib/policy-template'

export async function GET(
  request: NextRequest,
  { params }: { params: { site_id: string } }
) {
  try {
    const { site_id } = params
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const format = searchParams.get('format') || 'html' // 'html' or 'json'
    const type = searchParams.get('type') || 'privacy' // 'privacy' or 'cookie'
    
    // Validate site_id format
    const validation = validateRequest(widgetConfigSchema, { site_id })
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    // Get site information
    const site = await SitesDB.getById(site_id)
    if (!site) {
      return createNotFoundResponse('Site not found')
    }
    
    // Check if site is active
    if (site.status !== 'active') {
      return createNotFoundResponse('Site is not active')
    }
    
    // Get appropriate template based on type
    const templateType = type === 'cookie' ? 'cookie_notice' : 'policy'
    const policyTemplate = await PolicyTemplatesDB.findActive(templateType)
    
    // If no template found, use default
    const templateContent = policyTemplate?.content || getDefaultPolicyTemplate(type)
    
    // Get site variables for template replacement
    const variables = await PolicyTemplateEngine.getSiteVariables(site_id)
    
    // Generate dynamic policy content with template variable replacement
    const policyContent = PolicyTemplateEngine.renderTemplate(templateContent, variables)
    
    // Return JSON response for modal display
    if (format === 'json') {
      return createSuccessResponse({
        policy_content: policyContent,
        type: type,
        last_updated: new Date().toISOString(),
        site_domain: new URL(site.domain).hostname
      })
    }
    
    // Return HTML response for direct viewing (backward compatibility)
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${type === 'cookie' ? 'Cookie Policy' : 'Privacy Policy'} - ${new URL(site.domain).hostname}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3 { color: #2c3e50; }
          .last-updated { color: #666; font-style: italic; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .detected-services { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .service-list { list-style-type: none; padding: 0; }
          .service-item { padding: 5px 0; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        ${policyContent}
      </body>
      </html>
    `
    
    const response = new Response(htmlResponse, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
        'Vary': 'Accept-Encoding'
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Policy fetch failed:', error)
    return createNotFoundResponse('Privacy policy unavailable')
  }
}



function getDefaultPolicyTemplate(type: string = 'privacy'): string {
  if (type === 'cookie') {
    return `
      <h1>Cookiepolicy för {{COMPANY_NAME_OR_DOMAIN}}</h1>
      <p class="last-updated">Senast uppdaterad: {{LAST_UPDATED_DATE}}</p>
      
      <div class="section">
        <h2>1. Vad är cookies?</h2>
        <p>Cookies är små textfiler som placeras på din enhet när du besöker {{DOMAIN_NAME}}. De hjälper oss att ge dig en bättre upplevelse genom att komma ihåg dina preferenser och förstå hur du använder vår webbplats.</p>
      </div>
      
      <div class="section">
        <h2>2. Typer av cookies vi använder</h2>
        <p>Vi använder följande typer av cookies på vår webbplats:</p>
        <ul>
          <li><strong>Nödvändiga cookies:</strong> Dessa är nödvändiga för att webbplatsen ska fungera korrekt och kan inte inaktiveras</li>
          <li><strong>Analytiska cookies:</strong> Dessa hjälper oss att förstå hur besökare interagerar med vår webbplats genom att samla in och rapportera information anonymt</li>
          <li><strong>Marknadsföringscookies:</strong> Dessa används för att leverera relevanta annonser och spåra annonskampanjers prestanda</li>
          <li><strong>Funktionella cookies:</strong> Dessa möjliggör förbättrad funktionalitet och personalisering, såsom att komma ihåg dina preferenser</li>
        </ul>
      </div>
      
      <div class="section">
        <h2>3. Cookies som för närvarande används</h2>
        <p>Nedan finns de cookies som för närvarande upptäckts på vår webbplats:</p>
        
        <h3>Nödvändiga cookies</h3>
        {{ESSENTIAL_COOKIES_LIST}}
        
        <h3>Funktionella cookies</h3>
        {{FUNCTIONAL_COOKIES_LIST}}
        
        <h3>Analytiska cookies</h3>
        {{ANALYTICS_COOKIES_LIST}}
        
        <h3>Marknadsföringscookies</h3>
        {{ADVERTISING_COOKIES_LIST}}
        
        <h3>Detaljerad cookietabell</h3>
        {{COOKIE_DETAILS_TABLE}}
      </div>
      
      <div class="section">
        <h2>4. Hantera dina cookiepreferenser</h2>
        <p>Du kan kontrollera och hantera cookies på flera sätt:</p>
        <ul>
          <li>Använd vår cookiebanner för att acceptera eller avvisa icke-nödvändiga cookies</li>
          <li>Ändra dina cookiepreferenser när som helst genom våra cookieinställningar</li>
          <li>Konfigurera dina webbläsarinställningar för att blockera eller ta bort cookies</li>
          <li>Använd webbläsartillägg eller integritetsverktyg för att hantera cookies</li>
        </ul>
        <p>Observera att blockering av vissa cookies kan påverka din upplevelse på vår webbplats.</p>
      </div>
      
      <div class="section">
        <h2>5. Cookievaraktighet</h2>
        <p>Dina cookiepreferenser lagras i upp till 12 månader. Efter denna period kommer du att bli ombedd att förnya ditt samtycke.</p>
      </div>
      
      <div class="section">
        <h2>6. Kontaktinformation</h2>
        <p>Om du har några frågor om vår användning av cookies, vänligen kontakta oss:</p>
        <p><strong>Företag:</strong> {{COMPANY_NAME_OR_DOMAIN}}</p>
        <p><strong>E-post:</strong> {{CONTACT_EMAIL}}</p>
        <p><strong>Webbplats:</strong> {{DOMAIN_NAME}}</p>
      </div>
      
      <div class="section">
        <h2>7. Uppdateringar av denna policy</h2>
        <p>Vi kan uppdatera denna cookiepolicy från tid till annan för att återspegla ändringar i våra metoder eller av juridiska skäl. Eventuella ändringar kommer att publiceras på denna sida med ett uppdaterat revisionsdatum.</p>
      </div>
    `
  }
  
  // Default privacy policy template
  return `
    <h1>Integritetspolicy för {{COMPANY_NAME_OR_DOMAIN}}</h1>
    <p class="last-updated">Senast uppdaterad: {{LAST_UPDATED_DATE}}</p>
    
    <div class="section">
      <h2>1. Information vi samlar in</h2>
      <p>När du besöker {{DOMAIN_NAME}} kan vi samla in viss information om din enhet och din interaktion med vår webbplats genom cookies och liknande teknologier.</p>
    </div>
    
    <div class="section">
      <h2>2. Hur vi använder cookies</h2>
      <p>Vi använder cookies och liknande spårningsteknologier för att spåra aktivitet på vår webbplats och lagra viss information. De typer av cookies vi använder inkluderar:</p>
      <ul>
        <li><strong>Nödvändiga cookies:</strong> Dessa är nödvändiga för att webbplatsen ska fungera korrekt</li>
        <li><strong>Analytiska cookies:</strong> Dessa hjälper oss att förstå hur besökare interagerar med vår webbplats</li>
        <li><strong>Marknadsföringscookies:</strong> Dessa används för att leverera relevanta annonser</li>
        <li><strong>Funktionella cookies:</strong> Dessa möjliggör förbättrad funktionalitet och personalisering</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>3. Cookies som används</h2>
      <p>Nedan finns de cookies som för närvarande upptäckts på vår webbplats:</p>
      {{COOKIE_DETAILS_TABLE}}
    </div>
    
    <div class="section">
      <h2>4. Tredjepartstjänster</h2>
      <p>Vår webbplats kan använda tredjepartstjänster som samlar in, övervakar och analyserar användarbeteende.</p>
      <p>Vi använder {{FORM_PLUGIN_NAME}} för kontaktformulär och {{ECOM_PLUGIN_NAME}} för e-handel.</p>
    </div>
    
    <div class="section">
      <h2>5. Dina rättigheter och val</h2>
      <p>Du har rätt att:</p>
      <ul>
        <li>Acceptera eller avvisa cookies genom vår cookiebanner</li>
        <li>Ändra dina cookiepreferenser när som helst</li>
        <li>Begära information om de data vi samlar in</li>
        <li>Begära radering av dina personuppgifter</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>6. Datalagring</h2>
      <p>Vi behåller dina cookiepreferenser i upp till 12 månader. Efter denna period kommer du att bli ombedd att förnya ditt samtycke.</p>
    </div>
    
    <div class="section">
      <h2>7. Kontaktinformation</h2>
      <p>Om du har några frågor om denna integritetspolicy eller våra datametoder, vänligen kontakta oss:</p>
      <p><strong>Företag:</strong> {{COMPANY_NAME_OR_DOMAIN}}</p>
      <p><strong>Organisationsnummer:</strong> {{ORG_NUMBER}}</p>
      <p><strong>Adress:</strong> {{COMPANY_ADDRESS}}</p>
      <p><strong>E-post:</strong> {{CONTACT_EMAIL}}</p>
      <p><strong>Webbplats:</strong> {{DOMAIN_NAME}}</p>
    </div>
    
    <div class="section">
      <h2>8. Ändringar av denna policy</h2>
      <p>Vi kan uppdatera denna integritetspolicy från tid till annan. Eventuella ändringar kommer att publiceras på denna sida med ett uppdaterat revisionsdatum.</p>
    </div>
  `
}

export async function POST() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET'])
}