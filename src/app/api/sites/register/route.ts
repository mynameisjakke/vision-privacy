import { NextRequest } from 'next/server'
import { createSuccessResponse, createValidationErrorResponse, createDatabaseErrorResponse, createMethodNotAllowedResponse } from '@/utils/response'
import { validateRequest, siteRegistrationSchema } from '@/lib/validation'
import { generateApiToken, generateSiteId, isValidDomain } from '@/utils/crypto'
import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase'
import { withAuthMiddleware, InputSanitizer, createAuthenticatedResponse } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  // Apply authentication and rate limiting middleware
  const authResult = await withAuthMiddleware(request, {
    requireAuth: false, // Registration doesn't require existing auth
    rateLimitType: 'registration',
    allowedMethods: ['POST'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult

  try {
    const body = await request.json()
    
    // Sanitize input data
    const sanitizedBody = InputSanitizer.sanitizeJson(body)
    
    // Extract site_id if provided (for updates)
    const existingSiteId = sanitizedBody.site_id ? InputSanitizer.sanitizeString(sanitizedBody.site_id) : null
    
    // Validate request data
    const validation = validateRequest(siteRegistrationSchema, sanitizedBody)
    if (!validation.success) {
      return createAuthenticatedResponse(
        {
          error: 'Validation failed',
          message: validation.error,
          code: 1004,
        },
        400,
        context,
        '*',
        request
      )
    }
    
    const { domain, wp_version, installed_plugins, detected_forms, plugin_version } = validation.data
    
    // Validate and sanitize domain
    const sanitizedDomain = InputSanitizer.sanitizeUrl(domain)
    if (!isValidDomain(sanitizedDomain)) {
      return createAuthenticatedResponse(
        {
          error: 'Invalid domain format',
          message: 'The provided domain is not valid',
          code: 1004,
        },
        400,
        context,
        '*',
        request
      )
    }
    
    const widgetUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/widget/script`
    
    // UPDATE MODE: site_id provided
    if (existingSiteId) {
      // Check if site exists
      const { data: existingSite, error: fetchError } = await supabaseAdmin
        .from(TABLES.SITES)
        .select('id, api_token')
        .eq('id', existingSiteId)
        .is('deleted_at', null)
        .single()
      
      if (existingSite) {
        // Verify token if provided in Authorization header
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')
        
        if (token && existingSite.api_token !== token) {
          return createAuthenticatedResponse(
            {
              error: 'Unauthorized',
              message: 'Invalid token for this site',
              code: 1003,
            },
            401,
            context,
            '*',
            request
          )
        }
        
        // Update existing site
        const { data: updatedSite, error: updateError } = await supabaseAdmin
          .from(TABLES.SITES)
          .update({
            domain: sanitizedDomain,
            wp_version: InputSanitizer.sanitizeString(wp_version),
            plugin_version: InputSanitizer.sanitizeString(plugin_version),
            installed_plugins: installed_plugins?.map(plugin => InputSanitizer.sanitizeString(plugin)) || [],
            detected_forms: detected_forms?.map(form => ({
              type: InputSanitizer.sanitizeString(form.type),
              count: form.count,
              plugin_name: form.plugin_name ? InputSanitizer.sanitizeString(form.plugin_name) : undefined
            })),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSiteId)
          .select()
          .single()
        
        if (updateError) {
          console.error('Site update error:', updateError)
          const dbError = handleSupabaseError(updateError)
          return createAuthenticatedResponse(
            {
              error: 'Database error',
              message: dbError.error,
              code: 1005,
            },
            500,
            context,
            '*',
            request
          )
        }
        
        console.log(`Site ${existingSiteId} updated successfully`)
        
        return createAuthenticatedResponse(
          {
            site_id: existingSite.id,
            api_token: existingSite.api_token,
            widget_url: widgetUrl,
            success: true,
            updated: true
          },
          200,
          context,
          '*',
          request
        )
      }
      
      // Site not found with provided site_id, fall through to create new one
      console.log(`Site ${existingSiteId} not found, creating new registration`)
    }
    
    // CREATE MODE: Check if domain already registered
    const { data: existingByDomain, error: domainCheckError } = await supabaseAdmin
      .from(TABLES.SITES)
      .select('id, api_token')
      .eq('domain', sanitizedDomain)
      .is('deleted_at', null)
      .single()
    
    if (existingByDomain) {
      // Domain already registered, return existing site
      console.log(`Domain ${sanitizedDomain} already registered as ${existingByDomain.id}`)
      
      return createAuthenticatedResponse(
        {
          site_id: existingByDomain.id,
          api_token: existingByDomain.api_token,
          widget_url: widgetUrl,
          success: true,
          existing: true
        },
        200,
        context,
        '*',
        request
      )
    }
    
    // CREATE MODE: Generate new site
    const siteId = generateSiteId()
    const apiToken = generateApiToken()
    
    // Insert site into database
    const { data: site, error } = await supabaseAdmin
      .from(TABLES.SITES)
      .insert({
        id: siteId,
        domain: sanitizedDomain,
        api_token: apiToken,
        wp_version: InputSanitizer.sanitizeString(wp_version),
        plugin_version: InputSanitizer.sanitizeString(plugin_version),
        installed_plugins: installed_plugins?.map(plugin => InputSanitizer.sanitizeString(plugin)) || [],
        detected_forms: detected_forms?.map(form => ({
          type: InputSanitizer.sanitizeString(form.type),
          count: form.count,
          plugin_name: form.plugin_name ? InputSanitizer.sanitizeString(form.plugin_name) : undefined
        })),
        status: 'active'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Site registration error:', error)
      const dbError = handleSupabaseError(error)
      return createAuthenticatedResponse(
        {
          error: 'Database error',
          message: dbError.error,
          code: 1005,
        },
        500,
        context,
        '*',
        request
      )
    }
    
    console.log(`New site ${siteId} created successfully`)
    
    return createAuthenticatedResponse(
      {
        site_id: siteId,
        api_token: apiToken,
        widget_url: widgetUrl,
        success: true,
        created: true
      },
      201,
      context,
      '*',
      request
    )
    
  } catch (error) {
    console.error('Site registration failed:', error)
    return createAuthenticatedResponse(
      {
        error: 'Registration failed',
        message: 'Site registration failed due to an internal error',
        code: 1005,
      },
      500,
      context,
      '*',
      request
    )
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