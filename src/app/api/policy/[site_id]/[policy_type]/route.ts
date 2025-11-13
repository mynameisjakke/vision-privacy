import { NextRequest, NextResponse } from 'next/server'
import { PolicyTemplateEngine } from '@/lib/policy-template'
import { PolicyTemplatesDB } from '@/lib/database'
import { CacheManager, CACHE_KEYS } from '@/lib/cache'
import { ErrorCodes } from '@/types'

/**
 * GET /api/policy/[site_id]/[policy_type]
 * 
 * Fetch and render a specific policy for a site
 * 
 * @param site_id - UUID or site identifier
 * @param policy_type - 'cookie' | 'privacy'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { site_id: string; policy_type: string } }
) {
  try {
    const { site_id, policy_type } = params

    // Validate policy_type
    if (!['cookie', 'privacy'].includes(policy_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid policy type',
          message: 'Policy type must be either "cookie" or "privacy"',
          code: ErrorCodes.VALIDATION_ERROR
        },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `${CACHE_KEYS.POLICY_TEMPLATE}rendered:${site_id}:${policy_type}`
    const cachedPolicy = await CacheManager.get<any>(cacheKey)
    
    if (cachedPolicy) {
      return NextResponse.json(
        {
          success: true,
          data: cachedPolicy
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=300', // 5 minutes
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Map policy_type to template_type
    const templateType = policy_type === 'cookie' ? 'cookie_notice' : 'policy'

    // Fetch active policy template (uses cache)
    const template = await PolicyTemplateEngine.getActiveTemplate(templateType)
    
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Policy template not found',
          message: `No active ${policy_type} policy template found`,
          code: 1009
        },
        { status: 404 }
      )
    }

    // Fetch site data and cookies from database
    let variables
    try {
      variables = await PolicyTemplateEngine.getSiteVariables(site_id)
    } catch (error: any) {
      // Check if error is due to site not found
      if (error.message?.includes('Site not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Site not found',
            message: `Site with ID ${site_id} not found`,
            code: ErrorCodes.INVALID_SITE_ID
          },
          { status: 404 }
        )
      }
      throw error
    }

    // Render template with variables
    const renderedContent = PolicyTemplateEngine.renderTemplate(
      template.content,
      variables
    )

    // Prepare response data
    const responseData = {
      title: policy_type === 'cookie' ? 'Cookiepolicy' : 'Integritetspolicy',
      content: renderedContent,
      lastUpdated: template.updated_at,
      version: template.version
    }

    // Cache the rendered policy for 5 minutes
    await CacheManager.set(cacheKey, responseData, 300)

    // Return rendered policy
    return NextResponse.json(
      {
        success: true,
        data: responseData
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error: any) {
    console.error('Policy API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to render policy',
        message: error.message || 'An unexpected error occurred',
        code: 1010
      },
      { status: 500 }
    )
  }
}
