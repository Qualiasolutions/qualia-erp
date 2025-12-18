'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Get phases for a project with tasks
export async function getProjectPhases(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_phases')
    .select(
      `
            *,
            items:phase_items(
                *,
                completed_by_profile:profiles!phase_items_completed_by_fkey(id, full_name, avatar_url)
            )
        `
    )
    .eq('project_id', projectId)
    .order('display_order')
    .order('display_order', { referencedTable: 'phase_items' });

  if (error) {
    console.error('Error fetching phases:', error);
    return [];
  }

  // Calculate progress for each phase and normalize FK responses
  return (data || []).map((phase) => {
    const items = phase.items || [];
    const completed = items.filter((i: { is_completed: boolean }) => i.is_completed).length;
    const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

    return {
      ...phase,
      progress,
      tasks: items.map((item: { completed_by_profile?: unknown; [key: string]: unknown }) => ({
        ...item,
        completed_by_profile: Array.isArray(item.completed_by_profile)
          ? item.completed_by_profile[0] || null
          : item.completed_by_profile,
      })),
    };
  });
}

// Create a phase
export async function createPhase(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const project_id = formData.get('project_id') as string;
  const workspace_id = formData.get('workspace_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const display_order = parseInt(formData.get('display_order') as string) || 0;
  const status = (formData.get('status') as string) || 'not_started';

  if (!project_id || !workspace_id || !name?.trim()) {
    return { success: false, error: 'Missing required fields' };
  }

  const { data, error } = await supabase
    .from('project_phases')
    .insert({
      project_id,
      workspace_id,
      name: name.trim(),
      description: description?.trim() || null,
      display_order,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating phase:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${project_id}`);
  return { success: true, data };
}

// Delete a phase
export async function deletePhase(phaseId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get project_id before deleting
  const { data: phase } = await supabase
    .from('project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .single();

  const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

  if (error) {
    console.error('Error deleting phase:', error);
    return { success: false, error: error.message };
  }

  if (phase) {
    revalidatePath(`/projects/${phase.project_id}`);
  }
  return { success: true };
}

// Create a phase item (task)
export async function createPhaseItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const phase_id = formData.get('phase_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const display_order = parseInt(formData.get('display_order') as string) || 0;

  if (!phase_id || !title?.trim()) {
    return { success: false, error: 'Missing required fields' };
  }

  const { data, error } = await supabase
    .from('phase_items')
    .insert({
      phase_id,
      title: title.trim(),
      description: description?.trim() || null,
      display_order,
    })
    .select('*, phase:project_phases(project_id)')
    .single();

  if (error) {
    console.error('Error creating phase item:', error);
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(data.phase) ? data.phase[0] : data.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  return { success: true, data };
}

// Update a phase item (task)
export async function updatePhaseItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const id = formData.get('id') as string;
  const is_completed = formData.get('is_completed');
  const phase_id = formData.get('phase_id') as string;
  const display_order = formData.get('display_order');

  if (!id) {
    return { success: false, error: 'Missing task ID' };
  }

  const updateData: Record<string, unknown> = {};

  // Handle completion status
  if (is_completed !== null) {
    const completed = is_completed === 'true';
    updateData.is_completed = completed;
    updateData.completed_at = completed ? new Date().toISOString() : null;
    updateData.completed_by = completed ? user.id : null;
  }

  // Allow updating phase_id (moving between phases)
  if (phase_id) {
    updateData.phase_id = phase_id;
  }

  // Allow updating display_order (reordering)
  if (display_order !== null) {
    updateData.display_order = parseInt(display_order as string);
  }

  // Allow updating title and description if provided
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  if (title) updateData.title = title.trim();
  if (description !== null) updateData.description = description?.trim() || null;

  const { data, error } = await supabase
    .from('phase_items')
    .update(updateData)
    .eq('id', id)
    .select('phase:project_phases(project_id)')
    .single();

  if (error) {
    console.error('Error updating phase item:', error);
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(data.phase) ? data.phase[0] : data.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  return { success: true };
}

// Reorder phase items (batch update for drag and drop)
export async function reorderPhaseItems(
  taskOrders: Array<{ id: string; phase_id: string; display_order: number }>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!taskOrders || taskOrders.length === 0) {
    return { success: false, error: 'No tasks to reorder' };
  }

  // Get project_id from first task to revalidate path
  const { data: firstTask } = await supabase
    .from('phase_items')
    .select('phase:project_phases(project_id)')
    .eq('id', taskOrders[0].id)
    .single();

  // Update all tasks in a transaction-like manner
  const updates = taskOrders.map((task) =>
    supabase
      .from('phase_items')
      .update({
        phase_id: task.phase_id,
        display_order: task.display_order,
      })
      .eq('id', task.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error('Error reordering phase items:', errors);
    return { success: false, error: errors[0].error?.message || 'Failed to reorder tasks' };
  }

  const phaseData = Array.isArray(firstTask?.phase) ? firstTask.phase[0] : firstTask?.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  return { success: true };
}

// Delete a phase item (task)
export async function deletePhaseItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get project_id before deleting
  const { data: item } = await supabase
    .from('phase_items')
    .select('phase:project_phases(project_id)')
    .eq('id', itemId)
    .single();

  const { error } = await supabase.from('phase_items').delete().eq('id', itemId);

  if (error) {
    console.error('Error deleting phase item:', error);
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(item?.phase) ? item.phase[0] : item?.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
  return { success: true };
}

// Set project progress by updating phase items completion status
export async function setProjectProgress(
  projectId: string,
  targetProgress: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get all phases for this project
  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId);

  if (phasesError || !phases || phases.length === 0) {
    return { success: false, error: 'No phases found for this project' };
  }

  const phaseIds = phases.map((p) => p.id);

  // Get all phase items for this project
  const { data: items, error: itemsError } = await supabase
    .from('phase_items')
    .select('id, is_completed')
    .in('phase_id', phaseIds)
    .order('created_at', { ascending: true });

  if (itemsError || !items || items.length === 0) {
    return { success: false, error: 'No phase items found for this project' };
  }

  const totalItems = items.length;
  const targetCompleted = Math.round((targetProgress / 100) * totalItems);

  // Mark the first N items as completed, rest as not completed
  const itemsToComplete = items.slice(0, targetCompleted).map((i) => i.id);
  const itemsToIncomplete = items.slice(targetCompleted).map((i) => i.id);

  if (itemsToComplete.length > 0) {
    const { error: completeError } = await supabase
      .from('phase_items')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .in('id', itemsToComplete);

    if (completeError) {
      return { success: false, error: completeError.message };
    }
  }

  if (itemsToIncomplete.length > 0) {
    const { error: incompleteError } = await supabase
      .from('phase_items')
      .update({
        is_completed: false,
        completed_at: null,
        completed_by: null,
      })
      .in('id', itemsToIncomplete);

    if (incompleteError) {
      return { success: false, error: incompleteError.message };
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  return {
    success: true,
    data: {
      totalItems,
      completedItems: targetCompleted,
      actualProgress: Math.round((targetCompleted / totalItems) * 100),
    },
  };
}
