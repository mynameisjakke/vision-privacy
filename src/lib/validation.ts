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
  plugin_version: z.string().min(1, 'Plugin version is required')
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
    description: z.string().optional()
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
  template_type: z.enum(['banner', 'policy']),
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