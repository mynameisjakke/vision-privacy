import { NextRequest } from 'next/server'
import { createAuthenticatedResponse, withAuthMiddleware } from '@/lib/auth-middleware'
import { supabaseAdmin, TABLES, handleSupabaseError } from '@/lib/supabase'

/**
 * Verify if a site registration is still valid
 * GET /api/sites/verify/[siteId]
 * 
 * Headers:
 * - Authorization: Bearer {api_token}
 * 
 * Returns:
 * - 200: Site is valid
 * - 401: Invalid or missing token
 * - 404: Site not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  // Apply authentication middleware
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true, // Verification requires authentication
    rateLimitType: 'api',
    allowedMethods: ['GET'],
    corsOrigins: '*',
  })

  if (!authResult.success) {
    return authResult.response
  }

  const { context } = authResult
  const { siteId } = params

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return createAuthenticatedResponse(
        {
          success: false,
          message: 'Missing authorization token',
          error: 'UNAUTHORIZED'
        },
        401,
        context,
        '*',
        request
      )
    }

    // Query database for site
    const { data: site, error } = await supabaseAdmin
      .from(TABLES.SITES)
      .select('id, domain, widget_url, status, api_token, updated_at')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single()

    if (error || !site) {
      console.log(`Site verification failed for ${siteId}:`, error?.message || 'Site not found')
      return createAuthenticatedResponse(
        {
          success: false,
          message: 'Site not found',
          error: 'SITE_NOT_FOUND'
        },
        404,
        context,
        '*',
        request
      )
    }

    // Verify token matches site
    if (site.api_token !== token) {
      console.log(`Token mismatch for site ${siteId}`)
      return createAuthenticatedResponse(
        {
          success: false,
          message: 'Invalid token for this site',
          error: 'UNAUTHORIZED'
        },
        401,
        context,
        '*',
        request
      )
    }

    // Generate widget URL
    const widgetUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/widget/script`

    // Return success with site data
    return createAuthenticatedResponse(
      {
        success: true,
        site_id: site.id,
        widget_url: widgetUrl,
        status: site.status || 'active',
        domain: site.domain,
        last_updated: site.updated_at
      },
      200,
      context,
      '*',
      request
    )

  } catch (error) {
    console.error('Site verification error:', error)
    return createAuthenticatedResponse(
      {
        success: false,
        message: 'Internal server error',
        error: 'SERVER_ERROR'
      },
      500,
      context,
      '*',
      request
    )
  }
}
