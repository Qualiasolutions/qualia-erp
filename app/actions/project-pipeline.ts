'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import type { ProjectType, ProjectStatus } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectPipelineData {
  id: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  target_date: string | null;
  project_group: string | null;
  project_type: ProjectType | null;
  deployment_platform: string | null;
  client_id: string | null;
  client_name: string | null;
  lead_id: string | null;
  lead_full_name: string | null;
  lead_email: string | null;
  is_live: boolean;
  logo_url: string | null;
  metadata: Record<string, unknown> | null;
  // Pipeline stats
  current_phase_id: string | null;
  current_phase_name: string | null;
  current_phase_order: number | null;
  total_phases: number;
  completed_phases: number;
  total_tasks: number;
  completed_tasks: number;
  overall_progress: number;
}

// Grouped by phase for kanban display
export interface ProjectsByPhase {
  setup: ProjectPipelineData[];
  plan: ProjectPipelineData[];
  frontend: ProjectPipelineData[];
  backend: ProjectPipelineData[];
  ship: ProjectPipelineData[];
  launched: ProjectPipelineData[]; // For completed/launched projects
  demos: ProjectPipelineData[]; // Demo projects
}

// Phase name mapping
const PHASE_ORDER: Record<string, keyof ProjectsByPhase> = {
  Setup: 'setup',
  Plan: 'plan',
  Frontend: 'frontend',
  Backend: 'backend',
  Ship: 'ship',
};

// ============================================================================
// GET PROJECT PIPELINE DATA
// ============================================================================

export async function getProjectPipelineData(workspaceId?: string): Promise<ProjectPipelineData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_project_pipeline_stats', {
    p_workspace_id: workspaceId || null,
  });

  if (error) {
    console.error('[getProjectPipelineData] Error:', error);
    return [];
  }

  return (data || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    status: p.status as ProjectStatus,
    start_date: p.start_date as string | null,
    target_date: p.target_date as string | null,
    project_group: p.project_group as string | null,
    project_type: p.project_type as ProjectType | null,
    deployment_platform: p.deployment_platform as string | null,
    client_id: p.client_id as string | null,
    client_name: p.client_name as string | null,
    lead_id: p.lead_id as string | null,
    lead_full_name: p.lead_full_name as string | null,
    lead_email: p.lead_email as string | null,
    is_live: (p.is_live as boolean) || false,
    logo_url: p.logo_url as string | null,
    metadata: p.metadata as Record<string, unknown> | null,
    current_phase_id: p.current_phase_id as string | null,
    current_phase_name: p.current_phase_name as string | null,
    current_phase_order: p.current_phase_order as number | null,
    total_phases: (p.total_phases as number) || 0,
    completed_phases: (p.completed_phases as number) || 0,
    total_tasks: Number(p.total_tasks) || 0,
    completed_tasks: Number(p.completed_tasks) || 0,
    overall_progress: (p.overall_progress as number) || 0,
  }));
}

// ============================================================================
// GROUP PROJECTS BY PHASE FOR KANBAN VIEW
// ============================================================================

export async function getProjectsByPhase(workspaceId?: string): Promise<ProjectsByPhase> {
  const projects = await getProjectPipelineData(workspaceId);

  const grouped: ProjectsByPhase = {
    setup: [],
    plan: [],
    frontend: [],
    backend: [],
    ship: [],
    launched: [],
    demos: [],
  };

  for (const project of projects) {
    // Demos go to demos column
    if (project.status === 'Demos') {
      grouped.demos.push(project);
      continue;
    }

    // Launched/Archived projects go to launched column
    if (project.status === 'Launched' || project.status === 'Archived') {
      grouped.launched.push(project);
      continue;
    }

    // Active projects go to their current phase column
    const phaseName = project.current_phase_name || 'Setup';
    const phaseKey = PHASE_ORDER[phaseName];

    if (phaseKey && grouped[phaseKey]) {
      grouped[phaseKey].push(project);
    } else {
      // Default to setup if phase not recognized
      grouped.setup.push(project);
    }
  }

  return grouped;
}

// ============================================================================
// MOVE PROJECT TO NEXT PHASE
// ============================================================================

export async function advanceProjectPhase(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current phase
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, status, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (phasesError || !phases || phases.length === 0) {
    return { success: false, error: 'No phases found for project' };
  }

  // Find current phase (first non-completed)
  const currentPhase = phases.find((p) => p.status !== 'completed');

  if (!currentPhase) {
    // All phases complete - mark project as launched
    const { error: projectError } = await supabase
      .from('projects')
      .update({ status: 'Launched' })
      .eq('id', projectId);

    if (projectError) {
      return { success: false, error: projectError.message };
    }

    revalidatePath('/projects');
    return { success: true, data: { status: 'launched' } };
  }

  // Mark current phase as completed
  const { error: updateError } = await supabase
    .from('project_phases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', currentPhase.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Mark all tasks in this phase as done
  await supabase
    .from('tasks')
    .update({ status: 'Done', completed_at: new Date().toISOString() })
    .eq('phase_id', currentPhase.id)
    .neq('status', 'Done');

  // Find and start next phase
  const nextPhase = phases.find((p) => p.sort_order > currentPhase.sort_order);

  if (nextPhase) {
    await supabase
      .from('project_phases')
      .update({ status: 'in_progress', is_locked: false })
      .eq('id', nextPhase.id);
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);

  return {
    success: true,
    data: {
      completedPhase: currentPhase.name,
      nextPhase: nextPhase?.name || null,
    },
  };
}

// ============================================================================
// MOVE PROJECT BACK TO PREVIOUS PHASE
// ============================================================================

export async function regressProjectPhase(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Get all phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, status, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (phasesError || !phases || phases.length === 0) {
    return { success: false, error: 'No phases found for project' };
  }

  // Find current phase (first non-completed, or last completed if all done)
  let currentPhaseIndex = phases.findIndex((p) => p.status !== 'completed');

  if (currentPhaseIndex === -1) {
    currentPhaseIndex = phases.length; // All completed
  }

  if (currentPhaseIndex === 0) {
    return { success: false, error: 'Already at first phase' };
  }

  // Get previous phase
  const previousPhase = phases[currentPhaseIndex - 1];

  // Mark previous phase as in_progress
  const { error: updateError } = await supabase
    .from('project_phases')
    .update({
      status: 'in_progress',
      completed_at: null,
    })
    .eq('id', previousPhase.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // If project was launched, set back to active
  await supabase
    .from('projects')
    .update({ status: 'Active' })
    .eq('id', projectId)
    .eq('status', 'Launched');

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);

  return {
    success: true,
    data: { movedToPhase: previousPhase.name },
  };
}

// ============================================================================
// SET PROJECT TO SPECIFIC PHASE
// ============================================================================

export async function setProjectPhase(
  projectId: string,
  targetPhaseName: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get all phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, status, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (phasesError || !phases || phases.length === 0) {
    return { success: false, error: 'No phases found for project' };
  }

  const targetPhase = phases.find((p) => p.name === targetPhaseName);

  if (!targetPhase) {
    return { success: false, error: `Phase "${targetPhaseName}" not found` };
  }

  // Mark all phases before target as completed
  const phasesBefore = phases.filter((p) => p.sort_order < targetPhase.sort_order);
  const phasesAfter = phases.filter((p) => p.sort_order > targetPhase.sort_order);

  // Update phases before target to completed
  for (const phase of phasesBefore) {
    await supabase
      .from('project_phases')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', phase.id);
  }

  // Set target phase as in_progress
  await supabase
    .from('project_phases')
    .update({ status: 'in_progress', is_locked: false, completed_at: null })
    .eq('id', targetPhase.id);

  // Reset phases after target to not_started
  for (const phase of phasesAfter) {
    await supabase
      .from('project_phases')
      .update({ status: 'not_started', completed_at: null })
      .eq('id', phase.id);
  }

  // Ensure project is Active
  await supabase.from('projects').update({ status: 'Active' }).eq('id', projectId);

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);

  return { success: true, data: { currentPhase: targetPhaseName } };
}
