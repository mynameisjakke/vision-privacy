import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/utils/response'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { error } = await supabase.from('sites').select('count').limit(1)
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: error ? 'unhealthy' : 'healthy',
      version: '1.0.0'
    }
    
    return createSuccessResponse(health)
  } catch (error) {
    console.error('Health check failed:', error)
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'unhealthy',
      version: '1.0.0',
      error: 'Health check failed'
    }
    
    return createSuccessResponse(health, 503)
  }
}