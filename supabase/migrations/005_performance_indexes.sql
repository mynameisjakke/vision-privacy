-- Performance optimization indexes for Vision Privacy
-- This migration adds additional indexes for improved query performance

-- Sites table indexes
CREATE INDEX IF NOT EXISTS idx_sites_domain_status ON sites(domain, status);
CREATE INDEX IF NOT EXISTS idx_sites_status_created ON sites(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sites_api_token_hash ON sites USING hash(api_token);

-- Consent records indexes (already exist but adding composite ones)
CREATE INDEX IF NOT EXISTS idx_consent_site_visitor_expires ON consent_records(site_id, visitor_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_consent_timestamp_site ON consent_records(consent_timestamp DESC, site_id);
CREATE INDEX IF NOT EXISTS idx_consent_expires_at ON consent_records(expires_at) WHERE expires_at IS NOT NULL;

-- Client scans indexes
CREATE INDEX IF NOT EXISTS idx_scans_site_processed_time ON client_scans(site_id, processed, scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scans_processed_time ON client_scans(processed, scan_timestamp DESC);

-- Policy templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_type_active ON policy_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_active_created ON policy_templates(is_active, created_at DESC);

-- Cookie categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON cookie_categories(is_active, sort_order);

-- Site policies indexes
CREATE INDEX IF NOT EXISTS idx_site_policies_site_updated ON site_policies(site_id, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_site_policies_template_version ON site_policies(template_version);

-- Partial indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(id, domain) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_consent_valid ON consent_records(site_id, visitor_hash, consent_categories) 
  WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_scans_unprocessed ON client_scans(site_id, scan_timestamp DESC) 
  WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_templates_active_banner ON policy_templates(content, version) 
  WHERE template_type = 'banner' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_active_policy ON policy_templates(content, version) 
  WHERE template_type = 'policy' AND is_active = true;

-- Covering indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_sites_widget_data ON sites(id, domain, status, api_token);
CREATE INDEX IF NOT EXISTS idx_consent_full_data ON consent_records(site_id, visitor_hash, consent_categories, expires_at, consent_timestamp);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_sites_installed_plugins_gin ON sites USING gin(installed_plugins);
CREATE INDEX IF NOT EXISTS idx_sites_detected_forms_gin ON sites USING gin(detected_forms);
CREATE INDEX IF NOT EXISTS idx_scans_detected_scripts_gin ON client_scans USING gin(detected_scripts);
CREATE INDEX IF NOT EXISTS idx_scans_detected_cookies_gin ON client_scans USING gin(detected_cookies);
CREATE INDEX IF NOT EXISTS idx_site_policies_banner_config_gin ON site_policies USING gin(banner_config);

-- Expression indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_sites_domain_lower ON sites(lower(domain));
CREATE INDEX IF NOT EXISTS idx_consent_categories_array_length ON consent_records(array_length(consent_categories, 1));

-- Analyze tables to update statistics
ANALYZE sites;
ANALYZE consent_records;
ANALYZE client_scans;
ANALYZE policy_templates;
ANALYZE cookie_categories;
ANALYZE site_policies;

-- Add comments for documentation
COMMENT ON INDEX idx_sites_domain_status IS 'Optimizes site lookups by domain and status';
COMMENT ON INDEX idx_consent_site_visitor_expires IS 'Optimizes consent validation queries';
COMMENT ON INDEX idx_scans_site_processed_time IS 'Optimizes scan processing queries';
COMMENT ON INDEX idx_templates_type_active IS 'Optimizes template retrieval by type and status';
COMMENT ON INDEX idx_sites_active IS 'Partial index for active sites only';
COMMENT ON INDEX idx_consent_valid IS 'Partial index for non-expired consent records';
COMMENT ON INDEX idx_scans_unprocessed IS 'Partial index for unprocessed scans';

-- Create a view for performance monitoring
CREATE OR REPLACE VIEW performance_stats AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('sites', 'consent_records', 'client_scans', 'policy_templates', 'cookie_categories', 'site_policies')
ORDER BY tablename, attname;

-- Grant access to the performance stats view
GRANT SELECT ON performance_stats TO authenticated;
GRANT SELECT ON performance_stats TO service_role;