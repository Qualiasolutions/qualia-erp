'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProjectPhases(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getProjectPhases] Error:', error);
    return [];
  }
  return data;
}

export async function createProjectPhase(projectId: string, name: string) {
  const supabase = await createClient();

  // Get current max sort_order
  const { data: existingPhases } = await supabase
    .from('project_phases')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder =
    existingPhases && existingPhases.length > 0 ? (existingPhases[0].sort_order || 0) + 1 : 0;

  const { data, error } = await supabase
    .from('project_phases')
    .insert({
      project_id: projectId,
      name,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('[createProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data };
}

export async function deleteProjectPhase(phaseId: string, projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

  if (error) {
    console.error('[deleteProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateProjectPhase(phaseId: string, name: string, projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('project_phases').update({ name }).eq('id', phaseId);

  if (error) {
    console.error('[updateProjectPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * Mark a phase as complete and auto-unlock the next phase
 */
export async function completePhase(phaseId: string) {
  const supabase = await createClient();

  // Get the phase and its project
  const { data: phase, error: fetchError } = await supabase
    .from('project_phases')
    .select('id, project_id, sort_order')
    .eq('id', phaseId)
    .single();

  if (fetchError || !phase) {
    console.error('[completePhase] Error fetching phase:', fetchError);
    return { success: false, error: 'Phase not found' };
  }

  // Get phase name for notification
  const { data: phaseDetail } = await supabase
    .from('project_phases')
    .select('name')
    .eq('id', phaseId)
    .single();

  // Mark the phase as complete
  const { error: updateError } = await supabase
    .from('project_phases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', phaseId);

  if (updateError) {
    console.error('[completePhase] Error updating phase:', updateError);
    return { success: false, error: updateError.message };
  }

  // Notify clients of phase completion (fire-and-forget)
  if (phaseDetail?.name) {
    import('@/lib/email').then(({ notifyClientsOfPhaseChange }) => {
      notifyClientsOfPhaseChange(phase.project_id, phaseDetail.name, 'completed').catch((err) =>
        console.error('[completePhase] Notification error:', err)
      );
    });
  }

  // Find and unlock the next phase (by sort_order)
  const { data: nextPhase } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', phase.project_id)
    .eq('is_locked', true)
    .gt('sort_order', phase.sort_order)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();

  if (nextPhase) {
    await supabase.from('project_phases').update({ is_locked: false }).eq('id', nextPhase.id);
  }

  revalidatePath(`/projects/${phase.project_id}`);
  revalidatePath(`/projects/${phase.project_id}/roadmap`);
  return { success: true };
}

/**
 * Check if all tasks in a phase are complete and auto-progress if enabled
 */
export async function checkPhaseProgress(phaseId: string) {
  const supabase = await createClient();

  // Get the phase with its auto_progress setting
  const { data: phase, error: fetchError } = await supabase
    .from('project_phases')
    .select('id, project_id, auto_progress, status')
    .eq('id', phaseId)
    .single();

  if (fetchError || !phase) {
    return { success: false, error: 'Phase not found' };
  }

  // If already completed or auto-progress disabled, skip
  if (phase.status === 'completed' || !phase.auto_progress) {
    return { success: true, autoCompleted: false };
  }

  // Count total and completed tasks in this phase
  const { data: taskCounts, error: countError } = await supabase
    .from('phase_items')
    .select('id, status')
    .eq('phase_id', phaseId);

  if (countError) {
    console.error('[checkPhaseProgress] Error counting tasks:', countError);
    return { success: false, error: countError.message };
  }

  const totalTasks = taskCounts?.length || 0;
  const completedTasks = taskCounts?.filter((t) => t.status === 'Done').length || 0;

  // If all tasks are complete, auto-complete the phase
  if (totalTasks > 0 && completedTasks === totalTasks) {
    const result = await completePhase(phaseId);
    return { ...result, autoCompleted: true };
  }

  return {
    success: true,
    autoCompleted: false,
    progress: { total: totalTasks, completed: completedTasks },
  };
}

/**
 * Unlock a phase manually (admin override)
 */
export async function unlockPhase(phaseId: string) {
  const supabase = await createClient();

  const { data: phase, error: fetchError } = await supabase
    .from('project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .single();

  if (fetchError || !phase) {
    return { success: false, error: 'Phase not found' };
  }

  const { error } = await supabase
    .from('project_phases')
    .update({ is_locked: false })
    .eq('id', phaseId);

  if (error) {
    console.error('[unlockPhase] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${phase.project_id}`);
  revalidatePath(`/projects/${phase.project_id}/roadmap`);
  return { success: true };
}

/**
 * Get phase progress stats for a project
 */
export async function getPhaseProgressStats(projectId: string) {
  const supabase = await createClient();

  const { data: phases, error } = await supabase
    .from('project_phases')
    .select(
      `
      id,
      name,
      status,
      is_locked,
      completed_at,
      sort_order,
      phase_items (id, status)
    `
    )
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getPhaseProgressStats] Error:', error);
    return [];
  }

  return phases.map((phase) => {
    const items = phase.phase_items || [];
    const total = items.length;
    const completed = items.filter((item: { status: string }) => item.status === 'Done').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id: phase.id,
      name: phase.name,
      status: phase.status,
      isLocked: phase.is_locked,
      completedAt: phase.completed_at,
      sortOrder: phase.sort_order,
      progress: {
        total,
        completed,
        percentage,
      },
    };
  });
}

/**
 * Calculate project progress from phase completion.
 * Returns a percentage (0-100) based on completed phases / total phases.
 */
export async function calculateProjectProgress(projectId: string): Promise<number> {
  const supabase = await createClient();

  const { data: phases, error } = await supabase
    .from('project_phases')
    .select('status')
    .eq('project_id', projectId);

  if (error || !phases || phases.length === 0) {
    return 0;
  }

  const completed = phases.filter((p) => p.status === 'completed' || p.status === 'done').length;

  return Math.round((completed / phases.length) * 100);
}

/**
 * Calculate progress for multiple projects at once.
 * Returns a map of projectId -> progress percentage.
 */
export async function calculateProjectsProgress(
  projectIds: string[]
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};

  const supabase = await createClient();

  const { data: phases, error } = await supabase
    .from('project_phases')
    .select('project_id, status')
    .in('project_id', projectIds);

  if (error || !phases) return {};

  const progressMap: Record<string, number> = {};

  // Group phases by project
  const grouped: Record<string, string[]> = {};
  for (const phase of phases) {
    if (!grouped[phase.project_id]) grouped[phase.project_id] = [];
    grouped[phase.project_id].push(phase.status);
  }

  for (const [projectId, statuses] of Object.entries(grouped)) {
    const completed = statuses.filter((s) => s === 'completed' || s === 'done').length;
    progressMap[projectId] = Math.round((completed / statuses.length) * 100);
  }

  return progressMap;
}
