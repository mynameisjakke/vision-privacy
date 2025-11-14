import { z } from 'zod'

// Site registration validation schema
export const siteRegistrationSchema = z.object({
  domain: z.string().url('Invalid domain URL').min(1, 'Domain is required'),
  wp_version: z.string().min(1, 'WordPress version is required'),
  installed_plugins: z.array(z.string()).default([]),
  detected_forms: z.array(z.object({
    type: z.string(),
    count: z.number().min(0),
    plugin_name: z.string().optional()
  })).default([]),
  plugin_version: z.string().min(1, 'Plugin version is required'),
  company_info: z.object({
    company_name: z.string().optional(),
    contact_email: z.string().email('Invalid email format').or(z.literal('')).optional(),
    org_number: z.string().optional(),
    address: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    dpo_email: z.string().email('Invalid email format').or(z.literal('')).optional()
  }).optional()
})

// Consent request validation schema
export const consentRequestSchema = z.object({
  site_id: z.string().uuid('Invalid site ID'),
  visitor_hash: z.string().min(1, 'Visitor hash is required'),
  consent_categories: z.array(z.string()).min(0),
  timestamp: z.string().datetime('Invalid timestamp'),
  user_agent: z.string().min(1, 'User agent is required')
})

// Client scan validation schema
export const clientScanSchema = z.object({
  site_id: z.string().uuid('Invalid site ID'),
  detected_scripts: z.array(z.object({
    src: z.string().url('Invalid script URL'),
    type: z.enum(['analytics', 'advertising', 'social', 'functional', 'unknown']),
    domain: z.string().min(1, 'Domain is required')
  })).default([]),
  detected_cookies: z.array(z.object({
    name: z.string().min(1, 'Cookie name is required'),
    domain: z.string().min(1, 'Cookie domain is required'),
    category: z.string().min(1, 'Cookie category is required'),
    description: z.string().optional(),
    storage_type: z.enum(['cookie', 'localStorage', 'sessionStorage']).optional(),
    detected_at: z.string().optional(),
    has_value: z.boolean().optional()
  })).default([]),
  scan_timestamp: z.string().datetime('Invalid scan timestamp')
})

// Banner config validation schema
export const bannerConfigSchema = z.object({
  title: z.string().min(1, 'Banner title is required'),
  description: z.string().min(1, 'Banner description is required'),
  accept_all_text: z.string().min(1, 'Accept all text is required'),
  reject_all_text: z.string().min(1, 'Reject all text is required'),
  settings_text: z.string().min(1, 'Settings text is required'),
  privacy_policy_text: z.string().min(1, 'Privacy policy text is required'),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  position: z.enum(['top', 'bottom', 'center']).default('bottom'),
  layout: z.enum(['banner', 'modal', 'corner']).default('banner')
})

// Cookie category validation schema
export const cookieCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Category description is required'),
  is_essential: z.boolean().default(false),
  sort_order: z.number().min(0).default(0),
  is_active: z.boolean().default(true)
})

// Template validation schema
export const templateSchema = z.object({
  template_type: z.enum(['banner', 'policy', 'cookie_notice']),
  content: z.string().min(1, 'Template content is required'),
  version: z.string().min(1, 'Template version is required'),
  is_active: z.boolean().default(false),
  created_by: z.string().optional()
})

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: errorMessage }
    }
    return { success: false, error: 'Validation failed' }
  }
}

// Database model validation schemas
export const siteSchema = z.object({
  id: z.string().uuid().optional(),
  domain: z.string().url('Invalid domain URL'),
  api_token: z.string().min(32, 'API token must be at least 32 characters'),
  wp_version: z.string().optional(),
  plugin_version: z.string().optional(),
  installed_plugins: z.array(z.string()).default([]),
  detected_forms: z.array(z.object({
    type: z.string(),
    count: z.number().min(0),
    plugin_name: z.string().optional()
  })).default([]),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const consentRecordSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid('Invalid site ID'),
  visitor_hash: z.string().length(64, 'Visitor hash must be 64 characters'),
  consent_categories: z.array(z.string()).default([]),
  consent_timestamp: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  user_agent_hash: z.string().length(64, 'User agent hash must be 64 characters').optional(),
  created_at: z.string().datetime().optional()
})

export const clientScanRecordSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid('Invalid site ID'),
  detected_scripts: z.array(z.object({
    src: z.string().url('Invalid script URL'),
    type: z.enum(['analytics', 'advertising', 'social', 'functional', 'unknown']),
    domain: z.string().min(1, 'Domain is required')
  })).default([]),
  detected_cookies: z.array(z.object({
    name: z.string().min(1, 'Cookie name is required'),
    domain: z.string().min(1, 'Cookie domain is required'),
    category: z.string().min(1, 'Cookie category is required'),
    description: z.string().optional()
  })).default([]),
  scan_timestamp: z.string().datetime().optional(),
  processed: z.boolean().default(false),
  created_at: z.string().datetime().optional()
})

export const policyTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  template_type: z.enum(['banner', 'policy', 'cookie_notice']),
  content: z.string().min(1, 'Template content is required'),
  version: z.string().min(1, 'Template version is required'),
  is_active: z.boolean().default(false),
  created_by: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const cookieCategoryDBSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  is_essential: z.boolean().default(false),
  sort_order: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export const sitePolicySchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid('Invalid site ID'),
  policy_content: z.string().optional(),
  banner_config: bannerConfigSchema.optional(),
  last_updated: z.string().datetime().optional(),
  template_version: z.string().optional(),
  created_at: z.string().datetime().optional()
})

// Admin API validation schemas
export const templateUpdateSchema = z.object({
  banner_template: z.string().optional(),
  policy_template: z.string().optional(),
  cookie_categories: z.array(cookieCategorySchema).optional(),
  version: z.string().min(1, 'Version is required')
})

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// Filter validation schemas
export const siteFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  domain: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional()
})

export const consentFiltersSchema = z.object({
  site_id: z.string().uuid().optional(),
  consent_after: z.string().datetime().optional(),
  consent_before: z.string().datetime().optional(),
  categories: z.array(z.string()).optional()
})

export const scanFiltersSchema = z.object({
  site_id: z.string().uuid().optional(),
  processed: z.boolean().optional(),
  scan_after: z.string().datetime().optional(),
  scan_before: z.string().datetime().optional()
})

// Widget configuration validation
export const widgetConfigSchema = z.object({
  site_id: z.string().uuid('Invalid site ID')
})

// API token validation
export const apiTokenSchema = z.object({
  token: z.string().min(32, 'Invalid API token format')
})

// Utility function for validating UUID
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Utility function for validating domain
export const domainSchema = z.string().regex(
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
  'Invalid domain format'
)