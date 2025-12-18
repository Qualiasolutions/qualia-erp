/**
 * Script to manage clients:
 * - Add InrVo as a new client
 * - Create InrVo website project with 20% progress
 *
 * Run with: npx tsx scripts/manage-clients.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { WEBSITE_PHASES } from '../lib/phase-templates';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function initializeProjectRoadmap(projectId: string) {
  console.log('   Initializing roadmap phases...');

  const phases = WEBSITE_PHASES;
  const allItems: {
    phase_id: string;
    title: string;
    description: string;
    display_order: number;
  }[] = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Create phase
    const { data: createdPhase, error: phaseError } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        template_key: phase.templateKey,
        name: phase.name,
        description: phase.description,
        status: 'not_started',
        display_order: i,
      })
      .select()
      .single();

    if (phaseError) {
      console.error(`   Error creating phase ${phase.name}:`, phaseError);
      continue;
    }

    console.log(`   ✓ Created phase: ${phase.name}`);

    // Collect items for this phase
    phase.items.forEach((item, itemIndex) => {
      allItems.push({
        phase_id: createdPhase.id,
        title: item.title,
        description: item.description || '',
        display_order: itemIndex,
      });
    });
  }

  // Insert all items
  if (allItems.length > 0) {
    const { error: itemsError } = await supabase.from('phase_items').insert(allItems);

    if (itemsError) {
      console.error('   Error creating phase items:', itemsError);
    } else {
      console.log(`   ✓ Created ${allItems.length} phase items`);
    }
  }

  return allItems.length;
}

async function setProjectProgress(projectId: string, targetProgress: number) {
  console.log(`\n4. Setting project progress to ${targetProgress}%...`);

  // Get all phases for this project
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId);

  if (phasesError || !phases || phases.length === 0) {
    console.error('   Error fetching phases:', phasesError);
    return false;
  }

  const phaseIds = phases.map((p) => p.id);

  // Get all phase items for this project
  const { data: items, error: itemsError } = await supabase
    .from('phase_items')
    .select('id')
    .in('phase_id', phaseIds)
    .order('created_at', { ascending: true });

  if (itemsError || !items || items.length === 0) {
    console.error('   Error fetching items:', itemsError);
    return false;
  }

  const totalItems = items.length;
  const targetCompleted = Math.round((targetProgress / 100) * totalItems);

  console.log(`   Found ${totalItems} items, marking ${targetCompleted} as completed`);

  // Mark the first N items as completed
  const itemsToComplete = items.slice(0, targetCompleted).map((i) => i.id);

  if (itemsToComplete.length > 0) {
    const { error: completeError } = await supabase
      .from('phase_items')
      .update({ is_completed: true })
      .in('id', itemsToComplete);

    if (completeError) {
      console.error('   Error completing items:', completeError);
      return false;
    }

    console.log(`   ✓ Marked ${itemsToComplete.length} items as completed`);
  }

  // Update first phase status to in_progress if we have progress
  if (targetCompleted > 0 && phases.length > 0) {
    await supabase.from('project_phases').update({ status: 'in_progress' }).eq('id', phases[0].id);
  }

  return true;
}

async function main() {
  console.log('Managing InrVo client and project...\n');

  // Get the first workspace
  const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();

  if (!workspace) {
    console.error('Error: No workspace found');
    process.exit(1);
  }

  let clientId: string | null = null;

  // 1. Check/Create InrVo client
  console.log('1. Checking for InrVo client...');
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, display_name')
    .ilike('display_name', '%inrvo%');

  if (existingClients && existingClients.length > 0) {
    console.log(`   InrVo client already exists: ${existingClients[0].display_name}`);
    clientId = existingClients[0].id;
  } else {
    console.log('   Creating InrVo client...');
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        display_name: 'InrVo',
        lead_status: 'active_client',
        workspace_id: workspace.id,
      })
      .select()
      .single();

    if (clientError) {
      console.error('   Error creating client:', clientError);
      process.exit(1);
    }

    clientId = newClient.id;
    console.log(`   ✓ Created InrVo client: ${clientId}`);
  }

  // 2. Check/Create InrVo project
  console.log('\n2. Checking for InrVo project...');
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%inrvo%');

  let projectId: string;
  let needsRoadmap = false;

  if (existingProjects && existingProjects.length > 0) {
    console.log(`   InrVo project already exists: ${existingProjects[0].name}`);
    projectId = existingProjects[0].id;

    // Check if it has phases
    const { data: phases } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId);

    if (!phases || phases.length === 0) {
      needsRoadmap = true;
    }
  } else {
    console.log('   Creating InrVo website project...');
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'InrVo',
        workspace_id: workspace.id,
        client_id: clientId,
        project_type: 'web_design',
        project_group: 'active',
        status: 'Active',
      })
      .select()
      .single();

    if (projectError) {
      console.error('   Error creating project:', projectError);
      process.exit(1);
    }

    projectId = newProject.id;
    needsRoadmap = true;
    console.log(`   ✓ Created InrVo project: ${projectId}`);
  }

  // 3. Initialize roadmap if needed
  if (needsRoadmap) {
    console.log('\n3. Initializing project roadmap...');
    await initializeProjectRoadmap(projectId);
  } else {
    console.log('\n3. Roadmap already exists, skipping initialization');
  }

  // 4. Set progress to 20%
  await setProjectProgress(projectId, 20);

  console.log('\n✓ InrVo setup complete!');
  console.log(`  - Client ID: ${clientId}`);
  console.log(`  - Project ID: ${projectId}`);
  console.log('  - Progress: 20%');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
