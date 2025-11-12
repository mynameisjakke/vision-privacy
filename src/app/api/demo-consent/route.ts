import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'

/**
 * Demo consent endpoint for testing
 * This simulates consent submission without database storage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the consent for demo purposes
    console.log('Demo consent received:', {
      site_id: body.site_id,
      consent_categories: body.consent_categories,
      timestamp: body.timestamp,
      visitor_hash: body.visitor_hash
    })

    // Simulate successful consent storage
    return createSuccessResponse({
      success: true,
      message: 'Consent recorded successfully',
      consent_id: `demo-consent-${Date.now()}`,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      categories_accepted: body.consent_categories || []
    })

  } catch (error) {
    console.error('Demo consent error:', error)
    return createSuccessResponse({
      success: false,
      error: 'Failed to record consent',
      message: 'This is a demo endpoint - consent was not actually stored'
    }, 500)
  }
}