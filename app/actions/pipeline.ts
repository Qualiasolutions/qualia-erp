'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import { isUserAdmin } from './shared';
import {
  getTemplateForType,
  WEB_DESIGN_TEMPLATE,
  type GSDProjectTemplate,
} from '@/lib/gsd-templates';
import type { Database } from '@/types/database';

type ProjectType = Database['public']['Enums']['project_type'];

// Legacy fallback for backwards compatibility with existing code
// Maps GSD template to old format
const UNIVERSAL_PIPELINE = WEB_DESIGN_TEMPLATE.phases.map((phase) => ({
  name: phase.name,
  order: phase.tasks.length,
  description: phase.description,
  tasks: phase.tasks.map((t) => t.title),
}));

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
  is_locked: boolean;
  helper_text: string | null;
  template_key: string | null;
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

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

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
      created_by: user.id,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

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

// Extended type for dashboard notes with project info
export interface DashboardNote extends ProjectNote {
  project?: {
    id: string;
    name: string;
  } | null;
}

// Get all project notes for a workspace (for dashboard)
export async function getAllProjectNotes(workspaceId: string): Promise<DashboardNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_notes')
    .select(
      `
      *,
      profile:profiles(full_name, avatar_url, email),
      project:projects(id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[getAllProjectNotes] Error:', error);
    return [];
  }

  // Normalize FK arrays
  return (data || []).map((note) => ({
    ...note,
    profile: Array.isArray(note.profile) ? note.profile[0] : note.profile,
    project: Array.isArray(note.project) ? note.project[0] : note.project,
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

  revalidatePath(`/portal/${projectId}`);
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

/**
 * Initialize project pipeline with GSD phases.
 * Now type-aware: uses different templates for web_design, ai_agent, voice_agent, etc.
 *
 * @param projectId - The project ID to initialize
 * @param projectType - Optional project type override (defaults to project's type or web_design)
 */
export async function initializeProjectPipeline(
  projectId: string,
  projectType?: ProjectType
): Promise<ActionResult> {
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

  // Get project to get workspace_id and type
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id, project_type')
    .eq('id', projectId)
    .single();

  if (!project) {
    return { success: false, error: 'Project not found' };
  }

  // Determine effective project type
  const effectiveType: ProjectType = projectType || project.project_type || 'web_design';

  // Get type-specific template
  const template: GSDProjectTemplate = getTemplateForType(effectiveType);

  // Create all 6 GSD phases (first phase unlocked, rest locked)
  const phases = template.phases.map((phase, index) => ({
    project_id: projectId,
    workspace_id: project.workspace_id,
    name: phase.name,
    description: phase.description,
    helper_text: phase.prompt, // Store the "perfect prompt" in helper_text
    template_key: `${effectiveType}_${phase.name.toLowerCase()}`,
    display_order: index + 1,
    status: 'not_started',
    is_locked: index > 0, // First phase (SETUP) is unlocked, rest are locked
    auto_progress: true,
    is_custom: false,
  }));

  const { data: createdPhases, error: phasesError } = await supabase
    .from('project_phases')
    .insert(phases)
    .select('id, name, display_order');

  if (phasesError || !createdPhases) {
    console.error('[initializeProjectPipeline] Error creating phases:', phasesError);
    return { success: false, error: phasesError?.message || 'Failed to create phases' };
  }

  // Set up prerequisite links (each phase depends on the previous one)
  const sortedPhases = [...createdPhases].sort((a, b) => a.display_order - b.display_order);
  for (let i = 1; i < sortedPhases.length; i++) {
    const currentPhase = sortedPhases[i];
    const previousPhase = sortedPhases[i - 1];
    await supabase
      .from('project_phases')
      .update({ prerequisite_phase_id: previousPhase.id })
      .eq('id', currentPhase.id);
  }

  // Create tasks from type-specific template
  const tasks: Array<{
    workspace_id: string;
    project_id: string;
    phase_id: string;
    phase_name: string;
    title: string;
    description: string | null;
    status: string;
    sort_order: number;
  }> = [];

  for (const createdPhase of createdPhases) {
    const phaseDef = template.phases.find(
      (p) => p.name.toUpperCase() === createdPhase.name.toUpperCase()
    );
    if (phaseDef) {
      phaseDef.tasks.forEach((task, index) => {
        tasks.push({
          workspace_id: project.workspace_id,
          project_id: projectId,
          phase_id: createdPhase.id,
          phase_name: createdPhase.name,
          title: task.title,
          description: task.helperText, // Store helper text in description
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

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

export async function updatePhaseStatus(
  phaseId: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped',
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Get old status to check if it actually changed
  const { data: oldPhase } = await supabase
    .from('project_phases')
    .select('status, name')
    .eq('id', phaseId)
    .single();

  const { error } = await supabase.from('project_phases').update({ status }).eq('id', phaseId);

  if (error) {
    console.error('[updatePhaseStatus] Error:', error);
    return { success: false, error: error.message };
  }

  // Notify clients for significant status changes (preference-aware)
  if (oldPhase && oldPhase.status !== status && (status === 'completed' || status === 'skipped')) {
    const empName =
      (await supabase.from('profiles').select('full_name').eq('id', user.id).single()).data
        ?.full_name || 'Team member';
    const milestoneType = status === 'completed' ? ('completed' as const) : ('started' as const);
    import('@/lib/email').then(({ notifyClientOfPhaseMilestone }) => {
      notifyClientOfPhaseMilestone(projectId, empName, oldPhase.name, milestoneType).catch((err) =>
        console.error('[updatePhaseStatus] Notification error:', err)
      );
    });
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

export async function updatePhaseName(
  phaseId: string,
  name: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('project_phases').update({ name }).eq('id', phaseId);

  if (error) {
    console.error('[updatePhaseName] Error:', error);
    return { success: false, error: error.message };
  }

  // Also update phase_name on all linked tasks
  await supabase.from('tasks').update({ phase_name: name }).eq('phase_id', phaseId);

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

export async function deletePhase(phaseId: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Delete all tasks linked to this phase first
  const { error: tasksError } = await supabase.from('tasks').delete().eq('phase_id', phaseId);

  if (tasksError) {
    console.error('[deletePhase] Error deleting tasks:', tasksError);
    return { success: false, error: tasksError.message };
  }

  // Delete all resources linked to this phase
  const { error: resourcesError } = await supabase
    .from('phase_resources')
    .delete()
    .eq('phase_id', phaseId);

  if (resourcesError) {
    console.error('[deletePhase] Error deleting resources:', resourcesError);
    // Continue anyway, resources might not exist
  }

  // Delete the phase
  const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

  if (error) {
    console.error('[deletePhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

export async function createPhase(
  projectId: string,
  name: string,
  description?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current max sort_order for this project
  const { data: existingPhases } = await supabase
    .from('project_phases')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder =
    existingPhases && existingPhases.length > 0 ? (existingPhases[0].sort_order || 0) + 1 : 1;

  const { data, error } = await supabase
    .from('project_phases')
    .insert({
      project_id: projectId,
      name,
      description: description || null,
      sort_order: nextOrder,
      status: 'not_started',
    })
    .select()
    .single();

  if (error) {
    console.error('[createPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true, data };
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
      is_locked: phase.is_locked ?? false,
      helper_text: phase.helper_text ?? null,
      template_key: phase.template_key ?? null,
      task_count: taskStats.total,
      completed_task_count: taskStats.completed,
      resource_count: resourceCountMap[phase.id] || 0,
      progress,
    };
  });
}

// ============================================================================
// RESET AND ADD DEFAULT TASKS TO ALL PHASES
// ============================================================================

export async function resetAllPhaseTasks(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (!(await isUserAdmin(user.id))) return { success: false, error: 'Admin access required' };

  // Get all phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, project_id');

  if (phasesError) {
    console.error('[resetAllPhaseTasks] Error fetching phases:', phasesError);
    return { success: false, error: phasesError.message };
  }

  if (!phases || phases.length === 0) {
    return { success: true, data: { message: 'No phases found', count: 0 } };
  }

  // Get all projects to get workspace_ids
  const projectIds = [...new Set(phases.map((p) => p.project_id))];
  const { data: projects } = await supabase
    .from('projects')
    .select('id, workspace_id')
    .in('id', projectIds);

  const projectWorkspaceMap: Record<string, string> = {};
  (projects || []).forEach((p) => {
    projectWorkspaceMap[p.id] = p.workspace_id;
  });

  // Delete all existing phase-linked tasks
  const phaseIds = phases.map((p) => p.id);
  const { error: deleteError } = await supabase.from('tasks').delete().in('phase_id', phaseIds);

  if (deleteError) {
    console.error('[resetAllPhaseTasks] Error deleting tasks:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // Create new default tasks for each phase
  const tasks: Array<{
    workspace_id: string;
    project_id: string;
    phase_id: string;
    phase_name: string;
    title: string;
    status: string;
    sort_order: number;
  }> = [];

  for (const phase of phases) {
    const phaseDef = UNIVERSAL_PIPELINE.find((p) => p.name === phase.name);
    if (phaseDef) {
      const workspaceId = projectWorkspaceMap[phase.project_id];
      if (!workspaceId) continue;

      phaseDef.tasks.forEach((taskTitle, index) => {
        tasks.push({
          workspace_id: workspaceId,
          project_id: phase.project_id,
          phase_id: phase.id,
          phase_name: phase.name,
          title: taskTitle,
          status: 'Todo',
          sort_order: index,
        });
      });
    }
  }

  if (tasks.length > 0) {
    const { error: insertError } = await supabase.from('tasks').insert(tasks);
    if (insertError) {
      console.error('[resetAllPhaseTasks] Error inserting tasks:', insertError);
      return { success: false, error: insertError.message };
    }
  }

  return {
    success: true,
    data: {
      message: `Reset tasks for ${phases.length} phases`,
      phasesUpdated: phases.length,
      tasksCreated: tasks.length,
    },
  };
}

// ============================================================================
// LINK TASKS TO PHASES BY phase_name
// ============================================================================

export async function linkTasksToPhases(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (!(await isUserAdmin(user.id))) return { success: false, error: 'Admin access required' };

  // Get tasks that have phase_name but no phase_id
  const { data: unlinkedTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, project_id, phase_name')
    .is('phase_id', null)
    .not('phase_name', 'is', null);

  if (tasksError) {
    console.error('[linkTasksToPhases] Error fetching tasks:', tasksError);
    return { success: false, error: tasksError.message };
  }

  if (!unlinkedTasks || unlinkedTasks.length === 0) {
    return { success: true, data: { message: 'No unlinked tasks found', count: 0 } };
  }

  // Get all phases
  const { data: phases } = await supabase.from('project_phases').select('id, project_id, name');

  if (!phases) {
    return { success: true, data: { message: 'No phases found', count: 0 } };
  }

  // Build lookup map: project_id -> phase_name -> phase_id
  const phaseMap: Record<string, Record<string, string>> = {};
  for (const phase of phases) {
    if (!phaseMap[phase.project_id]) {
      phaseMap[phase.project_id] = {};
    }
    phaseMap[phase.project_id][phase.name] = phase.id;
  }

  // Update tasks with their phase_id
  let linkedCount = 0;
  for (const task of unlinkedTasks) {
    const phaseId = phaseMap[task.project_id]?.[task.phase_name || ''];
    if (phaseId) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ phase_id: phaseId })
        .eq('id', task.id);

      if (!updateError) {
        linkedCount++;
      }
    }
  }

  return {
    success: true,
    data: {
      message: `Linked ${linkedCount} tasks to phases`,
      tasksLinked: linkedCount,
      totalUnlinked: unlinkedTasks.length,
    },
  };
}

// ============================================================================
// INITIALIZE PIPELINES FOR ALL PROJECTS
// ============================================================================

export async function initializePipelinesForAllProjects(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (!(await isUserAdmin(user.id))) return { success: false, error: 'Admin access required' };

  // Get all projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, workspace_id');

  if (projectsError) {
    console.error('[initializePipelinesForAll] Error fetching projects:', projectsError);
    return { success: false, error: projectsError.message };
  }

  // Get projects that already have phases
  const { data: existingPhases } = await supabase.from('project_phases').select('project_id');

  const projectsWithPhases = new Set((existingPhases || []).map((p) => p.project_id));

  // Filter to projects without phases
  const projectsWithoutPhases = (projects || []).filter((p) => !projectsWithPhases.has(p.id));

  if (projectsWithoutPhases.length === 0) {
    return { success: true, data: { message: 'All projects already have pipelines', count: 0 } };
  }

  let phasesCreated = 0;
  let tasksCreated = 0;

  for (const project of projectsWithoutPhases) {
    // Create phases for this project
    const phases = UNIVERSAL_PIPELINE.map((phase) => ({
      project_id: project.id,
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
      console.error(
        `[initializePipelinesForAll] Error creating phases for project ${project.id}:`,
        phasesError
      );
      continue;
    }

    phasesCreated += createdPhases.length;

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
            project_id: project.id,
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
      if (!tasksError) {
        tasksCreated += tasks.length;
      }
    }
  }

  return {
    success: true,
    data: {
      message: `Initialized ${projectsWithoutPhases.length} projects`,
      projectsInitialized: projectsWithoutPhases.length,
      phasesCreated,
      tasksCreated,
    },
  };
}

// ============================================================================
// POPULATE DEFAULT TASKS FOR EXISTING PROJECTS
// ============================================================================

export async function populateDefaultTasksForAllProjects(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (!(await isUserAdmin(user.id))) return { success: false, error: 'Admin access required' };

  // Get all phases that have no tasks
  const { data: phasesWithoutTasks, error: phasesError } = await supabase.from('project_phases')
    .select(`
      id,
      name,
      project_id,
      projects!inner(workspace_id)
    `);

  if (phasesError) {
    console.error('[populateDefaultTasks] Error fetching phases:', phasesError);
    return { success: false, error: phasesError.message };
  }

  // Get existing task counts per phase
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('phase_id')
    .not('phase_id', 'is', null);

  const phasesWithTasks = new Set((existingTasks || []).map((t) => t.phase_id));

  // Filter to phases without tasks
  const emptyPhases = (phasesWithoutTasks || []).filter((p) => !phasesWithTasks.has(p.id));

  if (emptyPhases.length === 0) {
    return { success: true, data: { message: 'All phases already have tasks', count: 0 } };
  }

  // Create tasks for empty phases
  const tasks: Array<{
    workspace_id: string;
    project_id: string;
    phase_id: string;
    phase_name: string;
    title: string;
    status: string;
    sort_order: number;
  }> = [];

  for (const phase of emptyPhases) {
    const phaseDef = UNIVERSAL_PIPELINE.find((p) => p.name === phase.name);
    if (phaseDef) {
      // Handle both array and object FK response from Supabase
      const projectData = phase.projects as { workspace_id: string } | { workspace_id: string }[];
      const workspaceId = Array.isArray(projectData)
        ? projectData[0]?.workspace_id
        : projectData?.workspace_id;
      if (!workspaceId) continue;
      phaseDef.tasks.forEach((taskTitle, index) => {
        tasks.push({
          workspace_id: workspaceId,
          project_id: phase.project_id,
          phase_id: phase.id,
          phase_name: phase.name,
          title: taskTitle,
          status: 'Todo',
          sort_order: index,
        });
      });
    }
  }

  if (tasks.length > 0) {
    const { error: insertError } = await supabase.from('tasks').insert(tasks);
    if (insertError) {
      console.error('[populateDefaultTasks] Error inserting tasks:', insertError);
      return { success: false, error: insertError.message };
    }
  }

  return {
    success: true,
    data: {
      message: `Created ${tasks.length} tasks for ${emptyPhases.length} phases`,
      phasesUpdated: emptyPhases.length,
      tasksCreated: tasks.length,
    },
  };
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

// ============================================================================
// TOGGLE PHASE TASK (phase_items table)
// ============================================================================

/**
 * Toggle completion state of a phase_items task
 * Auto-completes phase when all tasks are done (if auto_progress enabled)
 */
export async function togglePhaseTask(itemId: string, phaseId: string): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Get current state and auth user
    const [itemResult, userResult] = await Promise.all([
      supabase.from('phase_items').select('is_completed').eq('id', itemId).single(),
      supabase.auth.getUser(),
    ]);

    if (itemResult.error) {
      console.error('[togglePhaseTask] Error fetching item:', itemResult.error);
      return { success: false, error: 'Task not found' };
    }

    const currentState = itemResult.data.is_completed;
    const newState = !currentState;
    const userId = userResult.data.user?.id || null;

    // Toggle completion
    const updateData: {
      is_completed: boolean;
      completed_at: string | null;
      completed_by: string | null;
    } = {
      is_completed: newState,
      completed_at: newState ? new Date().toISOString() : null,
      completed_by: newState ? userId : null,
    };

    const { error: updateError } = await supabase
      .from('phase_items')
      .update(updateData)
      .eq('id', itemId);

    if (updateError) {
      console.error('[togglePhaseTask] Error updating item:', updateError);
      return { success: false, error: updateError.message };
    }

    // Get project_id for revalidation
    const { data: phase } = await supabase
      .from('project_phases')
      .select('project_id')
      .eq('id', phaseId)
      .single();

    const projectId = phase?.project_id;

    // Check if phase should auto-complete
    if (newState) {
      // Import checkPhaseProgress from phases.ts
      const { checkPhaseProgress } = await import('./phases');
      await checkPhaseProgress(phaseId);
    }

    // Revalidate relevant paths
    if (projectId) {
      revalidatePath(`/portal/${projectId}`);
      revalidatePath(`/portal/${projectId}/roadmap`);
    }
    revalidatePath('/portal/projects');

    return { success: true, data: { is_completed: newState } };
  } catch (error) {
    console.error('[togglePhaseTask] Unexpected error:', error);
    return { success: false, error: 'Failed to toggle task' };
  }
}

// ============================================================================
// UPDATE ALL PROJECT PHASE TASKS TO NEW TEMPLATE
// ============================================================================

/**
 * Updates tasks for phases 2-5 (Design, Build, Test, Ship) on all existing projects
 * to use the new Claude workflow format. Preserves completion status where titles match.
 */
export async function updateAllProjectPhaseTasks(): Promise<ActionResult> {
  // Redirect to the new GSD migration
  return migrateAllProjectsToGSD();
}

// ============================================================================
// MIGRATE ALL PROJECTS TO GSD 6-PHASE WORKFLOW
// ============================================================================

/**
 * Full migration to GSD 6-phase workflow:
 * SETUP → DISCUSS → PLAN → EXECUTE → VERIFY → SHIP
 *
 * This will:
 * 1. Delete all existing phases and phase-linked tasks
 * 2. Recreate phases using project_type-specific templates
 * 3. Create type-appropriate tasks for each phase
 */
export async function migrateAllProjectsToGSD(): Promise<ActionResult> {
  const supabase = await createClient();

  // Auth check: only admins can run bulk migration
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required' };

  // Get all projects with their types
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, workspace_id, project_type, name');

  if (projectsError) {
    console.error('[migrateAllProjectsToGSD] Error fetching projects:', projectsError);
    return { success: false, error: projectsError.message };
  }

  if (!projects || projects.length === 0) {
    return { success: true, data: { message: 'No projects found', count: 0 } };
  }

  let projectsUpdated = 0;
  let phasesCreated = 0;
  let tasksCreated = 0;
  const errors: string[] = [];

  for (const project of projects) {
    try {
      // Delete existing phases (cascades to tasks via phase_id)
      const { data: existingPhases } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', project.id);

      if (existingPhases && existingPhases.length > 0) {
        const phaseIds = existingPhases.map((p) => p.id);

        // Delete tasks linked to these phases
        await supabase.from('tasks').delete().in('phase_id', phaseIds);

        // Delete phase resources
        await supabase.from('phase_resources').delete().in('phase_id', phaseIds);

        // Delete the phases
        await supabase.from('project_phases').delete().eq('project_id', project.id);
      }

      // Also delete any orphaned tasks with phase_name but no phase_id
      await supabase
        .from('tasks')
        .delete()
        .eq('project_id', project.id)
        .not('phase_name', 'is', null);

      // Get the type-specific template
      const effectiveType: ProjectType = project.project_type || 'web_design';
      const template = getTemplateForType(effectiveType);

      // Create new GSD phases
      const phases = template.phases.map((phase, index) => ({
        project_id: project.id,
        workspace_id: project.workspace_id,
        name: phase.name,
        description: phase.description,
        helper_text: phase.prompt,
        template_key: `${effectiveType}_${phase.name.toLowerCase()}`,
        display_order: index + 1,
        status: 'not_started',
        is_locked: index > 0, // First phase unlocked
        auto_progress: true,
        is_custom: false,
      }));

      const { data: createdPhases, error: phasesError } = await supabase
        .from('project_phases')
        .insert(phases)
        .select('id, name, display_order');

      if (phasesError || !createdPhases) {
        errors.push(
          `Project ${project.name}: ${phasesError?.message || 'Failed to create phases'}`
        );
        continue;
      }

      phasesCreated += createdPhases.length;

      // Set up prerequisite links
      const sortedPhases = [...createdPhases].sort((a, b) => a.display_order - b.display_order);
      for (let i = 1; i < sortedPhases.length; i++) {
        await supabase
          .from('project_phases')
          .update({ prerequisite_phase_id: sortedPhases[i - 1].id })
          .eq('id', sortedPhases[i].id);
      }

      // Create tasks from template
      const tasks: Array<{
        workspace_id: string;
        project_id: string;
        phase_id: string;
        phase_name: string;
        title: string;
        description: string | null;
        status: string;
        sort_order: number;
        show_in_inbox: boolean;
      }> = [];

      for (const createdPhase of createdPhases) {
        const phaseDef = template.phases.find(
          (p) => p.name.toUpperCase() === createdPhase.name.toUpperCase()
        );
        if (phaseDef) {
          phaseDef.tasks.forEach((task, index) => {
            tasks.push({
              workspace_id: project.workspace_id,
              project_id: project.id,
              phase_id: createdPhase.id,
              phase_name: createdPhase.name,
              title: task.title,
              description: task.helperText,
              status: 'Todo',
              sort_order: index,
              show_in_inbox: false,
            });
          });
        }
      }

      if (tasks.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').insert(tasks);
        if (tasksError) {
          errors.push(`Project ${project.name} tasks: ${tasksError.message}`);
        } else {
          tasksCreated += tasks.length;
        }
      }

      projectsUpdated++;
    } catch (err) {
      errors.push(`Project ${project.name}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    data: {
      message: `Migrated ${projectsUpdated} projects to GSD workflow`,
      projectsUpdated,
      phasesCreated,
      tasksCreated,
      errors: errors.length > 0 ? errors : undefined,
    },
    error: errors.length > 0 ? `${errors.length} errors occurred` : undefined,
  };
}
