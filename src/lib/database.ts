import { supabaseAdmin, handleSupabaseError, TABLES } from './supabase'
import { DatabaseMonitor } from './performance'
import type { 
  Site, 
  ConsentRecord, 
  ClientScan, 
  PolicyTemplate, 
  CookieCategoryDB, 
  SitePolicy,
  PaginationParams,
  PaginatedResponse,
  SiteFilters,
  ConsentFilters,
  ScanFilters
} from '@/types'

// Use admin client for server-side operations
const supabase = supabaseAdmin

// Database utility functions

/**
 * Sites table operations
 */
export class SitesDB {
  static async create(siteData: Omit<Site, 'id' | 'created_at' | 'updated_at'>): Promise<Site> {
    const { data, error } = await supabase
      .from(TABLES.SITES)
      .insert(siteData)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to create site: ${errorMsg}`)
    }
    return data
  }

  static async findById(id: string): Promise<Site | null> {
    const startTime = performance.now()
    const query = `SELECT * FROM ${TABLES.SITES} WHERE id = $1`
    
    try {
      const { data, error } = await supabase
        .from(TABLES.SITES)
        .select('*')
        .eq('id', id)
        .single()
      
      const duration = performance.now() - startTime
      DatabaseMonitor.recordQuery(query, duration, !!error)
      
      if (error && error.code !== 'PGRST116') {
        const { error: errorMsg } = handleSupabaseError(error)
        throw new Error(`Failed to find site: ${errorMsg}`)
      }
      return data
    } catch (error) {
      const duration = performance.now() - startTime
      DatabaseMonitor.recordQuery(query, duration, true)
      throw error
    }
  }

  // Alias for backward compatibility
  static async getById(id: string): Promise<Site | null> {
    return this.findById(id)
  }

  static async findByDomain(domain: string): Promise<Site | null> {
    const { data, error } = await supabase
      .from(TABLES.SITES)
      .select('*')
      .eq('domain', domain)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find site by domain: ${errorMsg}`)
    }
    return data
  }

  static async findByToken(apiToken: string): Promise<Site | null> {
    const { data, error } = await supabase
      .from(TABLES.SITES)
      .select('*')
      .eq('api_token', apiToken)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find site by token: ${errorMsg}`)
    }
    return data
  }

  static async update(id: string, updates: Partial<Site>): Promise<Site> {
    const { data, error } = await supabase
      .from(TABLES.SITES)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to update site: ${errorMsg}`)
    }
    return data
  }

  static async list(filters: SiteFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResponse<Site>> {
    let query = supabase.from(TABLES.SITES).select('*', { count: 'exact' })

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.domain) query = query.ilike('domain', `%${filters.domain}%`)
    if (filters.created_after) query = query.gte('created_at', filters.created_after)
    if (filters.created_before) query = query.lte('created_at', filters.created_before)

    // Apply pagination
    const page = pagination.page || 1
    const limit = pagination.limit || 20
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    // Apply sorting
    const sortBy = pagination.sort_by || 'created_at'
    const sortOrder = pagination.sort_order || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error, count } = await query

    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to list sites: ${errorMsg}`)
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    }
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.SITES)
      .delete()
      .eq('id', id)
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to delete site: ${errorMsg}`)
    }
  }
}

/**
 * Consent records table operations
 */
export class ConsentRecordsDB {
  static async create(consentData: Omit<ConsentRecord, 'id' | 'created_at'>): Promise<ConsentRecord> {
    const { data, error } = await supabase
      .from(TABLES.CONSENT_RECORDS)
      .insert(consentData)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to create consent record: ${errorMsg}`)
    }
    return data
  }

  static async findBySiteAndVisitor(siteId: string, visitorHash: string): Promise<ConsentRecord | null> {
    const { data, error } = await supabase
      .from(TABLES.CONSENT_RECORDS)
      .select('*')
      .eq('site_id', siteId)
      .eq('visitor_hash', visitorHash)
      .gt('expires_at', new Date().toISOString())
      .order('consent_timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find consent record: ${errorMsg}`)
    }
    return data
  }

  // Alias for backward compatibility
  static async getByVisitorHash(siteId: string, visitorHash: string): Promise<ConsentRecord | null> {
    return this.findBySiteAndVisitor(siteId, visitorHash)
  }

  static async update(id: string, updates: Partial<ConsentRecord>): Promise<ConsentRecord> {
    const { data, error } = await supabase
      .from(TABLES.CONSENT_RECORDS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to update consent record: ${errorMsg}`)
    }
    return data
  }

  static async deleteByVisitorHash(siteId: string, visitorHash: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.CONSENT_RECORDS)
      .delete()
      .eq('site_id', siteId)
      .eq('visitor_hash', visitorHash)
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to delete consent record: ${errorMsg}`)
    }
    return true
  }

  static async list(filters: ConsentFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResponse<ConsentRecord>> {
    let query = supabase.from(TABLES.CONSENT_RECORDS).select('*', { count: 'exact' })

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id)
    if (filters.consent_after) query = query.gte('consent_timestamp', filters.consent_after)
    if (filters.consent_before) query = query.lte('consent_timestamp', filters.consent_before)
    if (filters.categories?.length) {
      query = query.overlaps('consent_categories', filters.categories)
    }

    // Apply pagination
    const page = pagination.page || 1
    const limit = pagination.limit || 20
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    // Apply sorting
    const sortBy = pagination.sort_by || 'consent_timestamp'
    const sortOrder = pagination.sort_order || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error, count } = await query

    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to list consent records: ${errorMsg}`)
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    }
  }

  static async deleteExpired(): Promise<number> {
    const { data, error } = await supabase
      .from(TABLES.CONSENT_RECORDS)
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to delete expired consents: ${errorMsg}`)
    }
    return data?.length || 0
  }
}

/**
 * Client scans table operations
 */
export class ClientScansDB {
  static async create(scanData: Omit<ClientScan, 'id' | 'created_at'>): Promise<ClientScan> {
    const { data, error } = await supabase
      .from(TABLES.CLIENT_SCANS)
      .insert(scanData)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to create client scan: ${errorMsg}`)
    }
    return data
  }

  static async findById(id: string): Promise<ClientScan | null> {
    const { data, error } = await supabase
      .from(TABLES.CLIENT_SCANS)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find client scan: ${errorMsg}`)
    }
    return data
  }

  static async markProcessed(id: string): Promise<ClientScan> {
    const { data, error } = await supabase
      .from(TABLES.CLIENT_SCANS)
      .update({ processed: true })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to mark scan as processed: ${errorMsg}`)
    }
    return data
  }

  static async list(filters: ScanFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResponse<ClientScan>> {
    let query = supabase.from(TABLES.CLIENT_SCANS).select('*', { count: 'exact' })

    // Apply filters
    if (filters.site_id) query = query.eq('site_id', filters.site_id)
    if (filters.processed !== undefined) query = query.eq('processed', filters.processed)
    if (filters.scan_after) query = query.gte('scan_timestamp', filters.scan_after)
    if (filters.scan_before) query = query.lte('scan_timestamp', filters.scan_before)

    // Apply pagination
    const page = pagination.page || 1
    const limit = pagination.limit || 20
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    // Apply sorting
    const sortBy = pagination.sort_by || 'scan_timestamp'
    const sortOrder = pagination.sort_order || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error, count } = await query

    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to list client scans: ${errorMsg}`)
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    }
  }

  static async getLatestBySiteId(siteId: string): Promise<ClientScan | null> {
    const { data, error } = await supabase
      .from(TABLES.CLIENT_SCANS)
      .select('*')
      .eq('site_id', siteId)
      .eq('processed', true)
      .order('scan_timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to get latest scan: ${errorMsg}`)
    }
    return data
  }

  static async markProcessed(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.CLIENT_SCANS)
      .update({ processed: true })
      .eq('id', id)
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to mark scan as processed: ${errorMsg}`)
    }
    return true
  }
}

/**
 * Policy templates table operations
 */
export class PolicyTemplatesDB {
  static async create(templateData: Omit<PolicyTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PolicyTemplate> {
    const { data, error } = await supabase
      .from(TABLES.POLICY_TEMPLATES)
      .insert(templateData)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to create policy template: ${errorMsg}`)
    }
    return data
  }

  static async findActive(templateType: 'banner' | 'policy' | 'cookie_notice'): Promise<PolicyTemplate | null> {
    const { data, error } = await supabase
      .from(TABLES.POLICY_TEMPLATES)
      .select('*')
      .eq('template_type', templateType)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find active template: ${errorMsg}`)
    }
    return data
  }

  static async setActive(id: string, templateType: string): Promise<PolicyTemplate> {
    // First deactivate all templates of this type
    await supabase
      .from(TABLES.POLICY_TEMPLATES)
      .update({ is_active: false })
      .eq('template_type', templateType)

    // Then activate the specified template
    const { data, error } = await supabase
      .from(TABLES.POLICY_TEMPLATES)
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to set active template: ${errorMsg}`)
    }
    return data
  }

  static async list(templateType?: string): Promise<PolicyTemplate[]> {
    let query = supabase.from(TABLES.POLICY_TEMPLATES).select('*')
    
    if (templateType) {
      query = query.eq('template_type', templateType)
    }
    
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to list policy templates: ${errorMsg}`)
    }
    return data || []
  }
}

/**
 * Cookie categories table operations
 */
export class CookieCategoriesDB {
  static async create(categoryData: Omit<CookieCategoryDB, 'id' | 'created_at' | 'updated_at'>): Promise<CookieCategoryDB> {
    const { data, error } = await supabase
      .from(TABLES.COOKIE_CATEGORIES)
      .insert(categoryData)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to create cookie category: ${errorMsg}`)
    }
    return data
  }

  static async listActive(): Promise<CookieCategoryDB[]> {
    const { data, error } = await supabase
      .from(TABLES.COOKIE_CATEGORIES)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to list active cookie categories: ${errorMsg}`)
    }
    return data || []
  }

  static async update(id: string, updates: Partial<CookieCategoryDB>): Promise<CookieCategoryDB> {
    const { data, error } = await supabase
      .from(TABLES.COOKIE_CATEGORIES)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to update cookie category: ${errorMsg}`)
    }
    return data
  }
}

/**
 * Site policies table operations
 */
export class SitePoliciesDB {
  static async upsert(policyData: Omit<SitePolicy, 'id' | 'created_at'>): Promise<SitePolicy> {
    const { data, error } = await supabase
      .from(TABLES.SITE_POLICIES)
      .upsert(policyData, { onConflict: 'site_id' })
      .select()
      .single()
    
    if (error) {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to upsert site policy: ${errorMsg}`)
    }
    return data
  }

  static async findBySiteId(siteId: string): Promise<SitePolicy | null> {
    const { data, error } = await supabase
      .from(TABLES.SITE_POLICIES)
      .select('*')
      .eq('site_id', siteId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      const { error: errorMsg } = handleSupabaseError(error)
      throw new Error(`Failed to find site policy: ${errorMsg}`)
    }
    return data
  }
}

/**
 * Utility functions
 */
export class DatabaseUtils {
  static async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase.from(TABLES.SITES).select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }

  static async getStats() {
    const [sitesCount, consentsCount, scansCount] = await Promise.all([
      supabase.from(TABLES.SITES).select('id', { count: 'exact', head: true }),
      supabase.from(TABLES.CONSENT_RECORDS).select('id', { count: 'exact', head: true }),
      supabase.from(TABLES.CLIENT_SCANS).select('id', { count: 'exact', head: true })
    ])

    return {
      total_sites: sitesCount.count || 0,
      total_consents: consentsCount.count || 0,
      total_scans: scansCount.count || 0
    }
  }
}