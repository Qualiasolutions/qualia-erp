'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseFormData, createTaskSchema, updateTaskSchema } from '@/lib/validation';
import { getCurrentWorkspaceId } from '@/app/actions';
import { notifyTaskCreated } from '@/lib/email';
import { canModifyTask, isUserAdmin } from './shared';

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
  project_id: string | null;
  title: string;
  description: string | null;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  item_type: 'task' | 'issue' | 'note' | 'resource';
  phase_name: string | null;
  sort_order: number;
  due_date: string | null;
  completed_at: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  show_in_inbox: boolean;
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
    isLead?: boolean;
  } | null;
  project?: {
    id: string;
    name: string;
    project_type: string | null;
    lead?: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
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
    inboxOnly?: boolean;
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
      project_id,
      title,
      description,
      status,
      priority,
      item_type,
      phase_name,
      sort_order,
      due_date,
      completed_at,
      scheduled_start_time,
      scheduled_end_time,
      show_in_inbox,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type, lead:profiles!projects_lead_id_fkey (id, full_name, avatar_url))
    `
    )
    .eq('workspace_id', wsId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  // Filter for inbox-only tasks
  if (options.inboxOnly) {
    query = query.eq('show_in_inbox', true);
  }

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
      project: Task['project'] | Task['project'][];
    };
    return {
      ...task,
      creator: Array.isArray(t.creator) ? t.creator[0] || null : t.creator,
      assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
      project: Array.isArray(t.project) ? t.project[0] : t.project,
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

  const {
    title,
    description,
    status,
    workspace_id,
    due_date,
    assignee_id,
    project_id,
    custom_project_name,
    show_in_inbox,
    item_type,
    phase_name,
    phase_id,
    scheduled_start_time,
    scheduled_end_time,
  } = validation.data;

  // Get workspace ID from form or from user's default
  let wsId: string | null | undefined = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace ID is required' };
  }

  // Handle custom project name - create new project if provided
  let finalProjectId = project_id;
  if (!project_id && custom_project_name) {
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: custom_project_name.trim(),
        workspace_id: wsId,
        lead_id: user.id,
        status: 'Active',
        project_group: 'active',
        project_type: 'web_design', // Default type
        deployment_platform: 'vercel', // Default platform
      })
      .select('id')
      .single();

    if (projectError) {
      console.error('[createTask] Error creating project:', projectError);
      return { success: false, error: 'Failed to create project' };
    }
    finalProjectId = newProject.id;
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
      priority: 'No Priority',
      item_type: item_type || 'task',
      phase_name: phase_name || null,
      phase_id: phase_id || null,
      workspace_id: wsId,
      creator_id: user.id,
      assignee_id: assignee_id || null,
      project_id: finalProjectId || null,
      due_date: due_date || null,
      sort_order: nextSortOrder,
      show_in_inbox: show_in_inbox ?? true, // Default to true when no project
      scheduled_start_time: scheduled_start_time || null,
      scheduled_end_time: scheduled_end_time || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTask] Error creating task:', error);
    return { success: false, error: error.message };
  }

  // Send email notification to other admins (async, don't block response)
  // Get project name for the email
  let projectName: string | undefined = custom_project_name?.trim();
  if (!projectName && finalProjectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', finalProjectId)
      .single();
    projectName = project?.name;
  }

  // Send notification (fire and forget - don't wait for it)
  notifyTaskCreated(user.id, title.trim(), data.id, projectName, due_date || undefined).catch(
    (err) => console.error('[createTask] Failed to send email notification:', err)
  );

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

  const {
    id,
    title,
    description,
    status,
    due_date,
    sort_order,
    assignee_id,
    project_id,
    show_in_inbox,
    scheduled_start_time,
    scheduled_end_time,
  } = validation.data;

  if (!id) {
    return { success: false, error: 'Task ID is required' };
  }

  // Authorization: Only task creator, assignee, project lead, or admin can update
  const canModify = await canModifyTask(user.id, id);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to update this task' };
  }

  // Build update object (only include fields that are provided)
  const updateData: Record<string, unknown> = {};

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (status !== undefined) updateData.status = status;
  if (due_date !== undefined) updateData.due_date = due_date || null;
  if (sort_order !== undefined) updateData.sort_order = sort_order;
  if (assignee_id !== undefined) updateData.assignee_id = assignee_id || null;
  if (project_id !== undefined) updateData.project_id = project_id || null;
  if (show_in_inbox !== undefined) updateData.show_in_inbox = show_in_inbox;
  if (scheduled_start_time !== undefined)
    updateData.scheduled_start_time = scheduled_start_time || null;
  if (scheduled_end_time !== undefined) updateData.scheduled_end_time = scheduled_end_time || null;

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

  // Authorization: Only task creator, assignee, project lead, or admin can delete
  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to delete this task' };
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

  // Authorization: Verify user can modify all tasks in the batch
  // For efficiency, only admins can batch reorder multiple tasks
  // Non-admins can only reorder if they can modify all tasks
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    // Check each task - if any fails, reject the whole batch
    for (const { id } of taskUpdates) {
      const canModify = await canModifyTask(user.id, id);
      if (!canModify) {
        return { success: false, error: 'You do not have permission to reorder one or more tasks' };
      }
    }
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

/**
 * Get tasks linked to a specific project
 */
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getProjectTasks] No authenticated user');
    return [];
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      workspace_id,
      creator_id,
      assignee_id,
      project_id,
      title,
      description,
      status,
      priority,
      item_type,
      phase_name,
      sort_order,
      due_date,
      completed_at,
      scheduled_start_time,
      scheduled_end_time,
      show_in_inbox,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type, lead:profiles!projects_lead_id_fkey (id, full_name, avatar_url))
    `
    )
    .eq('project_id', projectId)
    .order('item_type', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getProjectTasks] Error fetching project tasks:', error);
    return [];
  }

  return (tasks || []).map((task) => {
    const t = task as unknown as {
      creator: Task['creator'] | Task['creator'][] | null;
      assignee: Task['assignee'] | Task['assignee'][] | null;
      project: Task['project'] | Task['project'][];
    };
    return {
      ...task,
      creator: Array.isArray(t.creator) ? t.creator[0] || null : t.creator,
      assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
      project: Array.isArray(t.project) ? t.project[0] : t.project,
    } as Task;
  });
}

/**
 * Toggle the show_in_inbox flag for a task
 */
export async function toggleTaskInbox(taskId: string, showInInbox: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: Only task creator, assignee, project lead, or admin can toggle inbox
  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to modify this task' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({ show_in_inbox: showInInbox })
    .eq('id', taskId);

  if (error) {
    console.error('[toggleTaskInbox] Error toggling task inbox:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Quick update task fields - simplified for inline editing
 * Accepts a partial object instead of FormData
 */
export async function quickUpdateTask(
  taskId: string,
  updates: {
    title?: string;
    status?: 'Todo' | 'In Progress' | 'Done';
    due_date?: string | null;
    priority?: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
    description?: string | null;
    assignee_id?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization: Only task creator, assignee, project lead, or admin can update
  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to update this task' };
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) {
      return { success: false, error: 'Title cannot be empty' };
    }
    updateData.title = trimmed;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
    // Update completed_at when status changes
    if (updates.status === 'Done') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }
  }
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.description !== undefined)
    updateData.description = updates.description?.trim() || null;
  if (updates.assignee_id !== undefined) updateData.assignee_id = updates.assignee_id;

  const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

  if (error) {
    console.error('[quickUpdateTask] Error updating task:', error);
    return { success: false, error: error.message };
  }

  // Trigger skill learning when task is completed
  if (updates.status === 'Done') {
    try {
      // Get task to find project type
      const { data: task } = await supabase
        .from('tasks')
        .select('project:projects(project_type), assignee_id')
        .eq('id', taskId)
        .single();

      // Handle Supabase FK array response
      const projectRaw = task?.project;
      const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
      const projectType = (project as { project_type: string } | null)?.project_type;
      const assigneeId = task?.assignee_id || user.id;

      // Call the skill learning function
      const { data: learningResult } = await supabase.rpc('on_task_completed', {
        p_task_id: taskId,
        p_user_id: assigneeId,
        p_project_type: projectType,
      });

      // Log any new achievements
      if (learningResult?.[0]?.new_achievements?.length > 0) {
        console.log('[quickUpdateTask] New achievements:', learningResult[0].new_achievements);
      }
    } catch (err) {
      // Don't fail the task update if skill learning fails
      console.error('[quickUpdateTask] Skill learning error:', err);
    }
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Get tasks that have been scheduled (have start/end times)
 */
export async function getScheduledTasks(workspaceId?: string | null): Promise<Task[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getScheduledTasks] No authenticated user');
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
      project_id,
      title,
      description,
      status,
      priority,
      item_type,
      phase_name,
      sort_order,
      due_date,
      completed_at,
      scheduled_start_time,
      scheduled_end_time,
      show_in_inbox,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type, lead:profiles!projects_lead_id_fkey (id, full_name, avatar_url))
    `
    )
    .not('scheduled_start_time', 'is', null)
    .not('scheduled_end_time', 'is', null)
    .order('scheduled_start_time', { ascending: true });

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('[getScheduledTasks] Error fetching scheduled tasks:', error);
    return [];
  }

  return (tasks || []).map((task) => {
    const t = task as unknown as {
      creator: Task['creator'] | Task['creator'][] | null;
      assignee: Task['assignee'] | Task['assignee'][] | null;
      project: Task['project'] | Task['project'][];
    };
    return {
      ...task,
      creator: Array.isArray(t.creator) ? t.creator[0] || null : t.creator,
      assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
      project: Array.isArray(t.project) ? t.project[0] : t.project,
    } as Task;
  });
}

/**
 * Schedule a task to a specific time slot
 */
export async function scheduleTask(
  taskId: string,
  startTime: string,
  endTime: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to schedule this task' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
    })
    .eq('id', taskId);

  if (error) {
    console.error('[scheduleTask] Error scheduling task:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true };
}

/**
 * Remove scheduling from a task
 */
export async function unscheduleTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to unschedule this task' };
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      scheduled_start_time: null,
      scheduled_end_time: null,
    })
    .eq('id', taskId);

  if (error) {
    console.error('[unscheduleTask] Error unscheduling task:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/inbox');
  return { success: true };
}
