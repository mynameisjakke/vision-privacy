-- Add metadata fields to sites table for template variable population
-- These fields store company information and plugin detection data

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS org_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS form_plugin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ecommerce_plugin VARCHAR(255);

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN sites.company_name IS 'Company name for policy template variable {{COMPANY_NAME}}';
COMMENT ON COLUMN sites.contact_email IS 'Contact email for policy template variable {{CONTACT_EMAIL}}';
COMMENT ON COLUMN sites.org_number IS 'Organization number for policy template variable {{ORG_NUMBER}}';
COMMENT ON COLUMN sites.company_address IS 'Company address for policy template variable {{COMPANY_ADDRESS}}';
COMMENT ON COLUMN sites.form_plugin IS 'Detected form plugin name for policy template variable {{FORM_PLUGIN_NAME}}';
COMMENT ON COLUMN sites.ecommerce_plugin IS 'Detected ecommerce plugin name for policy template variable {{ECOM_PLUGIN_NAME}}';
