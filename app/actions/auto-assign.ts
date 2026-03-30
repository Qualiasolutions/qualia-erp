'use server';

import { createClient } from '@/lib/supabase/server';

// ============ AUTO-ASSIGNMENT ENGINE ============
// Internal engine functions for creating tasks from project phase items
// when someone gets assigned to a project. NO auth checks here --
// callers (Phase 2/3 integration points) handle authorization.

/**
 * Get the current active milestone for a project.
 *
 * Finds the lowest milestone_number where at least one phase is not yet completed,
 * then returns all phases and phase_items for that milestone.
 *
 * @param projectId - The project UUID
 * @returns The active milestone data, or null if no milestones exist or all are complete
 */
export async function getActiveMilestone(projectId: string) {
  const supabase = await createClient();

  // Fetch all phases with milestone numbers, ordered by milestone_number
  const { data: phases, error } = await supabase
    .from('project_phases')
    .select('id, name, status, milestone_number, sort_order')
    .eq('project_id', projectId)
    .not('milestone_number', 'is', null)
    .order('milestone_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getActiveMilestone] Error fetching phases:', error);
    return null;
  }

  if (!phases || phases.length === 0) {
    return null;
  }

  // Group phases by milestone_number
  const milestoneGroups: Record<number, typeof phases> = {};
  for (const phase of phases) {
    const mn = phase.milestone_number as number;
    if (!milestoneGroups[mn]) milestoneGroups[mn] = [];
    milestoneGroups[mn].push(phase);
  }

  // Find the lowest milestone_number where at least one phase is not completed
  const milestoneNumbers = Object.keys(milestoneGroups)
    .map(Number)
    .sort((a, b) => a - b);

  let activeMilestoneNumber: number | null = null;
  for (const mn of milestoneNumbers) {
    const groupPhases = milestoneGroups[mn];
    const allCompleted = groupPhases.every((p) => p.status === 'completed');
    if (!allCompleted) {
      activeMilestoneNumber = mn;
      break;
    }
  }

  if (activeMilestoneNumber === null) {
    return null;
  }

  const milestonePhases = milestoneGroups[activeMilestoneNumber];
  const phaseIds = milestonePhases.map((p) => p.id);

  // Fetch all phase_items for those phases
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
 *
 * Uses upsert with onConflict on source_phase_item_id for DB-level
 * idempotency -- duplicate items are silently skipped.
 *
 * @param projectId - The project UUID
 * @param milestoneNumber - Which milestone to generate tasks from
 * @param assigneeId - The user UUID to assign tasks to
 * @param trigger - What caused this generation ('assignment' or 'milestone_cascade')
 * @returns Counts of created, skipped, and total items
 */
export async function createTasksFromMilestone(
  projectId: string,
  milestoneNumber: number,
  assigneeId: string,
  trigger: 'assignment' | 'milestone_cascade'
): Promise<{ created: number; skipped: number; total: number }> {
  const supabase = await createClient();

  // 1. Fetch project to get workspace_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[createTasksFromMilestone] Project not found:', projectError);
    return { created: 0, skipped: 0, total: 0 };
  }

  // 2. Fetch all phases for this milestone_number
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id, name, sort_order')
    .eq('project_id', projectId)
    .eq('milestone_number', milestoneNumber)
    .order('sort_order', { ascending: true });

  if (phasesError || !phases || phases.length === 0) {
    console.error('[createTasksFromMilestone] No phases found:', phasesError);
    return { created: 0, skipped: 0, total: 0 };
  }

  const phaseIds = phases.map((p) => p.id);

  // 3. Fetch all phase_items for those phases
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

  // 4. Check which items already have tasks (to count skipped)
  const itemIds = phaseItems.map((item) => item.id);
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('source_phase_item_id')
    .in('source_phase_item_id', itemIds);

  const existingItemIds = new Set((existingTasks || []).map((t) => t.source_phase_item_id));

  // 5. Build task objects only for items that don't already have tasks
  // Build a phase lookup for name and sort_order
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

  // 6. Upsert with DB-level idempotency
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

/**
 * Handle reassignment of auto-created tasks when a project member changes.
 *
 * If the old user has undone auto-created tasks, transfers them to the new user.
 * If none exist (e.g., first assignment), creates fresh tasks from the active milestone.
 *
 * @param projectId - The project UUID
 * @param fromUserId - The user being removed/replaced
 * @param toUserId - The user being assigned
 * @returns Counts of transferred and/or created tasks
 */
export async function handleReassignment(
  projectId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ transferred: number; created: number }> {
  const supabase = await createClient();

  // 1. Find undone auto-created tasks assigned to the old user
  const { data: existingTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assignee_id', fromUserId)
    .neq('status', 'Done')
    .not('source_phase_item_id', 'is', null);

  if (fetchError) {
    console.error('[handleReassignment] Error fetching tasks:', fetchError);
    return { transferred: 0, created: 0 };
  }

  // 2. If tasks exist, transfer them
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

  // 3. No existing tasks -- create fresh from active milestone
  const activeMilestone = await getActiveMilestone(projectId);
  if (!activeMilestone) {
    return { transferred: 0, created: 0 };
  }

  const result = await createTasksFromMilestone(
    projectId,
    activeMilestone.milestoneNumber,
    toUserId,
    'assignment'
  );

  return { transferred: 0, created: result.created };
}

/**
 * Mark all auto-created tasks in a milestone as Done.
 *
 * Used when a milestone is completed to bulk-close its generated tasks.
 *
 * @param projectId - The project UUID
 * @param milestoneNumber - Which milestone to close out
 * @returns Count of tasks marked as done
 */
export async function markMilestoneTasksDone(
  projectId: string,
  milestoneNumber: number
): Promise<number> {
  const supabase = await createClient();

  // 1. Get all phase IDs for this milestone_number
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId)
    .eq('milestone_number', milestoneNumber);

  if (phasesError || !phases || phases.length === 0) {
    console.error('[markMilestoneTasksDone] No phases found:', phasesError);
    return 0;
  }

  const phaseIds = phases.map((p) => p.id);

  // 2. Update auto-created tasks that aren't already done
  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'Done' as const,
      completed_at: new Date().toISOString(),
    })
    .in('phase_id', phaseIds)
    .neq('status', 'Done')
    .not('source_phase_item_id', 'is', null)
    .select('id');

  if (updateError) {
    console.error('[markMilestoneTasksDone] Error updating tasks:', updateError);
    return 0;
  }

  return updated?.length ?? 0;
}
