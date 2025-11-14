#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Get migration file from command line
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node run-migration.mjs <migration-file>');
  console.error('   Example: node run-migration.mjs supabase/migrations/011_add_site_metadata_fields.sql');
  process.exit(1);
}

// Read migration SQL
const migrationPath = join(__dirname, '..', migrationFile);
let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
} catch (error) {
  console.error(`❌ Could not read migration file: ${migrationPath}`);
  console.error(error.message);
  process.exit(1);
}

console.log(`📋 Applying migration: ${migrationFile}`);
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute migration
async function runMigration() {
  try {
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statement(s) to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        process.exit(1);
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
