import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createValidationErrorResponse, 
  createNotFoundResponse,
  createMethodNotAllowedResponse, 
  createDatabaseErrorResponse,
  createAuthErrorResponse 
} from '@/utils/response'
import { validateAdminToken } from '@/utils/auth'
import { PolicyTemplatesDB, SitePoliciesDB, SitesDB } from '@/lib/database'

/**
 * GET /api/admin/templates/[template_id] - Get specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { template_id: string } }
) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const { template_id } = params

    // Get template by ID
    const template = await PolicyTemplatesDB.findById(template_id)
    if (!template) {
      return createNotFoundResponse('Template not found')
    }

    // Get usage statistics for this template
    const usageStats = await getTemplateUsageStats(template_id)

    return createSuccessResponse({
      template,
      usage_stats: usageStats
    })

  } catch (error) {
    console.error('Template retrieval failed:', error)
    return createDatabaseErrorResponse('Failed to retrieve template')
  }
}

/**
 * PUT /api/admin/templates/[template_id] - Update specific template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { template_id: string } }
) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const { template_id } = params
    const body = await request.json()
    const adminUser = authResult.user || 'system'

    // Check if template exists
    const existingTemplate = await PolicyTemplatesDB.findById(template_id)
    if (!existingTemplate) {
      return createNotFoundResponse('Template not found')
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.content !== undefined) {
      updateData.content = body.content
    }

    if (body.version !== undefined) {
      updateData.version = body.version
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
      
      // If activating this template, deactivate others of the same type
      if (body.is_active) {
        await PolicyTemplatesDB.deactivateByType(existingTemplate.template_type)
      }
    }

    // Update template
    const updatedTemplate = await PolicyTemplatesDB.update(template_id, updateData)
    if (!updatedTemplate) {
      return createDatabaseErrorResponse('Failed to update template')
    }

    // If template was activated, apply to all sites
    let sitesUpdated = 0
    if (body.is_active && updatedTemplate.is_active) {
      sitesUpdated = await applyTemplateToAllSites(updatedTemplate)
    }

    // Log the update
    await logTemplateChange(adminUser, 'update', updatedTemplate, { sites_updated: sitesUpdated })

    return createSuccessResponse({
      template: updatedTemplate,
      sites_updated: sitesUpdated,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Template update failed:', error)
    return createDatabaseErrorResponse('Failed to update template')
  }
}

/**
 * DELETE /api/admin/templates/[template_id] - Delete specific template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { template_id: string } }
) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const { template_id } = params
    const adminUser = authResult.user || 'system'

    // Check if template exists
    const existingTemplate = await PolicyTemplatesDB.findById(template_id)
    if (!existingTemplate) {
      return createNotFoundResponse('Template not found')
    }

    // Check if template is currently active
    if (existingTemplate.is_active) {
      return createValidationErrorResponse('Cannot delete active template. Deactivate it first.')
    }

    // Check if template is being used by any sites
    const usageCount = await getTemplateUsageCount(template_id)
    if (usageCount > 0) {
      return createValidationErrorResponse(`Cannot delete template. It is currently used by ${usageCount} site(s).`)
    }

    // Delete template
    const deleted = await PolicyTemplatesDB.delete(template_id)
    if (!deleted) {
      return createDatabaseErrorResponse('Failed to delete template')
    }

    // Log the deletion
    await logTemplateChange(adminUser, 'delete', existingTemplate)

    return createSuccessResponse({
      message: 'Template deleted successfully',
      deleted_template: {
        id: existingTemplate.id,
        template_type: existingTemplate.template_type,
        version: existingTemplate.version
      }
    })

  } catch (error) {
    console.error('Template deletion failed:', error)
    return createDatabaseErrorResponse('Failed to delete template')
  }
}

/**
 * POST /api/admin/templates/[template_id]/activate - Activate specific template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { template_id: string } }
) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminToken(request)
    if (!authResult.valid) {
      return createAuthErrorResponse('Admin authentication required')
    }

    const { template_id } = params
    const adminUser = authResult.user || 'system'

    // Check if template exists
    const template = await PolicyTemplatesDB.findById(template_id)
    if (!template) {
      return createNotFoundResponse('Template not found')
    }

    // Deactivate other templates of the same type
    await PolicyTemplatesDB.deactivateByType(template.template_type)

    // Activate this template
    const activatedTemplate = await PolicyTemplatesDB.update(template_id, { 
      is_active: true,
      updated_at: new Date().toISOString()
    })

    if (!activatedTemplate) {
      return createDatabaseErrorResponse('Failed to activate template')
    }

    // Apply to all sites
    const sitesUpdated = await applyTemplateToAllSites(activatedTemplate)

    // Log the activation
    await logTemplateChange(adminUser, 'activate', activatedTemplate, { sites_updated: sitesUpdated })

    return createSuccessResponse({
      template: activatedTemplate,
      sites_updated: sitesUpdated,
      message: 'Template activated and applied to all sites'
    })

  } catch (error) {
    console.error('Template activation failed:', error)
    return createDatabaseErrorResponse('Failed to activate template')
  }
}

/**
 * Get template usage statistics
 */
async function getTemplateUsageStats(templateId: string): Promise<any> {
  try {
    // Get count of sites using this template version
    const usageCount = await getTemplateUsageCount(templateId)
    
    // Get template history (other versions)
    const template = await PolicyTemplatesDB.findById(templateId)
    if (!template) return { usage_count: 0, version_history: [] }

    const versionHistory = await PolicyTemplatesDB.getVersionHistory(template.template_type)
    
    return {
      usage_count: usageCount,
      version_history: versionHistory,
      is_latest: template.is_active
    }

  } catch (error) {
    console.error('Error getting template usage stats:', error)
    return { usage_count: 0, version_history: [] }
  }
}

/**
 * Get count of sites using a specific template
 */
async function getTemplateUsageCount(templateId: string): Promise<number> {
  try {
    const template = await PolicyTemplatesDB.findById(templateId)
    if (!template) return 0

    return await SitePoliciesDB.countByTemplateVersion(template.version)

  } catch (error) {
    console.error('Error getting template usage count:', error)
    return 0
  }
}

/**
 * Apply template to all active sites
 */
async function applyTemplateToAllSites(template: any): Promise<number> {
  try {
    // Get all active sites
    const sites = await SitesDB.getAllActiveSites()
    let updatedCount = 0

    for (const site of sites) {
      try {
        await SitePoliciesDB.updateTemplateVersion(site.id, template.version)
        updatedCount++
      } catch (error) {
        console.error(`Failed to update site ${site.id}:`, error)
      }
    }

    return updatedCount

  } catch (error) {
    console.error('Error applying template to sites:', error)
    return 0
  }
}

/**
 * Log template changes for audit purposes
 */
async function logTemplateChange(
  adminUser: string, 
  action: string, 
  template: any, 
  metadata?: any
): Promise<void> {
  try {
    console.log('Template Change Audit Log:', {
      admin_user: adminUser,
      action,
      template_id: template.id,
      template_type: template.template_type,
      version: template.version,
      timestamp: new Date().toISOString(),
      metadata
    })

    // TODO: Implement proper audit logging to database

  } catch (error) {
    console.error('Failed to log template change:', error)
  }
}