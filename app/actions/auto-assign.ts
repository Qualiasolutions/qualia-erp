'use server';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUserManagerOrAbove } from './shared';

// ============ AUTO-ASSIGNMENT ENGINE ============
// Creates milestone-level inbox tasks when employees are assigned to projects.
// Each milestone (grouped by milestone_number) becomes one task: "Milestone N: {name}".
// The description lists every phase inside that milestone. Idempotent via
// source_milestone_key (format: "{projectId}:M{number}") paired with assignee_id.
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
 * Create one inbox task per milestone in the project (not one per phase).
 *
 * Phases are grouped by `milestone_number`. For each milestone that has at least
 * one non-completed phase, a single task is created for the assignee with the
 * phases inside that milestone enumerated in the description. Idempotent via
 * the `source_milestone_key` + `assignee_id` unique index — repeat calls are
 * no-ops. Milestones where every phase is already completed are skipped.
 *
 * @param projectId - The project UUID
 * @param assigneeId - The user UUID to assign tasks to
 * @param trigger - What caused this generation ('assignment' or 'milestone_cascade')
 * @returns Counts of created, skipped, and total milestones processed
 */
export async function createTasksFromMilestones(
  projectId: string,
  assigneeId: string,
  trigger: 'assignment' | 'milestone_cascade',
  supabaseClient?: AnySupabaseClient
): Promise<{ created: number; skipped: number; total: number }> {
  if (!(await requireAuthIfServerAction(supabaseClient)))
    return { created: 0, skipped: 0, total: 0 };
  const supabase = await getClient(supabaseClient);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('workspace_id, name')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[createTasksFromMilestones] Project not found:', projectError);
    return { created: 0, skipped: 0, total: 0 };
  }

  // Fetch all rows (phases + milestone rollups) so we can use rollup names when present.
  const { data: allRows, error: rowsError } = await supabase
    .from('project_phases')
    .select('id, name, description, sort_order, milestone_number, status, phase_type')
    .eq('project_id', projectId)
    .not('milestone_number', 'is', null)
    .order('sort_order', { ascending: true });

  if (rowsError) {
    console.error('[createTasksFromMilestones] Error fetching phases:', rowsError);
    return { created: 0, skipped: 0, total: 0 };
  }

  if (!allRows || allRows.length === 0) {
    return { created: 0, skipped: 0, total: 0 };
  }

  // Group phases by milestone_number; capture the rollup row (if any) for naming.
  const groups = new Map<
    number,
    {
      rollup: (typeof allRows)[number] | null;
      phases: typeof allRows;
    }
  >();

  for (const row of allRows) {
    const mn = row.milestone_number;
    if (mn == null) continue;
    let group = groups.get(mn);
    if (!group) {
      group = { rollup: null, phases: [] };
      groups.set(mn, group);
    }
    if (row.phase_type === 'milestone') {
      group.rollup = row;
    } else {
      group.phases.push(row);
    }
  }

  const milestoneEntries = Array.from(groups.entries())
    .filter(([, g]) => g.phases.some((p) => p.status !== 'completed'))
    .sort(([a], [b]) => a - b);

  const total = milestoneEntries.length;
  if (total === 0) return { created: 0, skipped: 0, total: 0 };

  // Skip milestones that already have a task for this assignee.
  const milestoneKeys = milestoneEntries.map(([mn]) => `${projectId}:M${mn}`);
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('source_milestone_key')
    .in('source_milestone_key', milestoneKeys)
    .eq('assignee_id', assigneeId);

  const existingKeys = new Set((existingTasks || []).map((t) => t.source_milestone_key));

  const taskObjects = milestoneEntries
    .filter(([mn]) => !existingKeys.has(`${projectId}:M${mn}`))
    .map(([mn, group]) => {
      const rollupName = group.rollup?.name?.trim();
      const milestoneLabel = `Milestone ${mn}`;
      const title = rollupName ? `${milestoneLabel}: ${rollupName}` : milestoneLabel;

      const phaseLines = group.phases.map((p) => {
        const marker = p.status === 'completed' ? 'x' : ' ';
        return `- [${marker}] ${p.name}`;
      });
      const description = [
        group.rollup?.description?.trim(),
        phaseLines.length ? `Phases:\n${phaseLines.join('\n')}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      const anyInProgress = group.phases.some((p) => p.status === 'in_progress');
      const status = anyInProgress ? ('In Progress' as const) : ('Todo' as const);

      return {
        title,
        description: description || null,
        project_id: projectId,
        assignee_id: assigneeId,
        // Keep phase_id null — the task spans multiple phases now.
        phase_id: null,
        phase_name: null,
        milestone: milestoneLabel,
        source_milestone_key: `${projectId}:M${mn}`,
        auto_assign_trigger: trigger,
        show_in_inbox: true,
        status,
        item_type: 'task' as const,
        priority: 'Medium' as const,
        workspace_id: project.workspace_id,
        sort_order: mn * 1000,
      };
    });

  const skipped = total - taskObjects.length;
  if (taskObjects.length === 0) return { created: 0, skipped, total };

  const { data: inserted, error: insertError } = await supabase
    .from('tasks')
    .insert(taskObjects)
    .select('id');

  if (insertError) {
    console.error('[createTasksFromMilestones] Insert error:', insertError);
    return { created: 0, skipped: total, total };
  }

  return { created: inserted?.length ?? 0, skipped, total };
}

/**
 * Backwards-compatible alias. Old call sites still use this name; it now
 * delegates to the milestone-based engine.
 */
export const createTasksFromPhases = createTasksFromMilestones;

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

  // Find undone auto-assigned milestone tasks owned by the old user
  const { data: existingTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assignee_id', fromUserId)
    .neq('status', 'Done')
    .not('source_milestone_key', 'is', null);

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

  // No existing tasks — create fresh milestone-level tasks
  const result = await createTasksFromMilestones(projectId, toUserId, 'assignment');
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
 * Mark the milestone-level auto-assigned task for a given milestone as Done.
 * Matches by source_milestone_key — updates every assignee's copy.
 */
export async function markMilestoneTasksDone(
  projectId: string,
  milestoneNumber: number,
  supabaseClient?: AnySupabaseClient
): Promise<number> {
  if (!(await requireAuthIfServerAction(supabaseClient))) return 0;
  const supabase = await getClient(supabaseClient);

  const milestoneKey = `${projectId}:M${milestoneNumber}`;

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'Done' as const,
      completed_at: new Date().toISOString(),
    })
    .eq('source_milestone_key', milestoneKey)
    .neq('status', 'Done')
    .select('id');

  if (updateError) {
    console.error('[markMilestoneTasksDone] Error updating tasks:', updateError);
    return 0;
  }

  return updated?.length ?? 0;
}
