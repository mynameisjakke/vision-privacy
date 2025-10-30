-- Row Level Security (RLS) policies for Vision Privacy
-- Ensures data protection and proper access control

-- Enable RLS on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_policies ENABLE ROW LEVEL SECURITY;

-- Sites table policies
-- Allow sites to read their own data using API token
CREATE POLICY "Sites can read own data" ON sites
  FOR SELECT
  USING (api_token = current_setting('request.jwt.claims', true)::json->>'api_token');

-- Allow sites to update their own data
CREATE POLICY "Sites can update own data" ON sites
  FOR UPDATE
  USING (api_token = current_setting('request.jwt.claims', true)::json->>'api_token');

-- Allow admin access to all sites (for Vision Media administrators)
CREATE POLICY "Admin full access to sites" ON sites
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Consent records policies
-- Allow sites to read consent records for their domain
CREATE POLICY "Sites can read own consent records" ON consent_records
  FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = current_setting('request.jwt.claims', true)::json->>'api_token'
    )
  );

-- Allow sites to insert consent records for their domain
CREATE POLICY "Sites can insert consent records" ON consent_records
  FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = current_setting('request.jwt.claims', true)::json->>'api_token'
    )
  );

-- Allow admin access to all consent records
CREATE POLICY "Admin full access to consent records" ON consent_records
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Client scans policies
-- Allow sites to read and insert their own scan data
CREATE POLICY "Sites can manage own scans" ON client_scans
  FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = current_setting('request.jwt.claims', true)::json->>'api_token'
    )
  );

-- Allow admin access to all scans
CREATE POLICY "Admin full access to scans" ON client_scans
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Policy templates policies
-- Allow all authenticated users to read active templates
CREATE POLICY "Read active templates" ON policy_templates
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage templates
CREATE POLICY "Admin manage templates" ON policy_templates
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Cookie categories policies
-- Allow all authenticated users to read active categories
CREATE POLICY "Read active categories" ON cookie_categories
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Admin manage categories" ON cookie_categories
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Site policies policies
-- Allow sites to read and update their own policies
CREATE POLICY "Sites can manage own policies" ON site_policies
  FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = current_setting('request.jwt.claims', true)::json->>'api_token'
    )
  );

-- Allow admin access to all site policies
CREATE POLICY "Admin full access to site policies" ON site_policies
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');