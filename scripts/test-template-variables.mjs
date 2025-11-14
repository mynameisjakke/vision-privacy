#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testTemplateVariables() {
  console.log('🧪 Testing Template Variable Implementation\n');

  // 1. Check if new columns exist in sites table
  console.log('1️⃣ Checking sites table structure...');
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, domain, company_name, contact_email, org_number, company_address, form_plugin, ecommerce_plugin')
    .limit(1);

  if (sitesError) {
    console.error('❌ Error querying sites table:', sitesError.message);
    return;
  }

  if (sites && sites.length > 0) {
    console.log('✅ Sites table has new columns!');
    console.log('   Sample site:', {
      id: sites[0].id,
      domain: sites[0].domain,
      company_name: sites[0].company_name || '(not set)',
      contact_email: sites[0].contact_email || '(not set)',
      org_number: sites[0].org_number || '(not set)',
      company_address: sites[0].company_address || '(not set)',
      form_plugin: sites[0].form_plugin || '(not set)',
      ecommerce_plugin: sites[0].ecommerce_plugin || '(not set)'
    });
  } else {
    console.log('⚠️  No sites found in database');
  }

  // 2. Test updating a site with metadata
  if (sites && sites.length > 0) {
    console.log('\n2️⃣ Testing site metadata update...');
    const testSiteId = sites[0].id;
    
    const { data: updatedSite, error: updateError } = await supabase
      .from('sites')
      .update({
        company_name: 'Test Company AB',
        contact_email: 'info@testcompany.se',
        org_number: '556123-4567',
        company_address: 'Testvägen 123, 123 45 Stockholm',
        form_plugin: 'Contact Form 7',
        ecommerce_plugin: 'WooCommerce'
      })
      .eq('id', testSiteId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating site:', updateError.message);
    } else {
      console.log('✅ Site metadata updated successfully!');
      console.log('   Updated site:', {
        domain: updatedSite.domain,
        company_name: updatedSite.company_name,
        contact_email: updatedSite.contact_email,
        org_number: updatedSite.org_number
      });
    }
  }

  console.log('\n✅ Template variable implementation test complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update your sites with company metadata');
  console.log('   2. Test the policy API endpoints to see template variables in action');
  console.log('   3. Example: GET /api/policy/{site_id}?type=privacy');
}

testTemplateVariables();
