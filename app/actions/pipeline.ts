'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';

// ============================================================================
// TYPES
// ============================================================================

export interface PhaseResource {
  id: string;
  phase_id: string;
  title: string;
  url: string | null;
  description: string | null;
  resource_type: 'link' | 'document' | 'figma' | 'notion' | 'github' | 'other';
  display_order: number;
  created_at: string;
  created_by: string | null;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  workspace_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface PhaseWithDetails {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  sort_order: number;
  created_at: string;
  // Computed fields
  task_count: number;
  completed_task_count: number;
  resource_count: number;
  progress: number;
}

// ============================================================================
// PHASE RESOURCES
// ============================================================================

export async function getPhaseResources(phaseId: string): Promise<PhaseResource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('phase_resources')
    .select('*')
    .eq('phase_id', phaseId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getPhaseResources] Error:', error);
    return [];
  }

  return data || [];
}

export async function createPhaseResource(
  phaseId: string,
  input: {
    title: string;
    url?: string;
    description?: string;
    resource_type?: PhaseResource['resource_type'];
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get max display_order
  const { data: existing } = await supabase
    .from('phase_resources')
    .select('display_order')
    .eq('phase_id', phaseId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order || 0) + 1 : 0;

  const { data, error } = await supabase
    .from('phase_resources')
    .insert({
      phase_id: phaseId,
      title: input.title,
      url: input.url || null,
      description: input.description || null,
      resource_type: input.resource_type || 'link',
      display_order: nextOrder,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createPhaseResource] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function updatePhaseResource(
  resourceId: string,
  input: {
    title?: string;
    url?: string;
    description?: string;
    resource_type?: PhaseResource['resource_type'];
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('phase_resources')
    .update({
      ...(input.title && { title: input.title }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.resource_type && { resource_type: input.resource_type }),
    })
    .eq('id', resourceId);

  if (error) {
    console.error('[updatePhaseResource] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deletePhaseResource(resourceId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('phase_resources').delete().eq('id', resourceId);

  if (error) {
    console.error('[deletePhaseResource] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// PROJECT NOTES
// ============================================================================

export async function getProjectNotes(projectId: string): Promise<ProjectNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_notes')
    .select(
      `
      *,
      profile:profiles(full_name, avatar_url, email)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getProjectNotes] Error:', error);
    return [];
  }

  // Normalize FK arrays
  return (data || []).map((note) => ({
    ...note,
    profile: Array.isArray(note.profile) ? note.profile[0] : note.profile,
  }));
}

export async function createProjectNote(
  projectId: string,
  workspaceId: string,
  content: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('project_notes')
    .insert({
      project_id: projectId,
      workspace_id: workspaceId,
      content,
      user_id: user.id,
    })
    .select(
      `
      *,
      profile:profiles(full_name, avatar_url, email)
    `
    )
    .single();

  if (error) {
    console.error('[createProjectNote] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    success: true,
    data: {
      ...data,
      profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    },
  };
}

export async function updateProjectNote(noteId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('project_notes').update({ content }).eq('id', noteId);

  if (error) {
    console.error('[updateProjectNote] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteProjectNote(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('project_notes').delete().eq('id', noteId);

  if (error) {
    console.error('[deleteProjectNote] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// PIPELINE HELPERS
// ============================================================================

// Default pipeline phases with tasks
const UNIVERSAL_PIPELINE = [
  {
    name: 'Plan',
    order: 1,
    description: 'Define scope and requirements',
    tasks: [
      'Define project scope and goals',
      'List core features (MVP)',
      'Identify tech stack',
      'Set up project resources (GitHub, Supabase, Vercel)',
    ],
  },
  {
    name: 'Design',
    order: 2,
    description: 'Create specifications and mockups',
    tasks: [
      'Create wireframes/mockups',
      'Define database schema',
      'Plan API structure',
      'Review with client/team',
    ],
  },
  {
    name: 'Build',
    order: 3,
    description: 'Implement the solution',
    tasks: [
      'Set up project boilerplate',
      'Build core functionality',
      'Implement UI components',
      'Connect to backend/database',
    ],
  },
  {
    name: 'Test',
    order: 4,
    description: 'Verify quality and functionality',
    tasks: [
      'Test all features manually',
      'Fix bugs and issues',
      'Test on different devices',
      'Get feedback and iterate',
    ],
  },
  {
    name: 'Ship',
    order: 5,
    description: 'Deploy and deliver',
    tasks: [
      'Deploy to production',
      'Set up domain/DNS',
      'Final client review',
      'Handover documentation',
    ],
  },
];

export async function initializeProjectPipeline(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if phases already exist
  const { data: existing } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, data: { message: 'Pipeline already initialized' } };
  }

  // Get project to get workspace_id
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single();

  if (!project) {
    return { success: false, error: 'Project not found' };
  }

  // Create all 5 phases
  const phases = UNIVERSAL_PIPELINE.map((phase) => ({
    project_id: projectId,
    name: phase.name,
    description: phase.description,
    sort_order: phase.order,
    status: 'not_started',
  }));

  const { data: createdPhases, error: phasesError } = await supabase
    .from('project_phases')
    .insert(phases)
    .select('id, name');

  if (phasesError || !createdPhases) {
    console.error('[initializeProjectPipeline] Error creating phases:', phasesError);
    return { success: false, error: phasesError?.message || 'Failed to create phases' };
  }

  // Create default tasks for each phase
  const tasks: Array<{
    workspace_id: string;
    project_id: string;
    phase_id: string;
    phase_name: string;
    title: string;
    status: string;
    sort_order: number;
  }> = [];

  for (const createdPhase of createdPhases) {
    const phaseDef = UNIVERSAL_PIPELINE.find((p) => p.name === createdPhase.name);
    if (phaseDef) {
      phaseDef.tasks.forEach((taskTitle, index) => {
        tasks.push({
          workspace_id: project.workspace_id,
          project_id: projectId,
          phase_id: createdPhase.id,
          phase_name: createdPhase.name,
          title: taskTitle,
          status: 'Todo',
          sort_order: index,
        });
      });
    }
  }

  if (tasks.length > 0) {
    const { error: tasksError } = await supabase.from('tasks').insert(tasks);
    if (tasksError) {
      console.error('[initializeProjectPipeline] Error creating tasks:', tasksError);
      // Don't fail the whole operation, phases are created
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updatePhaseStatus(
  phaseId: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped',
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('project_phases').update({ status }).eq('id', phaseId);

  if (error) {
    console.error('[updatePhaseStatus] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// ============================================================================
// DETAILED PHASE FETCH (with counts)
// ============================================================================

export async function getProjectPhasesWithDetails(projectId: string): Promise<PhaseWithDetails[]> {
  const supabase = await createClient();

  // Get phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (phasesError || !phases) {
    console.error('[getProjectPhasesWithDetails] Error:', phasesError);
    return [];
  }

  // Get task counts per phase
  const { data: tasks } = await supabase
    .from('tasks')
    .select('phase_id, status')
    .eq('project_id', projectId);

  // Get resource counts per phase
  const phaseIds = phases.map((p) => p.id);
  const { data: resources } = await supabase
    .from('phase_resources')
    .select('phase_id')
    .in('phase_id', phaseIds);

  // Build lookup maps
  const taskCountMap: Record<string, { total: number; completed: number }> = {};
  const resourceCountMap: Record<string, number> = {};

  (tasks || []).forEach((task) => {
    if (!task.phase_id) return;
    if (!taskCountMap[task.phase_id]) {
      taskCountMap[task.phase_id] = { total: 0, completed: 0 };
    }
    taskCountMap[task.phase_id].total++;
    if (task.status === 'Done') {
      taskCountMap[task.phase_id].completed++;
    }
  });

  (resources || []).forEach((r) => {
    resourceCountMap[r.phase_id] = (resourceCountMap[r.phase_id] || 0) + 1;
  });

  // Map phases with computed fields
  return phases.map((phase) => {
    const taskStats = taskCountMap[phase.id] || { total: 0, completed: 0 };
    const progress =
      taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

    return {
      id: phase.id,
      project_id: phase.project_id,
      name: phase.name,
      description: phase.description,
      status: phase.status || 'not_started',
      sort_order: phase.sort_order || 0,
      created_at: phase.created_at,
      task_count: taskStats.total,
      completed_task_count: taskStats.completed,
      resource_count: resourceCountMap[phase.id] || 0,
      progress,
    };
  });
}

// ============================================================================
// GET TASKS FOR PHASE
// ============================================================================

export async function getPhaseTasks(phaseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      due_date,
      sort_order,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('phase_id', phaseId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getPhaseTasks] Error:', error);
    return [];
  }

  return (data || []).map((task) => ({
    ...task,
    assignee: Array.isArray(task.assignee) ? task.assignee[0] : task.assignee,
  }));
}
