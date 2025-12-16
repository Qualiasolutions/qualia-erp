/**
 * Script to update project progress by manipulating phase_items
 *
 * Run with: npx tsx scripts/update-project-progress.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'MISSING');
console.log('Supabase Key:', supabaseKey ? 'Found' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('\nMissing required environment variables.');
  console.error('Make sure .env.local contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ProjectUpdate {
  namePattern: string;
  targetProgress: number;
}

const projectUpdates: ProjectUpdate[] = [
  { namePattern: 'alexis', targetProgress: 90 },
  { namePattern: 'joc', targetProgress: 10 },
  { namePattern: 'haamah', targetProgress: 100 },
  { namePattern: 'znso', targetProgress: 75 },
  { namePattern: 'woodlocation', targetProgress: 90 },
];

async function setProjectProgress(projectId: string, projectName: string, targetProgress: number) {
  // Get all phases for this project
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId);

  if (phasesError || !phases) {
    console.error(`   Error fetching phases for ${projectName}:`, phasesError);
    return false;
  }

  if (phases.length === 0) {
    console.log(`   No phases found for ${projectName}, skipping`);
    return false;
  }

  const phaseIds = phases.map(p => p.id);

  // Get all phase items for this project
  const { data: items, error: itemsError } = await supabase
    .from('phase_items')
    .select('id, is_completed')
    .in('phase_id', phaseIds)
    .order('created_at', { ascending: true });

  if (itemsError || !items) {
    console.error(`   Error fetching items for ${projectName}:`, itemsError);
    return false;
  }

  if (items.length === 0) {
    console.log(`   No phase items found for ${projectName}, skipping`);
    return false;
  }

  const totalItems = items.length;
  const targetCompleted = Math.round((targetProgress / 100) * totalItems);

  console.log(`   Found ${totalItems} items, marking ${targetCompleted} as completed (${targetProgress}%)`);

  // Mark the first N items as completed, rest as not completed
  const itemsToComplete = items.slice(0, targetCompleted).map(i => i.id);
  const itemsToIncomplete = items.slice(targetCompleted).map(i => i.id);

  if (itemsToComplete.length > 0) {
    const { error: completeError } = await supabase
      .from('phase_items')
      .update({ is_completed: true })
      .in('id', itemsToComplete);

    if (completeError) {
      console.error(`   Error completing items:`, completeError);
      return false;
    }
  }

  if (itemsToIncomplete.length > 0) {
    const { error: incompleteError } = await supabase
      .from('phase_items')
      .update({ is_completed: false })
      .in('id', itemsToIncomplete);

    if (incompleteError) {
      console.error(`   Error marking items incomplete:`, incompleteError);
      return false;
    }
  }

  return true;
}

async function createWoodlocationProject() {
  console.log('\nChecking for Woodlocation.com project...');

  const { data: existing, error: searchError } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%woodlocation%')
    .limit(1);

  if (searchError) {
    console.error('Error searching for Woodlocation:', searchError);
    return null;
  }

  if (existing && existing.length > 0) {
    console.log(`   Woodlocation.com already exists: ${existing[0].name}`);
    return existing[0].id;
  }

  console.log('   Creating Woodlocation.com project...');

  // Get the first workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)
    .single();

  if (!workspace) {
    console.error('   No workspace found');
    return null;
  }

  const { data: newProject, error: createError } = await supabase
    .from('projects')
    .insert({
      name: 'Woodlocation.com',
      workspace_id: workspace.id,
      status: 'in_progress',
      project_type: 'web_design',
      project_group: 'active',
    })
    .select()
    .single();

  if (createError) {
    console.error('   Error creating Woodlocation:', createError);
    return null;
  }

  console.log(`   ✓ Created Woodlocation.com project: ${newProject.id}`);

  // Initialize roadmap for the project
  console.log('   Initializing roadmap...');

  return newProject.id;
}

async function main() {
  console.log('Updating project progress...\n');

  // First, create Woodlocation.com if it doesn't exist
  await createWoodlocationProject();

  // List all projects to help with debugging
  console.log('\nFetching all projects...');
  const { data: allProjects, error: listError } = await supabase
    .from('projects')
    .select('id, name, project_type');

  if (listError) {
    console.error('Error listing projects:', listError);
    return;
  }

  console.log('Available projects:');
  allProjects?.forEach(p => console.log(`  - ${p.name} (${p.project_type || 'no type'})`));

  // Update each project's progress
  console.log('\n--- Updating Progress ---\n');

  for (const update of projectUpdates) {
    console.log(`Looking for "${update.namePattern}" project...`);

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${update.namePattern}%`)
      .limit(1);

    if (error) {
      console.error(`   Error searching for ${update.namePattern}:`, error);
      continue;
    }

    if (!projects || projects.length === 0) {
      console.log(`   No project found matching "${update.namePattern}"`);
      continue;
    }

    const project = projects[0];
    console.log(`   Found: ${project.name}`);

    const success = await setProjectProgress(project.id, project.name, update.targetProgress);
    if (success) {
      console.log(`   ✓ Set ${project.name} to ${update.targetProgress}%\n`);
    } else {
      console.log(`   ⚠ Could not update ${project.name}\n`);
    }
  }

  console.log('\n✓ Progress update complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
