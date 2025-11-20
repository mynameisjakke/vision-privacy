import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as Sentry from '@sentry/nextjs'

export const runtime = 'edge'

/**
 * Metrics Endpoint
 * Provides system metrics for monitoring dashboard
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Simple auth check - you should implement proper auth
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.METRICS_API_KEY
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Get active sites count
    const { count: activeSites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    if (sitesError) throw sitesError
    
    // Get consent events in last 24h
    const { count: consents24h, error: consentsError } = await supabaseAdmin
      .from('consent_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString())
    
    if (consentsError) throw consentsError
    
    // Get scans in last 24h
    const { count: scans24h, error: scansError } = await supabaseAdmin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString())
    
    if (scansError) throw scansError
    
    // Get policy generations in last 7 days
    const { count: policies7d, error: policiesError } = await supabaseAdmin
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7d.toISOString())
    
    if (policiesError) throw policiesError
    
    return NextResponse.json({
      timestamp: now.toISOString(),
      metrics: {
        sites: {
          active: activeSites || 0,
          total: activeSites || 0
        },
        consents: {
          last24h: consents24h || 0,
          perHour: Math.round((consents24h || 0) / 24)
        },
        scans: {
          last24h: scans24h || 0,
          perHour: Math.round((scans24h || 0) / 24)
        },
        policies: {
          last7d: policies7d || 0,
          perDay: Math.round((policies7d || 0) / 7)
        }
      },
      health: 'operational'
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60' // Cache for 1 minute
      }
    })
    
  } catch (error) {
    console.error('Metrics fetch failed:', error)
    
    Sentry.captureException(error, {
      tags: { endpoint: 'metrics' }
    })
    
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
