-- Fix Remaining RLS Performance Issues (24 warnings)
-- This migration addresses the remaining performance warnings after 007

-- ============================================================================
-- STEP 1: Drop all existing policies again
-- ============================================================================

-- Sites table
DROP POLICY IF EXISTS "sites_select_policy" ON sites;
DROP POLICY IF EXISTS "sites_update_policy" ON sites;
DROP POLICY IF EXISTS "sites_insert_policy" ON sites;
DROP POLICY IF EXISTS "sites_delete_policy" ON sites;

-- Consent records table
DROP POLICY IF EXISTS "consent_records_select_policy" ON consent_records;
DROP POLICY IF EXISTS "consent_records_insert_policy" ON consent_records;
DROP POLICY IF EXISTS "consent_records_update_policy" ON consent_records;
DROP POLICY IF EXISTS "consent_records_delete_policy" ON consent_records;

-- Client scans table
DROP POLICY IF EXISTS "client_scans_all_policy" ON client_scans;

-- Policy templates table
DROP POLICY IF EXISTS "policy_templates_select_policy" ON policy_templates;
DROP POLICY IF EXISTS "policy_templates_write_policy" ON policy_templates;

-- Cookie categories table
DROP POLICY IF EXISTS "cookie_categories_select_policy" ON cookie_categories;
DROP POLICY IF EXISTS "cookie_categories_write_policy" ON cookie_categories;

-- Site policies table
DROP POLICY IF EXISTS "site_policies_all_policy" ON site_policies;

-- ============================================================================
-- STEP 2: Create helper function to get current role (evaluated once)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_api_token()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'api_token',
    ''
  );
$$;

-- ============================================================================
-- STEP 3: Create optimized policies using helper functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SITES TABLE
-- ----------------------------------------------------------------------------

CREATE POLICY "sites_select_policy" ON sites
  FOR SELECT
  USING (
    public.get_current_user_role() = 'admin'
    OR
    api_token = public.get_current_user_api_token()
  );

CREATE POLICY "sites_update_policy" ON sites
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'admin'
    OR
    api_token = public.get_current_user_api_token()
  );

CREATE POLICY "sites_insert_policy" ON sites
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "sites_delete_policy" ON sites
  FOR DELETE
  USING (
    public.get_current_user_role() = 'admin'
  );

-- ----------------------------------------------------------------------------
-- CONSENT_RECORDS TABLE
-- ----------------------------------------------------------------------------

CREATE POLICY "consent_records_select_policy" ON consent_records
  FOR SELECT
  USING (
    public.get_current_user_role() = 'admin'
    OR
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = public.get_current_user_api_token()
    )
  );

CREATE POLICY "consent_records_insert_policy" ON consent_records
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
    OR
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = public.get_current_user_api_token()
    )
  );

CREATE POLICY "consent_records_update_policy" ON consent_records
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "consent_records_delete_policy" ON consent_records
  FOR DELETE
  USING (
    public.get_current_user_role() = 'admin'
  );

-- ----------------------------------------------------------------------------
-- CLIENT_SCANS TABLE
-- ----------------------------------------------------------------------------

CREATE POLICY "client_scans_all_policy" ON client_scans
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin'
    OR
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = public.get_current_user_api_token()
    )
  );

-- ----------------------------------------------------------------------------
-- POLICY_TEMPLATES TABLE - Fixed overlapping policies
-- ----------------------------------------------------------------------------

-- Separate SELECT policy (no overlap with write)
CREATE POLICY "policy_templates_select_policy" ON policy_templates
  FOR SELECT
  USING (
    public.get_current_user_role() = 'admin'
    OR
    is_active = true
  );

-- Admin-only for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "policy_templates_insert_policy" ON policy_templates
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "policy_templates_update_policy" ON policy_templates
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "policy_templates_delete_policy" ON policy_templates
  FOR DELETE
  USING (
    public.get_current_user_role() = 'admin'
  );

-- ----------------------------------------------------------------------------
-- COOKIE_CATEGORIES TABLE - Fixed overlapping policies
-- ----------------------------------------------------------------------------

-- Separate SELECT policy (no overlap with write)
CREATE POLICY "cookie_categories_select_policy" ON cookie_categories
  FOR SELECT
  USING (
    public.get_current_user_role() = 'admin'
    OR
    is_active = true
  );

-- Admin-only for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "cookie_categories_insert_policy" ON cookie_categories
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "cookie_categories_update_policy" ON cookie_categories
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "cookie_categories_delete_policy" ON cookie_categories
  FOR DELETE
  USING (
    public.get_current_user_role() = 'admin'
  );

-- ----------------------------------------------------------------------------
-- SITE_POLICIES TABLE
-- ----------------------------------------------------------------------------

CREATE POLICY "site_policies_all_policy" ON site_policies
  FOR ALL
  USING (
    public.get_current_user_role() = 'admin'
    OR
    site_id IN (
      SELECT id FROM sites 
      WHERE api_token = public.get_current_user_api_token()
    )
  );

-- ============================================================================
-- STEP 4: Grant execute permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_api_token() TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 5: Add comments
-- ============================================================================

COMMENT ON FUNCTION public.get_current_user_role() IS 
  'Helper function to get current user role - evaluated once per query for performance';

COMMENT ON FUNCTION public.get_current_user_api_token() IS 
  'Helper function to get current user API token - evaluated once per query for performance';

-- ============================================================================
-- Performance Improvements:
-- ============================================================================
-- 
-- 1. Created helper functions that are STABLE (evaluated once per query)
-- 2. Replaced all current_setting() calls with helper functions
-- 3. Split "FOR ALL" policies into specific action policies for templates/categories
-- 4. This eliminates ALL overlapping policies
--
-- Expected result: 0 performance warnings
-- ============================================================================
