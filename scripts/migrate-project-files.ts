/**
 * Migration script to add columns to project_files table
 * Run with: npx tsx scripts/migrate-project-files.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('Starting migration: Adding columns to project_files table...\n');

  // Since we can't run raw SQL directly, we'll check if columns exist by trying to query them
  // The migration should be done manually in Supabase dashboard or via SQL editor

  console.log('SQL to run in Supabase SQL Editor:');
  console.log('-----------------------------------');
  console.log(`
ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false;
  `);
  console.log('-----------------------------------\n');

  // Try to query the table to see if columns might already exist
  const { data, error } = await supabase.from('project_files').select('*').limit(1);

  if (error) {
    console.error('Error querying project_files table:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    const record = data[0];
    const hasDescription = 'description' in record;
    const hasPhaseId = 'phase_id' in record;
    const hasIsClientVisible = 'is_client_visible' in record;

    console.log('Column check:');
    console.log('  description:', hasDescription ? '✓ EXISTS' : '✗ MISSING');
    console.log('  phase_id:', hasPhaseId ? '✓ EXISTS' : '✗ MISSING');
    console.log('  is_client_visible:', hasIsClientVisible ? '✓ EXISTS' : '✗ MISSING');

    if (hasDescription && hasPhaseId && hasIsClientVisible) {
      console.log('\n✓ All columns already exist!');
    } else {
      console.log('\n⚠ Some columns are missing. Please run the SQL above in Supabase SQL Editor.');
      process.exit(1);
    }
  } else {
    console.log('No records in project_files table to check. Please run the SQL above in Supabase SQL Editor.');
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
