/**
 * READ-ONLY inspection script — no writes.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('--- Full Geppetto project row ---');
  const { data: gep } = await sb
    .from('projects')
    .select('*')
    .eq('id', '7a5d3d58-78a5-4945-9906-15e22f8efe99')
    .single();
  console.log(JSON.stringify(gep, null, 2));

  console.log('\n--- Client schema (a sample row) ---');
  const { data: cSample } = await sb.from('clients').select('*').limit(1);
  console.log(JSON.stringify(cSample?.[0] ?? {}, null, 2));

  console.log('\n--- Search clients by display_name or name for Arijit/Geppetto ---');
  const { data: matchedClients } = await sb
    .from('clients')
    .select('id, name, display_name, lead_status')
    .or(
      'display_name.ilike.%geppetto%,display_name.ilike.%arijit%,name.ilike.%geppetto%,name.ilike.%arijit%,name.ilike.%sircar%'
    );
  console.table(matchedClients ?? []);

  console.log('\n--- project_integrations schema (sample) ---');
  const { data: pi } = await sb.from('project_integrations').select('*').limit(1);
  console.log(JSON.stringify(pi?.[0] ?? {}, null, 2));

  console.log('\n--- project_type enum values ---');
  const { data: types } = await sb
    .from('projects')
    .select('project_type')
    .not('project_type', 'is', null)
    .limit(100);
  const uniq = [...new Set((types ?? []).map((t: any) => t.project_type))];
  console.log(uniq);

  console.log('\n--- Admin profiles (for lead_id) ---');
  const { data: admins } = await sb
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'admin');
  console.table(admins ?? []);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
