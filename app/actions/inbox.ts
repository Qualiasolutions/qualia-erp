'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseFormData, createTaskSchema, updateTaskSchema } from '@/lib/validation';
import { getCurrentWorkspaceId } from '@/app/actions';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Task type for responses
export type Task = {
  id: string;
  workspace_id: string;
  creator_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  sort_order: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * Get tasks for a workspace
 */
export async function getTasks(
  workspaceId?: string | null,
  options: {
    status?: string[];
    limit?: number;
  } = {}
): Promise<Task[]> {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId: string | null | undefined = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    console.error('[getTasks] No workspace ID available');
    return [];
  }

  // First check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getTasks] No authenticated user');
    return [];
  }

  let query = supabase
    .from('tasks')
    .select(
      `
      id,
      workspace_id,
      creator_id,
      assignee_id,
      title,
      description,
      status,
      priority,
      sort_order,
      due_date,
      completed_at,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url)
    `
    )
    .eq('workspace_id', wsId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('[getTasks] Error fetching tasks:', error);
    return [];
  }

  return (tasks || []).map((task) => {
    const t = task as unknown as {
      creator: Task['creator'] | Task['creator'][] | null;
      assignee: Task['assignee'] | Task['assignee'][] | null;
    };
    return {
      ...task,
      creator: Array.isArray(t.creator) ? t.creator[0] || null : t.creator,
      assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
    } as Task;
  });
}

/**
 * Create a new task
 */
export async function createTask(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createTaskSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { title, description, status, priority, workspace_id, due_date, assignee_id } =
    validation.data;

  // Get workspace ID from form or from user's default
  let wsId: string | null | undefined = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace ID is required' };
  }

  // Get the highest sort_order for this status in the workspace
  const { data: lastTask } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('workspace_id', wsId)
    .eq('status', status)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = lastTask ? lastTask.sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      workspace_id: wsId,
      creator_id: user.id,
      assignee_id: assignee_id || null,
      due_date: due_date || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTask] Error creating task:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true, data };
}

/**
 * Update an existing task
 */
export async function updateTask(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateTaskSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, title, description, status, priority, due_date, sort_order, assignee_id } =
    validation.data;

  if (!id) {
    return { success: false, error: 'Task ID is required' };
  }

  // Build update object (only include fields that are provided)
  const updateData: Record<string, unknown> = {};

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (due_date !== undefined) updateData.due_date = due_date || null;
  if (sort_order !== undefined) updateData.sort_order = sort_order;
  if (assignee_id !== undefined) updateData.assignee_id = assignee_id || null;

  // Set completed_at when status changes to Done
  if (status !== undefined) {
    if (status === 'Done') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
  }

  const { error } = await supabase.from('tasks').update(updateData).eq('id', id);

  if (error) {
    console.error('[updateTask] Error updating task:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if task exists and user can delete it (creator or admin via RLS)
  const { data: task } = await supabase
    .from('tasks')
    .select('id, creator_id')
    .eq('id', taskId)
    .single();

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    console.error('[deleteTask] Error deleting task:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Reorder tasks (batch update sort_order)
 * Used for drag-and-drop reordering
 */
export async function reorderTasks(
  taskUpdates: Array<{ id: string; sort_order: number; status?: string }>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Batch update tasks
  const updates = taskUpdates.map(({ id, sort_order, status }) => {
    const updateData: { sort_order: number; status?: string; completed_at?: string | null } = {
      sort_order,
    };

    if (status !== undefined) {
      updateData.status = status;
      // Update completed_at when status changes
      if (status === 'Done') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    return supabase.from('tasks').update(updateData).eq('id', id);
  });

  const results = await Promise.all(updates);

  // Check for errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error('[reorderTasks] Error reordering tasks:', errors);
    return { success: false, error: 'Failed to reorder some tasks' };
  }

  revalidatePath('/inbox');
  return { success: true };
}
