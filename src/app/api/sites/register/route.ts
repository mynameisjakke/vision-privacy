import { NextRequest } from 'next/server'
import { createSuccessResponse, createValidationErrorResponse, createDatabaseErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, siteRegistrationSchema } from '@/lib/validation'
import { generateApiToken, generateSiteId, isValidDomain } from '@/utils/crypto'
import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validation = validateRequest(siteRegistrationSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    const { domain, wp_version, installed_plugins, detected_forms, plugin_version } = validation.data
    
    // Validate domain format
    if (!isValidDomain(domain)) {
      return createValidationErrorResponse('Invalid domain format')
    }
    
    // Generate unique identifiers
    const siteId = generateSiteId()
    const apiToken = generateApiToken()
    const widgetUrl = `${process.env.NEXT_PUBLIC_WIDGET_CDN_URL}/widget.js`
    
    // Insert site into database
    const { data: site, error } = await supabaseAdmin
      .from(TABLES.SITES)
      .insert({
        id: siteId,
        domain,
        api_token: apiToken,
        wp_version,
        plugin_version,
        installed_plugins,
        detected_forms,
        status: 'active'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Site registration error:', error)
      const dbError = handleSupabaseError(error)
      return createDatabaseErrorResponse(dbError.error)
    }
    
    return createSuccessResponse({
      site_id: siteId,
      api_token: apiToken,
      widget_url: widgetUrl,
      success: true
    }, 201)
    
  } catch (error) {
    console.error('Site registration failed:', error)
    return createDatabaseErrorResponse('Site registration failed')
  }
}

export async function GET() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['POST'])
}