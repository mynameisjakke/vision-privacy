-- Fix Function Search Path Security Warnings
-- This sets the search_path for the helper functions to prevent security issues

-- Update functions with proper search_path (no need to drop, just replace)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
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
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'api_token',
    ''
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_api_token() TO anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION public.get_current_user_role() IS 
  'Helper function to get current user role - evaluated once per query for performance. Search path set for security.';

COMMENT ON FUNCTION public.get_current_user_api_token() IS 
  'Helper function to get current user API token - evaluated once per query for performance. Search path set for security.';
