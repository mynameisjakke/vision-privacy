import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createValidationErrorResponse, 
  createNotFoundResponse, 
  createMethodNotAllowedResponse, 
  createDatabaseErrorResponse,
  createAuthErrorResponse 
} from '@/utils/response'
import { validateRequest, clientScanSchema } from '@/lib/validation'
import { extractApiToken, validateApiToken } from '@/utils/auth'
import { SitesDB, ClientScansDB } from '@/lib/database'
import { processClientScan } from '@/lib/scan-processor'

export async function POST(request: NextRequest) {
  try {
    // Extract and validate API token
    const token = extractApiToken(request)
    if (!token) {
      return createAuthErrorResponse('API token is required')
    }

    const tokenValidation = await validateApiToken(token)
    if (!tokenValidation.valid) {
      return createAuthErrorResponse(tokenValidation.error)
    }

    const site = tokenValidation.site!

    const body = await request.json()
    
    // Validate request data
    const validation = validateRequest(clientScanSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    const { site_id, detected_scripts, detected_cookies, scan_timestamp } = validation.data
    
    // Verify the site_id matches the authenticated site
    if (site_id !== site.id) {
      return createAuthErrorResponse('Site ID does not match authenticated site')
    }
    
    // Create client scan record
    const scanRecord = await ClientScansDB.create({
      site_id,
      detected_scripts: detected_scripts || [],
      detected_cookies: detected_cookies || [],
      scan_timestamp: new Date(scan_timestamp).toISOString(),
      processed: false
    })
    
    // Process scan data asynchronously
    try {
      const processingResult = await processClientScan(scanRecord)
      
      // Mark scan as processed
      await ClientScansDB.markProcessed(scanRecord.id)
      
      return createSuccessResponse({
        scan_id: scanRecord.id,
        processed: true,
        new_services_detected: processingResult.newServicesCount,
        policy_updated: processingResult.policyUpdated,
        notifications_sent: processingResult.notificationsSent,
        processing_summary: processingResult.summary
      }, 201)
      
    } catch (processingError) {
      console.error('Scan processing failed:', processingError)
      
      // Still return success for the scan creation, but indicate processing failed
      return createSuccessResponse({
        scan_id: scanRecord.id,
        processed: false,
        error: 'Scan recorded but processing failed',
        retry_scheduled: true
      }, 201)
    }
    
  } catch (error) {
    console.error('Client scan endpoint failed:', error)
    return createDatabaseErrorResponse('Failed to process client scan')
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract and validate API token
    const token = extractApiToken(request)
    if (!token) {
      return createAuthErrorResponse('API token is required')
    }

    const tokenValidation = await validateApiToken(token)
    if (!tokenValidation.valid) {
      return createAuthErrorResponse(tokenValidation.error)
    }

    const site = tokenValidation.site!
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const limit = parseInt(searchParams.get('limit') || '10')
    const processed = searchParams.get('processed')
    const after = searchParams.get('after')
    
    // Build filters
    const filters: any = { site_id: site.id }
    if (processed !== null) {
      filters.processed = processed === 'true'
    }
    if (after) {
      filters.scan_after = after
    }
    
    // Get scan history for the site
    const scans = await ClientScansDB.list(filters, { limit, sort_by: 'scan_timestamp', sort_order: 'desc' })
    
    return createSuccessResponse({
      scans: scans.data,
      pagination: scans.pagination,
      site_id: site.id
    })
    
  } catch (error) {
    console.error('Scan history retrieval failed:', error)
    return createDatabaseErrorResponse('Failed to retrieve scan history')
  }
}

export async function PUT() {
  return createMethodNotAllowedResponse(['GET', 'POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET', 'POST'])
}