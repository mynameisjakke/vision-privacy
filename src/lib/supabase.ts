import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
    supabaseServiceKey: !!supabaseServiceKey
  })
  throw new Error('Missing Supabase environment variables')
}

// Client for public operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database table names
export const TABLES = {
  SITES: 'sites',
  CONSENT_RECORDS: 'consent_records',
  CLIENT_SCANS: 'client_scans',
  POLICY_TEMPLATES: 'policy_templates',
  COOKIE_CATEGORIES: 'cookie_categories',
  SITE_POLICIES: 'site_policies'
} as const

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error)
  
  if (error?.code === 'PGRST116') {
    return { error: 'Resource not found', code: 404 }
  }
  
  if (error?.code === '23505') {
    return { error: 'Resource already exists', code: 409 }
  }
  
  if (error?.code === '23503') {
    return { error: 'Invalid reference', code: 400 }
  }
  
  return { error: error?.message || 'Database error', code: 500 }
}