import { NextRequest } from 'next/server'
import { createSuccessResponse, createValidationErrorResponse, createMethodNotAllowedResponse, createDatabaseErrorResponse } from '@/utils/response'
import { validateApiToken } from '@/utils/auth'
import { ConsentRecordsDB } from '@/lib/database'

interface ConsentStats {
  total_consents: number
  consents_by_category: Record<string, number>
  consents_by_site: Record<string, number>
  consent_rate: number
  recent_consents: number
  expired_consents: number
}

export async function GET(request: NextRequest) {
  try {
    // Validate API token for admin access
    const authResult = await validateApiToken(request)
    if (!authResult.valid) {
      return createValidationErrorResponse('Invalid or missing API token')
    }
    
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')
    const days = parseInt(searchParams.get('days') || '30')
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return createValidationErrorResponse('Days parameter must be between 1 and 365')
    }
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get consent statistics
    const stats = await getConsentStats(siteId, startDate, endDate)
    
    return createSuccessResponse({
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        days
      },
      site_id: siteId || 'all',
      stats
    })
    
  } catch (error) {
    console.error('Consent stats retrieval failed:', error)
    return createDatabaseErrorResponse('Failed to retrieve consent statistics')
  }
}

async function getConsentStats(siteId: string | null, startDate: Date, endDate: Date): Promise<ConsentStats> {
  try {
    // Get total consents in period
    const totalConsents = await ConsentRecordsDB.countByDateRange(siteId, startDate, endDate)
    
    // Get consents by category
    const consentsByCategory = await ConsentRecordsDB.countByCategory(siteId, startDate, endDate)
    
    // Get consents by site (if not filtering by specific site)
    const consentsBySite = siteId ? {} : await ConsentRecordsDB.countBySite(startDate, endDate)
    
    // Get recent consents (last 7 days)
    const recentStartDate = new Date()
    recentStartDate.setDate(recentStartDate.getDate() - 7)
    const recentConsents = await ConsentRecordsDB.countByDateRange(siteId, recentStartDate, endDate)
    
    // Get expired consents
    const expiredConsents = await ConsentRecordsDB.countExpired(siteId)
    
    // Calculate consent rate (assuming we track page views separately)
    // For now, we'll use a placeholder calculation
    const consentRate = totalConsents > 0 ? Math.min(totalConsents / (totalConsents * 1.2), 1) : 0
    
    return {
      total_consents: totalConsents,
      consents_by_category: consentsByCategory,
      consents_by_site: consentsBySite,
      consent_rate: Math.round(consentRate * 100) / 100, // Round to 2 decimal places
      recent_consents: recentConsents,
      expired_consents: expiredConsents
    }
    
  } catch (error) {
    console.error('Error calculating consent stats:', error)
    throw error
  }
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