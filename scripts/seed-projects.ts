/**
 * Seed new projects into the database
 * Run with: npx tsx scripts/seed-projects.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error(
    '- SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:',
    supabaseKey ? 'set' : 'MISSING'
  );
  console.error('\nMake sure .env.local exists in the project root with these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type ProjectType = 'web_design' | 'ai_agent' | 'seo' | 'ads';

interface NewProject {
  name: string;
  project_type: ProjectType;
  status: string;
  project_group: string;
}

// New projects to add
const newProjects: NewProject[] = [
  // SEO Projects
  { name: 'Luxury Barber UK', project_type: 'seo', status: 'planning', project_group: 'active' },
  { name: 'Urban Catering CY', project_type: 'seo', status: 'planning', project_group: 'active' },

  // Ads Projects
  { name: 'Wood Location', project_type: 'ads', status: 'planning', project_group: 'active' },
  { name: 'Luxury Barber', project_type: 'ads', status: 'planning', project_group: 'active' },

  // Website Projects
  {
    name: 'Haamah Integrated',
    project_type: 'web_design',
    status: 'planning',
    project_group: 'active',
  },
  {
    name: 'ZNSO Architecture',
    project_type: 'web_design',
    status: 'planning',
    project_group: 'active',
  },
];

async function seedProjects() {
  console.log('Starting project seeding...\n');

  // Get the default workspace (Qualia Solutions)
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .limit(1);

  if (wsError || !workspaces?.length) {
    console.error('Error fetching workspace:', wsError?.message || 'No workspaces found');
    process.exit(1);
  }

  const workspace = workspaces[0];
  console.log(`Using workspace: ${workspace.name} (${workspace.id})\n`);

  // Get the default team
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('workspace_id', workspace.id)
    .limit(1);

  if (teamError || !teams?.length) {
    console.error('Error fetching team:', teamError?.message || 'No teams found');
    process.exit(1);
  }

  const team = teams[0];
  console.log(`Using team: ${team.name} (${team.id})\n`);

  // Get an admin user for lead_id
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'admin')
    .limit(1);

  if (profileError || !profiles?.length) {
    console.error('Error fetching admin profile:', profileError?.message || 'No admin found');
    process.exit(1);
  }

  const leadProfile = profiles[0];
  console.log(`Using lead: ${leadProfile.full_name} (${leadProfile.id})\n`);

  // Check for existing projects to avoid duplicates
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('name')
    .eq('workspace_id', workspace.id);

  const existingNames = new Set(existingProjects?.map((p) => p.name.toLowerCase()) || []);

  console.log('Creating projects...\n');

  for (const project of newProjects) {
    // Skip if already exists
    if (existingNames.has(project.name.toLowerCase())) {
      console.log(`⏭️  Skipping "${project.name}" - already exists`);
      continue;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        project_type: project.project_type,
        status: project.status,
        project_group: project.project_group,
        workspace_id: workspace.id,
        team_id: team.id,
        lead_id: leadProfile.id,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating "${project.name}":`, error.message);
    } else {
      console.log(`✅ Created "${project.name}" (${project.project_type}) - ID: ${data.id}`);
    }
  }

  console.log('\nProject seeding complete!');
}

seedProjects().catch(console.error);
