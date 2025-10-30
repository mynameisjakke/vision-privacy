import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createValidationErrorResponse, 
  createMethodNotAllowedResponse, 
  createDatabaseErrorResponse,
  createAuthErrorResponse 
} from '@/utils/response'
import { validateRequest, templateUpdateSchema, paginationSchema } from '@/lib/validation'
import { validateAdminToken } from '@/utils/auth'
import { PolicyTemplatesDB, CookieCategoriesDB, SitePoliciesDB } from '@/lib/database'

/**
 * GET /api/admin/templates - List all templates with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const paginationData = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'
    }
    
    const validation = validateRequest(paginationSchema, paginationData)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { page, limit, sort_by, sort_order } = validation.data
    const templateType = searchParams.get('type') as 'banner' | 'policy' | 'cookie_notice' | null
    const activeOnly = searchParams.get('active') === 'true'

    // Build filters
    const filters: any = {}
    if (templateType) {
      filters.template_type = templateType
    }
    if (activeOnly) {
      filters.is_active = true
    }

    // Get templates with pagination
    const templates = await PolicyTemplatesDB.list(filters, { 
      page, 
      limit, 
      sort_by, 
      sort_order 
    })

    // Get cookie categories for reference
    const cookieCategories = await CookieCategoriesDB.listAll()

    return createSuccessResponse({
      templates: templates.data,
      pagination: templates.pagination,
      cookie_categories: cookieCategories,
      filters: {
        type: templateType,
        active_only: activeOnly
      }
    })

  } catch (error) {
    console.error('Template listing failed:', error)
    return createDatabaseErrorResponse('Failed to retrieve templates')
  }
}

/**
 * PUT /api/admin/templates - Update global templates and apply to all sites
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const body = await request.json()
    
    // Validate request data
    const validation = validateRequest(templateUpdateSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    const { banner_template, policy_template, cookie_categories, version } = validation.data
    const adminUser = authResult.user || 'system'

    const results = {
      banner_updated: false,
      policy_updated: false,
      categories_updated: false,
      sites_updated: 0,
      version_created: version
    }

    // Update banner template if provided
    if (banner_template) {
      // Deactivate current banner template
      await PolicyTemplatesDB.deactivateByType('banner')
      
      // Create new banner template
      const newBannerTemplate = await PolicyTemplatesDB.create({
        template_type: 'banner',
        content: banner_template,
        version,
        is_active: true,
        created_by: adminUser
      })
      
      if (newBannerTemplate) {
        results.banner_updated = true
      }
    }

    // Update policy template if provided
    if (policy_template) {
      // Deactivate current policy template
      await PolicyTemplatesDB.deactivateByType('policy')
      
      // Create new policy template
      const newPolicyTemplate = await PolicyTemplatesDB.create({
        template_type: 'policy',
        content: policy_template,
        version,
        is_active: true,
        created_by: adminUser
      })
      
      if (newPolicyTemplate) {
        results.policy_updated = true
      }
    }

    // Update cookie categories if provided
    if (cookie_categories && cookie_categories.length > 0) {
      // Deactivate all current categories
      await CookieCategoriesDB.deactivateAll()
      
      // Create new categories
      for (const category of cookie_categories) {
        await CookieCategoriesDB.create({
          name: category.name,
          description: category.description,
          is_essential: category.is_essential,
          sort_order: category.sort_order,
          is_active: true
        })
      }
      
      results.categories_updated = true
    }

    // Apply templates to all active sites
    if (results.banner_updated || results.policy_updated) {
      const sitesUpdated = await applyTemplatesToAllSites(version)
      results.sites_updated = sitesUpdated
    }

    // Log the template update for audit purposes
    await logTemplateUpdate(adminUser, version, results)

    return createSuccessResponse({
      success: true,
      message: 'Templates updated successfully',
      results,
      applied_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Template update failed:', error)
    return createDatabaseErrorResponse('Failed to update templates')
  }
}

/**
 * POST /api/admin/templates - Create a new template version
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const body = await request.json()
    const adminUser = authResult.user || 'system'

    // Validate required fields
    if (!body.template_type || !body.content || !body.version) {
      return createValidationErrorResponse('template_type, content, and version are required')
    }

    // Create new template (inactive by default)
    const newTemplate = await PolicyTemplatesDB.create({
      template_type: body.template_type,
      content: body.content,
      version: body.version,
      is_active: false,
      created_by: adminUser
    })

    if (!newTemplate) {
      return createDatabaseErrorResponse('Failed to create template')
    }

    return createSuccessResponse({
      template: newTemplate,
      message: 'Template created successfully (inactive)'
    }, 201)

  } catch (error) {
    console.error('Template creation failed:', error)
    return createDatabaseErrorResponse('Failed to create template')
  }
}

/**
 * Apply updated templates to all active sites
 */
async function applyTemplatesToAllSites(version: string): Promise<number> {
  try {
    // Get all active sites
    const sites = await PolicyTemplatesDB.getAllActiveSites()
    let updatedCount = 0

    for (const site of sites) {
      try {
        // Update site policy with new template version
        await SitePoliciesDB.updateTemplateVersion(site.id, version)
        updatedCount++
      } catch (error) {
        console.error(`Failed to update site ${site.id}:`, error)
        // Continue with other sites even if one fails
      }
    }

    return updatedCount

  } catch (error) {
    console.error('Error applying templates to sites:', error)
    return 0
  }
}

/**
 * Log template updates for audit purposes
 */
async function logTemplateUpdate(
  adminUser: string, 
  version: string, 
  results: any
): Promise<void> {
  try {
    // In a real implementation, this would write to an audit log table
    // For now, we'll just console log
    console.log('Template Update Audit Log:', {
      admin_user: adminUser,
      version,
      timestamp: new Date().toISOString(),
      changes: results
    })

    // TODO: Implement proper audit logging to database
    // await AuditLogDB.create({
    //   action: 'template_update',
    //   user: adminUser,
    //   details: { version, results },
    //   timestamp: new Date()
    // })

  } catch (error) {
    console.error('Failed to log template update:', error)
    // Don't throw error as this is non-critical
  }
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET', 'POST', 'PUT'])
}