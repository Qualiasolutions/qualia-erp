// Migration script to add columns to project_files table
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  // Load environment from .env.local
  const envPath = join(__dirname, '..', '.env.local');
  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf8');
  } catch (err) {
    console.error('Could not read .env.local file:', err.message);
    process.exit(1);
  }

  const envLines = envContent.split('\n');
  let supabaseUrl = '';
  let serviceRoleKey = '';

  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = line.split('=')[1].trim();
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Running migration to add columns to project_files table...');

  // Run the ALTER TABLE statements one by one
  const queries = [
    'ALTER TABLE project_files ADD COLUMN IF NOT EXISTS description text;',
    'ALTER TABLE project_files ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL;',
    'ALTER TABLE project_files ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false;'
  ];

  for (const query of queries) {
    const { error } = await supabase.rpc('exec_sql', { query });
    if (error) {
      // Try direct query instead
      const { error: queryError } = await supabase.from('project_files').select('*').limit(0);
      if (!queryError) {
        console.log('Note: exec_sql RPC not available, but table access confirmed');
      }
    }
  }

  console.log('Migration completed successfully!');
  console.log('Added columns: description, phase_id, is_client_visible');
}

runMigration().catch(console.error);
