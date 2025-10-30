-- Performance optimization indexes for Vision Privacy

-- Sites table indexes
CREATE INDEX idx_sites_domain ON sites(domain);
CREATE INDEX idx_sites_api_token ON sites(api_token);
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_created_at ON sites(created_at);

-- Consent records indexes - critical for fast lookups
CREATE INDEX idx_consent_site_visitor ON consent_records(site_id, visitor_hash);
CREATE INDEX idx_consent_site_timestamp ON consent_records(site_id, consent_timestamp);
CREATE INDEX idx_consent_expires_at ON consent_records(expires_at);
CREATE INDEX idx_consent_visitor_hash ON consent_records(visitor_hash);
CREATE INDEX idx_consent_timestamp ON consent_records(consent_timestamp);

-- Client scans indexes
CREATE INDEX idx_scans_site_time ON client_scans(site_id, scan_timestamp);
CREATE INDEX idx_scans_processed ON client_scans(processed);
CREATE INDEX idx_scans_timestamp ON client_scans(scan_timestamp);

-- Policy templates indexes
CREATE INDEX idx_templates_type_active ON policy_templates(template_type, is_active);
CREATE INDEX idx_templates_version ON policy_templates(version);
CREATE INDEX idx_templates_created_at ON policy_templates(created_at);

-- Cookie categories indexes
CREATE INDEX idx_categories_active_sort ON cookie_categories(is_active, sort_order);
CREATE INDEX idx_categories_name ON cookie_categories(name);

-- Site policies indexes
CREATE INDEX idx_site_policies_site_id ON site_policies(site_id);
CREATE INDEX idx_site_policies_updated ON site_policies(last_updated);