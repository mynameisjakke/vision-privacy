// Core type definitions for Vision Privacy system

export interface SiteRegistrationRequest {
  domain: string;
  wp_version: string;
  installed_plugins: string[];
  detected_forms: FormData[];
  plugin_version: string;
}

export interface SiteRegistrationResponse {
  site_id: string;
  api_token: string;
  widget_url: string;
  success: boolean;
}

export interface SiteConfigResponse {
  banner_config: BannerConfig;
  privacy_policy: string;
  cookie_categories: CookieCategory[];
  scan_interval: number;
}

export interface WidgetConfigResponse {
  banner_html: string;
  banner_css: string;
  cookie_categories: CookieCategory[];
  privacy_policy_url: string;
  consent_endpoint: string;
}

export interface ConsentRequest {
  site_id: string;
  visitor_hash: string;
  consent_categories: string[];
  timestamp: string;
  user_agent: string;
}

export interface ClientScanRequest {
  site_id: string;
  detected_scripts: DetectedScript[];
  detected_cookies: DetectedCookie[];
  scan_timestamp: string;
}

export interface DetectedScript {
  src: string;
  type: 'analytics' | 'advertising' | 'social' | 'functional' | 'unknown';
  domain: string;
}

export interface DetectedCookie {
  name: string;
  domain: string;
  category: string;
  description?: string;
}

export interface BannerConfig {
  title: string;
  description: string;
  accept_all_text: string;
  reject_all_text: string;
  settings_text: string;
  privacy_policy_text: string;
  theme: 'light' | 'dark' | 'auto';
  position: 'top' | 'bottom' | 'center';
  layout: 'banner' | 'modal' | 'corner';
}

export interface CookieCategory {
  id: string;
  name: string;
  description: string;
  is_essential: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface FormData {
  type: string;
  count: number;
  plugin_name?: string;
}

export interface APIError {
  error: string;
  message: string;
  code: number;
  details?: any;
}

export interface ConsentData {
  site_id: string;
  visitor_hash: string;
  consent_categories: string[];
  timestamp: string;
  expires_at: string;
}

// Database model interfaces
export interface Site {
  id: string;
  domain: string;
  api_token: string;
  wp_version?: string;
  plugin_version?: string;
  installed_plugins: string[];
  detected_forms: FormData[];
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface ConsentRecord {
  id: string;
  site_id: string;
  visitor_hash: string;
  consent_categories: string[];
  consent_timestamp: string;
  expires_at: string;
  user_agent_hash?: string;
  created_at: string;
}

export interface ClientScan {
  id: string;
  site_id: string;
  detected_scripts: DetectedScript[];
  detected_cookies: DetectedCookie[];
  scan_timestamp: string;
  processed: boolean;
  created_at: string;
}

export interface PolicyTemplate {
  id: string;
  template_type: 'banner' | 'policy' | 'cookie_notice';
  content: string;
  version: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CookieCategoryDB {
  id: string;
  name: string;
  description?: string;
  is_essential: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SitePolicy {
  id: string;
  site_id: string;
  policy_content?: string;
  banner_config: BannerConfig;
  last_updated: string;
  template_version?: string;
  created_at: string;
}

// Error codes enum
export enum ErrorCodes {
  INVALID_SITE_ID = 1001,
  INVALID_TOKEN = 1002,
  RATE_LIMIT_EXCEEDED = 1003,
  CONSENT_EXPIRED = 1004,
  SCAN_PROCESSING_ERROR = 1005,
  VALIDATION_ERROR = 1006,
  DATABASE_ERROR = 1007,
  UNAUTHORIZED = 1008
}

// Admin API interfaces
export interface TemplateUpdateRequest {
  banner_template?: string;
  policy_template?: string;
  cookie_categories?: Omit<CookieCategory, 'id'>[];
  version: string;
}

export interface AdminSitesResponse {
  sites: SiteInfo[];
  total_count: number;
  consent_stats: ConsentStats;
}

export interface SiteInfo {
  id: string;
  domain: string;
  status: string;
  wp_version?: string;
  plugin_version?: string;
  total_consents: number;
  last_scan?: string;
  created_at: string;
}

export interface ConsentStats {
  total_consents: number;
  consents_today: number;
  acceptance_rate: number;
  top_categories: Array<{
    category: string;
    count: number;
  }>;
}

// Database utility types
export type DatabaseInsert<T> = Partial<T>

export type DatabaseUpdate<T> = Partial<T>

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Filter types for queries
export interface SiteFilters {
  status?: 'active' | 'inactive' | 'suspended';
  domain?: string;
  created_after?: string;
  created_before?: string;
}

export interface ConsentFilters {
  site_id?: string;
  consent_after?: string;
  consent_before?: string;
  categories?: string[];
}

export interface ScanFilters {
  site_id?: string;
  processed?: boolean;
  scan_after?: string;
  scan_before?: string;
}