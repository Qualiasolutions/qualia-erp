/**
 * Migration script to apply workflow templates to existing projects
 * Run with: npx tsx scripts/migrate-workflows.ts
 */

import { createClient } from '@supabase/supabase-js';
import { getWorkflowTemplate, type ProjectType } from '../lib/workflow-templates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function prefillProjectWorkflow(
  projectId: string,
  workspaceId: string,
  projectType: ProjectType | string | null
) {
  // Check if phases already exist
  const { data: existingPhases } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId)
    .limit(1);

  if (existingPhases && existingPhases.length > 0) {
    return { skipped: true };
  }

  // Get workflow template
  const phases = getWorkflowTemplate(projectType);

  // Create phases and tasks
  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phaseTemplate = phases[phaseIndex];

    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        name: phaseTemplate.name,
        description: phaseTemplate.description,
        sort_order: phaseIndex,
        status: phaseIndex === 0 ? 'in_progress' : 'pending',
        is_locked: phaseIndex > 0,
        auto_progress: true,
      })
      .select('id')
      .single();

    if (phaseError) {
      console.error(`  Error creating phase ${phaseTemplate.name}:`, phaseError.message);
      continue;
    }

    // Create phase items
    if (phaseTemplate.tasks.length > 0) {
      const phaseItems = phaseTemplate.tasks.map((task, taskIndex) => ({
        phase_id: phase.id,
        title: task.title,
        description: task.description || null,
        helper_text: task.helperText || null,
        display_order: taskIndex,
        is_completed: false,
        status: 'Todo',
      }));

      const { error: itemsError } = await supabase.from('phase_items').insert(phaseItems);

      if (itemsError) {
        console.error(
          `  Error creating items for phase ${phaseTemplate.name}:`,
          itemsError.message
        );
      }
    }
  }

  return { success: true, phasesCreated: phases.length };
}

async function main() {
  console.log('🚀 Starting workflow migration...\n');

  // Get all projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, workspace_id, project_type');

  if (error) {
    console.error('Error fetching projects:', error.message);
    process.exit(1);
  }

  console.log(`Found ${projects.length} projects\n`);

  let applied = 0;
  let skipped = 0;

  for (const project of projects) {
    process.stdout.write(`Processing: ${project.name} (${project.project_type || 'no type'})... `);

    const result = await prefillProjectWorkflow(
      project.id,
      project.workspace_id,
      project.project_type
    );

    if (result.skipped) {
      console.log('SKIPPED (already has phases)');
      skipped++;
    } else if (result.success) {
      console.log(`DONE (${result.phasesCreated} phases)`);
      applied++;
    }
  }

  console.log('\n✅ Migration complete!');
  console.log(`   Applied: ${applied}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${projects.length}`);
}

main().catch(console.error);
