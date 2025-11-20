import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

/**
 * Health Check Endpoint
 * Used for uptime monitoring and system status checks
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const { error: dbError } = await supabaseAdmin
      .from('sites')
      .select('id')
      .limit(1)
      .single()
    
    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for health check
      throw new Error(`Database check failed: ${dbError.message}`)
    }
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'operational',
      },
      performance: {
        responseTime: `${responseTime}ms`
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        responseTime: `${responseTime}ms`
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  }
}
