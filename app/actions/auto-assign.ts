'use server';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUserManagerOrAbove } from './shared';

// ============ AUTO-ASSIGNMENT ENGINE ============
// Creates phase-level inbox tasks when employees are assigned to projects.
// Each non-completed phase becomes one task: "Complete {phase name}".
// When called without an externalClient (i.e. as a server action),
// auth is enforced. When called with an externalClient (webhook),
// the caller is responsible for auth.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

async function getClient(externalClient?: AnySupabaseClient) {
  if (externalClient) return externalClient;
  return createClient();
}

/** Verify auth when called as a server action (no external client). */
async function requireAuthIfServerAction(externalClient?: AnySupabaseClient): Promise<boolean> {
  if (externalClient) return true; // Webhook path — caller handles auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return isUserManagerOrAbove(user.id);
}

/**
 * Create one inbox task per non-completed phase in the project.
 *
 * Each task is titled "Complete {phase name}" and linked via source_phase_id
 * for idempotency — duplicate phases are silently skipped via the unique
 * index on (source_phase_id, assignee_id).
 *
 * @param projectId - The project UUID
 * @param assigneeId - The user UUID to assign tasks to
 * @param trigger - What caused this generation ('assignment' or 'milestone_cascade')
 * @returns Counts of created, skipped, and total phases
 */
export async function createTasksFromPhases(
  projectId: string,
  assigneeId: string,
  trigger: 'assignment' | 'milestone_cascade',
  supabaseClient?: AnySupabaseClient
): Promise<{ created: number; skipped: number; total: number }> {
  if (!(await requireAuthIfServerAction(supabaseClient)))
    return { created: 0, skipped: 0, total: 0 };
  const supabase = await getClient(supabaseClient);

  // 1. Fetch project to get workspace_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('workspace_id, name')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[createTasksFromPhases] Project not found:', projectError);
    return { created: 0, skipped: 0, total: 0 };
  }

  // 2. Fetch all non-completed phases for this project, ordered by sort_order.
  // Skip milestone rollup rows — they don't represent assignable work.
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, description, sort_order, milestone_number, status')
    .eq('project_id', projectId)
    .neq('status', 'completed')
    .neq('phase_type', 'milestone')
    .order('sort_order', { ascending: true });

  if (phasesError) {
    console.error('[createTasksFromPhases] Error fetching phases:', phasesError);
    return { created: 0, skipped: 0, total: 0 };
  }

  if (!phases || phases.length === 0) {
    return { created: 0, skipped: 0, total: 0 };
  }

  const total = phases.length;

  // 3. Check which phases already have tasks for this assignee
  const phaseIds = phases.map((p) => p.id);
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('source_phase_id')
    .in('source_phase_id', phaseIds)
    .eq('assignee_id', assigneeId);

  const existingPhaseIds = new Set((existingTasks || []).map((t) => t.source_phase_id));

  // 4. Build task objects for phases that don't already have tasks
  const taskObjects = phases
    .filter((phase) => !existingPhaseIds.has(phase.id))
    .map((phase) => {
      const milestone = phase.milestone_number ? `Milestone ${phase.milestone_number}` : null;

      return {
        title: `Complete ${phase.name}`,
        description: phase.description || null,
        project_id: projectId,
        assignee_id: assigneeId,
        phase_id: phase.id,
        phase_name: phase.name,
        milestone,
        source_phase_id: phase.id,
        auto_assign_trigger: trigger,
        show_in_inbox: true,
        status: phase.status === 'in_progress' ? ('In Progress' as const) : ('Todo' as const),
        item_type: 'task' as const,
        priority: 'Medium' as const,
        workspace_id: project.workspace_id,
        sort_order: (phase.sort_order ?? 0) * 100,
      };
    });

  if (taskObjects.length === 0) {
    return { created: 0, skipped: total, total };
  }

  // 5. Insert (skip duplicates via unique index on source_phase_id + assignee_id)
  const { data: inserted, error: insertError } = await supabase
    .from('tasks')
    .insert(taskObjects)
    .select('id');

  if (insertError) {
    console.error('[createTasksFromPhases] Insert error:', insertError);
    return { created: 0, skipped: total, total };
  }

  const created = inserted?.length ?? 0;
  const skipped = total - created;

  return { created, skipped, total };
}

// ============ LEGACY FUNCTIONS (used by webhook cascade) ============

/**
 * Get the current active milestone for a project.
 * @deprecated Use createTasksFromPhases instead for new assignment flows.
 */
export async function getActiveMilestone(projectId: string, supabaseClient?: AnySupabaseClient) {
  if (!(await requireAuthIfServerAction(supabaseClient))) return null;
  const supabase = await getClient(supabaseClient);

  const { data: phases, error } = await supabase
    .from('project_phases')
    .select('id, name, status, milestone_number, sort_order')
    .eq('project_id', projectId)
    .not('milestone_number', 'is', null)
    .neq('phase_type', 'milestone')
    .order('milestone_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getActiveMilestone] Error fetching phases:', error);
    return null;
  }

  if (!phases || phases.length === 0) return null;

  const milestoneGroups: Record<number, typeof phases> = {};
  for (const phase of phases) {
    const mn = phase.milestone_number as number;
    if (!milestoneGroups[mn]) milestoneGroups[mn] = [];
    milestoneGroups[mn].push(phase);
  }

  const milestoneNumbers = Object.keys(milestoneGroups)
    .map(Number)
    .sort((a, b) => a - b);

  let activeMilestoneNumber: number | null = null;
  for (const mn of milestoneNumbers) {
    const allCompleted = milestoneGroups[mn].every((p) => p.status === 'completed');
    if (!allCompleted) {
      activeMilestoneNumber = mn;
      break;
    }
  }

  if (activeMilestoneNumber === null) return null;

  const milestonePhases = milestoneGroups[activeMilestoneNumber];
  const phaseIds = milestonePhases.map((p) => p.id);

  const { data: phaseItems, error: itemsError } = await supabase
    .from('phase_items')
    .select('id, phase_id, title, description, helper_text, display_order, status, is_completed')
    .in('phase_id', phaseIds)
    .order('display_order', { ascending: true });

  if (itemsError) {
    console.error('[getActiveMilestone] Error fetching phase items:', itemsError);
    return null;
  }

  return {
    milestoneNumber: activeMilestoneNumber,
    phases: milestonePhases,
    phaseItems: phaseItems || [],
  };
}

/**
 * Create tasks from all phase items in a given milestone.
 * @deprecated Use createTasksFromPhases instead for new assignment flows.
 */
export async function createTasksFromMilestone(
  projectId: string,
  milestoneNumber: number,
  assigneeId: string,
  trigger: 'assignment' | 'milestone_cascade',
  supabaseClient?: AnySupabaseClient
): Promise<{ created: number; skipped: number; total: number }> {
  if (!(await requireAuthIfServerAction(supabaseClient)))
    return { created: 0, skipped: 0, total: 0 };
  const supabase = await getClient(supabaseClient);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[createTasksFromMilestone] Project not found:', projectError);
    return { created: 0, skipped: 0, total: 0 };
  }

  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, sort_order')
    .eq('project_id', projectId)
    .eq('milestone_number', milestoneNumber)
    .neq('phase_type', 'milestone')
    .order('sort_order', { ascending: true });

  if (phasesError || !phases || phases.length === 0) {
    console.error('[createTasksFromMilestone] No phases found:', phasesError);
    return { created: 0, skipped: 0, total: 0 };
  }

  const phaseIds = phases.map((p) => p.id);

  const { data: phaseItems, error: itemsError } = await supabase
    .from('phase_items')
    .select('id, phase_id, title, description, helper_text, display_order')
    .in('phase_id', phaseIds)
    .order('display_order', { ascending: true });

  if (itemsError || !phaseItems || phaseItems.length === 0) {
    console.error('[createTasksFromMilestone] No phase items found:', itemsError);
    return { created: 0, skipped: 0, total: 0 };
  }

  const total = phaseItems.length;

  const itemIds = phaseItems.map((item) => item.id);
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('source_phase_item_id')
    .in('source_phase_item_id', itemIds);

  const existingItemIds = new Set((existingTasks || []).map((t) => t.source_phase_item_id));

  const phaseLookup: Record<string, { name: string; sort_order: number | null }> = {};
  for (const phase of phases) {
    phaseLookup[phase.id] = { name: phase.name, sort_order: phase.sort_order };
  }

  const taskObjects = phaseItems
    .filter((item) => !existingItemIds.has(item.id))
    .map((item) => {
      const parentPhase = phaseLookup[item.phase_id];
      const phaseSortOrder = parentPhase?.sort_order ?? 0;

      return {
        title: item.title,
        description: item.description || item.helper_text || null,
        project_id: projectId,
        assignee_id: assigneeId,
        phase_id: item.phase_id,
        phase_name: parentPhase?.name || null,
        milestone: `Milestone ${milestoneNumber}`,
        source_phase_item_id: item.id,
        auto_assign_trigger: trigger,
        show_in_inbox: true,
        status: 'Todo' as const,
        item_type: 'task' as const,
        priority: 'No Priority' as const,
        workspace_id: project.workspace_id,
        sort_order: phaseSortOrder * 100 + item.display_order,
      };
    });

  if (taskObjects.length === 0) {
    return { created: 0, skipped: total, total };
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('tasks')
    .upsert(taskObjects, {
      onConflict: 'source_phase_item_id',
      ignoreDuplicates: true,
    })
    .select('id');

  if (upsertError) {
    console.error('[createTasksFromMilestone] Upsert error:', upsertError);
    return { created: 0, skipped: total, total };
  }

  const created = upserted?.length ?? 0;
  const skipped = total - created;

  return { created, skipped, total };
}

// ============ SHARED FUNCTIONS ============

/**
 * Handle reassignment of phase-level tasks when a project member changes.
 *
 * Transfers undone phase tasks from the old user to the new user.
 * If none exist, creates fresh phase tasks.
 */
export async function handleReassignment(
  projectId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ transferred: number; created: number }> {
  if (!(await requireAuthIfServerAction())) return { transferred: 0, created: 0 };
  const supabase = await createClient();

  // Find undone phase-level tasks assigned to the old user
  const { data: existingTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assignee_id', fromUserId)
    .neq('status', 'Done')
    .not('source_phase_id', 'is', null);

  if (fetchError) {
    console.error('[handleReassignment] Error fetching tasks:', fetchError);
    return { transferred: 0, created: 0 };
  }

  if (existingTasks && existingTasks.length > 0) {
    const taskIds = existingTasks.map((t) => t.id);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assignee_id: toUserId })
      .in('id', taskIds);

    if (updateError) {
      console.error('[handleReassignment] Error transferring tasks:', updateError);
      return { transferred: 0, created: 0 };
    }

    return { transferred: existingTasks.length, created: 0 };
  }

  // No existing tasks — create fresh phase-level tasks
  const result = await createTasksFromPhases(projectId, toUserId, 'assignment');
  return { transferred: 0, created: result.created };
}

/**
 * Mark a phase-level auto-created task as Done when its phase is completed.
 */
export async function markPhaseTaskDone(
  projectId: string,
  phaseId: string,
  supabaseClient?: AnySupabaseClient
): Promise<number> {
  if (!(await requireAuthIfServerAction(supabaseClient))) return 0;
  const supabase = await getClient(supabaseClient);

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'Done' as const,
      completed_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('source_phase_id', phaseId)
    .neq('status', 'Done')
    .select('id');

  if (updateError) {
    console.error('[markPhaseTaskDone] Error updating tasks:', updateError);
    return 0;
  }

  return updated?.length ?? 0;
}

/**
 * Mark all phase-level tasks in a milestone as Done.
 */
export async function markMilestoneTasksDone(
  projectId: string,
  milestoneNumber: number,
  supabaseClient?: AnySupabaseClient
): Promise<number> {
  if (!(await requireAuthIfServerAction(supabaseClient))) return 0;
  const supabase = await getClient(supabaseClient);

  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId)
    .eq('milestone_number', milestoneNumber)
    .neq('phase_type', 'milestone');

  if (phasesError || !phases || phases.length === 0) {
    console.error('[markMilestoneTasksDone] No phases found:', phasesError);
    return 0;
  }

  const phaseIds = phases.map((p) => p.id);

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'Done' as const,
      completed_at: new Date().toISOString(),
    })
    .in('source_phase_id', phaseIds)
    .neq('status', 'Done')
    .select('id');

  if (updateError) {
    console.error('[markMilestoneTasksDone] Error updating tasks:', updateError);
    return 0;
  }

  return updated?.length ?? 0;
}
