'use server';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

import { parseFormData, createTaskSchema, updateTaskSchema } from '@/lib/validation';
import { getCurrentWorkspaceId } from '@/app/actions';
import { notifyTaskCreated } from '@/lib/email';
import { cookies } from 'next/headers';
import { canModifyTask, isUserAdmin, isUserManagerOrAbove, type ActionResult } from './shared';
import { canAccessProject } from '@/lib/portal-utils';

/**
/**
 * When an admin uses "View as", we scope task queries to the impersonated user.
 * Returns { effectiveUserId, shouldScope } — shouldScope is true when we must
 * filter tasks to that user's assignments (i.e. viewing-as a non-admin).
 */
async function getEffectiveUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  realUserId: string
): Promise<{ effectiveUserId: string; shouldScope: boolean }> {
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get('view-as-user-id')?.value;

  if (!viewAsUserId || viewAsUserId === realUserId) {
    // No impersonation — use real role check
    const elevated = await isUserManagerOrAbove(realUserId);
    return { effectiveUserId: realUserId, shouldScope: !elevated };
  }

  // Admin is impersonating — check the TARGET user's role
  const targetElevated = await isUserManagerOrAbove(viewAsUserId);
  return { effectiveUserId: viewAsUserId, shouldScope: !targetElevated };
}

/**
 * Get project IDs that are finished (Done, Archived, Canceled).
 * Tasks from these projects should be excluded from inbox views.
 * Uses React.cache() for per-request deduplication — multiple inbox
 * functions in the same request share the result without re-querying.
 * (Previously used a module-level `let` cache which is unreliable on
 * Vercel serverless where each invocation may get a fresh module scope.)
 */
// Takes zero arguments so React.cache() can dedupe within a request.
// Previous version took `supabase` as an argument, but `createClient()` returns
// a fresh instance per call — which meant the cache key differed every time
// and deduplication never fired. Creating the client inside keeps the memo key
// stable (the empty argument list).
const getFinishedProjectIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('id')
    .in('status', ['Done', 'Archived', 'Canceled']);
  return new Set((data || []).map((p) => p.id));
});

/**
 * Check if a task with requires_attachment can be marked as Done.
 * Returns null if OK, or error string if blocked.
 */
async function checkAttachmentRequirement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string
): Promise<string | null> {
  const { data: task } = await supabase
    .from('tasks')
    .select('requires_attachment, submission_text')
    .eq('id', taskId)
    .single();

  if (!task?.requires_attachment) return null;

  // A text submission also satisfies the requirement
  if (task.submission_text && task.submission_text.trim().length > 0) return null;

  const { count } = await supabase
    .from('task_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);

  if (!count || count === 0) {
    return `This task requires a file upload or work submission before completion: ${task.requires_attachment}`;
  }
  return null;
}

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
  requires_attachment: string | null;
  submission_text: string | null;
  submitted_at: string | null;
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

// H12 (OPTIMIZE.md): previously unlimited getTasks fetched every task in the
// workspace × 4 joined records (creator, assignee, project, nested project
// lead) on every poll. This cap is a safety net even when callers forget to
// pass `limit`. Inbox hot paths should pass an explicit `limit` (50 for the
// full inbox view). The nested `project.lead` join has been dropped from the
// default projection and is now fetched on-demand via getProjectTasks.
const DEFAULT_TASK_FETCH_LIMIT = 200;

/**
 * Get tasks for a workspace
 *
 * `scope`:
 *  - `'mine'` — force per-user scoping (assignee/creator/own projects) regardless
 *    of admin role. Used by the unified `/tasks` page default ("my tasks").
 *  - `'all'` — admin-only. Returns every task in the workspace. Returns [] for
 *    non-admins.
 *  - omitted — legacy behavior: admins see all, others see scoped.
 */
export async function getTasks(
  workspaceId?: string | null,
  options: {
    status?: string[];
    limit?: number;
    inboxOnly?: boolean;
    scope?: 'mine' | 'all';
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

  // Scope tasks: admins/managers see all, others see only their tasks.
  // When admin uses "View as", scope to the impersonated user's assignments.
  const base = await getEffectiveUser(supabase, user.id);
  const { effectiveUserId } = base;
  let { shouldScope } = base;

  // Explicit `scope` overrides default role-based behavior.
  if (options.scope === 'mine') {
    shouldScope = true;
  } else if (options.scope === 'all') {
    if (!(await isUserAdmin(user.id))) {
      // Non-admins cannot request the workspace-wide view.
      return [];
    }
    shouldScope = false;
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
      requires_attachment,
      submission_text,
      submitted_at,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type)
    `
    )
    .eq('workspace_id', wsId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  // Scope visibility: strictly the user's own assigned tasks.
  // Tasks they created for other people (delegations) belong to the assignee's
  // queue, not the creator's. Tasks on projects they're assigned to but given
  // to a teammate likewise belong to the teammate. Admins opt out via
  // shouldScope=false and see the whole workspace.
  if (shouldScope) {
    query = query.eq('assignee_id', effectiveUserId);
  }

  // Filter for inbox-only tasks
  if (options.inboxOnly) {
    query = query.eq('show_in_inbox', true);

    // Exclude tasks from finished projects (Done/Archived/Canceled)
    const finishedIds = await getFinishedProjectIds();
    if (finishedIds.size > 0) {
      // PostgREST .not().in() excludes these project_id values;
      // tasks with null project_id (personal tasks) are kept.
      query = query.not('project_id', 'in', `(${[...finishedIds].join(',')})`);
    }
  }

  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  query = query.limit(options.limit ?? DEFAULT_TASK_FETCH_LIMIT);

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

// ============================================================================
// H11 (OPTIMIZE.md): getInboxPreview — lean slice for dashboard InboxWidget
// ============================================================================

/**
 * Lean projection for the dashboard InboxWidget. Avoids all FK joins except a
 * minimal `project(id, name)` needed for the row's subtitle.
 */
export type InboxPreviewTask = {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  item_type: 'task' | 'issue' | 'note' | 'resource';
  due_date: string | null;
  project: { id: string; name: string } | null;
};

export type InboxPreviewResponse = {
  tasks: InboxPreviewTask[];
  overdueCount: number;
  totalOpen: number;
};

/**
 * H11 (OPTIMIZE.md): previously the dashboard InboxWidget called
 * `useInboxTasks()` which fetched the entire inbox (hundreds of rows × 4
 * joins) just to display the top 5. This action returns a small preview
 * slice plus two head-only count queries so the widget can still badge
 * totals and overdue numbers without hydrating the full set.
 *
 * Runs three queries in parallel:
 *   - preview: ~4× limit rows, tiny projection, sorted by due_date
 *   - totalOpen: COUNT head-only
 *   - overdueCount: COUNT head-only with due_date < today
 */
export async function getInboxPreview(limit = 5): Promise<InboxPreviewResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tasks: [], overdueCount: 0, totalOpen: 0 };
  }

  const wsId = await getCurrentWorkspaceId();
  if (!wsId) {
    return { tasks: [], overdueCount: 0, totalOpen: 0 };
  }

  // Fetch more than `limit` so the client-side priority reshuffle has
  // headroom — the widget sorts by overdue → priority → due_date which
  // we can't express cleanly in a single PostgREST .order() chain.
  const fetchLimit = Math.max(limit * 4, 20);

  // Use start-of-today as the overdue threshold to match the widget's
  // `isOverdue` semantics (past due_date but not today).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const openStatuses = ['Todo', 'In Progress'];

  // Scope visibility — respects "View as" impersonation. Personal preview =
  // only tasks assigned to the user; creator-of and project-member don't
  // bring in someone else's workload.
  const { effectiveUserId, shouldScope } = await getEffectiveUser(supabase, user.id);

  // Exclude tasks from finished projects
  const finishedIds = await getFinishedProjectIds();
  const finishedFilter = finishedIds.size > 0 ? `(${[...finishedIds].join(',')})` : null;

  // Build scoped queries — apply the .or() filter when non-elevated
  let previewQuery = supabase
    .from('tasks')
    .select('id, title, status, priority, item_type, due_date, project:projects(id, name)')
    .eq('workspace_id', wsId)
    .eq('show_in_inbox', true)
    .neq('item_type', 'note')
    .in('status', openStatuses);
  if (finishedFilter) previewQuery = previewQuery.not('project_id', 'in', finishedFilter);
  if (shouldScope) previewQuery = previewQuery.eq('assignee_id', effectiveUserId);
  previewQuery = previewQuery
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  let totalOpenQuery = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', wsId)
    .eq('show_in_inbox', true)
    .neq('item_type', 'note')
    .in('status', openStatuses);
  if (finishedFilter) totalOpenQuery = totalOpenQuery.not('project_id', 'in', finishedFilter);
  if (shouldScope) totalOpenQuery = totalOpenQuery.eq('assignee_id', effectiveUserId);

  let overdueQuery = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', wsId)
    .eq('show_in_inbox', true)
    .neq('item_type', 'note')
    .in('status', openStatuses)
    .lt('due_date', todayStartIso);
  if (finishedFilter) overdueQuery = overdueQuery.not('project_id', 'in', finishedFilter);
  if (shouldScope) overdueQuery = overdueQuery.eq('assignee_id', effectiveUserId);

  const [previewResult, totalOpenResult, overdueResult] = await Promise.all([
    previewQuery,
    totalOpenQuery,
    overdueQuery,
  ]);

  type RawPreviewRow = {
    id: string;
    title: string;
    status: InboxPreviewTask['status'];
    priority: InboxPreviewTask['priority'];
    item_type: InboxPreviewTask['item_type'];
    due_date: string | null;
    project: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const rawTasks = (previewResult.data || []) as unknown as RawPreviewRow[];
  const tasks: InboxPreviewTask[] = rawTasks.map((t) => {
    const project = Array.isArray(t.project) ? t.project[0] || null : t.project || null;
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      item_type: t.item_type,
      due_date: t.due_date,
      project: project ? { id: project.id, name: project.name } : null,
    };
  });

  return {
    tasks,
    overdueCount: overdueResult.count || 0,
    totalOpen: totalOpenResult.count || 0,
  };
}

/**
 * Get today's tasks for the team schedule.
 * Server-side equivalent of getTasks + filterTodaysTasks:
 *   - All In Progress tasks assigned to the user
 *   - Todo tasks with due_date <= today assigned to the user
 * Avoids fetching ALL active tasks and filtering client-side.
 */
export async function getTodaysTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];

  // Scope visibility — respects "View as" impersonation
  const { effectiveUserId, shouldScope } = await getEffectiveUser(supabase, user.id);

  // Two parallel queries:
  // 1. All In Progress tasks (regardless of due_date)
  // 2. Todo tasks with due_date <= today
  let inProgressQuery = supabase
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
      requires_attachment,
      submission_text,
      submitted_at,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type)
    `
    )
    .eq('status', 'In Progress')
    .order('due_date', { ascending: true, nullsFirst: false });

  let todoDueQuery = supabase
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
      requires_attachment,
      submission_text,
      submitted_at,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type)
    `
    )
    .eq('status', 'Todo')
    .lte('due_date', today)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (shouldScope) {
    inProgressQuery = inProgressQuery.eq('assignee_id', effectiveUserId);
    todoDueQuery = todoDueQuery.eq('assignee_id', effectiveUserId);
  }

  const [inProgressResult, todoDueResult] = await Promise.all([inProgressQuery, todoDueQuery]);

  const normalize = (task: Record<string, unknown>) => {
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
  };

  const inProgressTasks = (inProgressResult.data || []).map(normalize);
  const todoDueTasks = (todoDueResult.data || []).map(normalize);

  // Dedupe by id (in case a task somehow matched both)
  const seen = new Set<string>();
  const result: Task[] = [];
  for (const task of [...inProgressTasks, ...todoDueTasks]) {
    if (!seen.has(task.id)) {
      seen.add(task.id);
      result.push(task);
    }
  }

  return result;
}

/**
 * Get a single task by ID (for edit modal)
 */
export async function getTaskById(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .select(
      `*, creator:profiles!tasks_creator_id_fkey(id, full_name, email, avatar_url),
       assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
       project:projects!tasks_project_id_fkey(id, name, project_type)`
    )
    .eq('id', taskId)
    .single();

  if (error || !task) {
    return { success: false, error: error?.message || 'Task not found' };
  }

  const t = task as unknown as {
    creator: Task['creator'] | Task['creator'][] | null;
    assignee: Task['assignee'] | Task['assignee'][] | null;
    project: Task['project'] | Task['project'][];
  };

  return {
    success: true,
    data: {
      ...task,
      creator: Array.isArray(t.creator) ? t.creator[0] || null : t.creator,
      assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
      project: Array.isArray(t.project) ? t.project[0] : t.project,
    } as Task,
  };
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

  // Clients cannot create tasks via the portal — they request work through
  // /requests instead. Defends the action even if a UI button is added by
  // accident or a crafted call comes from a client session.
  const { data: roleRow } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (roleRow?.role === 'client') {
    return { success: false, error: 'Clients cannot create tasks' };
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
    requires_attachment,
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
      // Only admins can set requires_attachment on creation
      requires_attachment:
        requires_attachment && (await isUserAdmin(user.id))
          ? requires_attachment.trim() || null
          : null,
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
    priority,
    due_date,
    sort_order,
    assignee_id,
    project_id,
    show_in_inbox,
    scheduled_start_time,
    scheduled_end_time,
    requires_attachment,
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
  if (priority !== undefined) updateData.priority = priority;
  if (due_date !== undefined) updateData.due_date = due_date || null;
  if (sort_order !== undefined) updateData.sort_order = sort_order;
  if (assignee_id !== undefined) updateData.assignee_id = assignee_id || null;
  if (project_id !== undefined) updateData.project_id = project_id || null;
  if (show_in_inbox !== undefined) updateData.show_in_inbox = show_in_inbox;
  if (scheduled_start_time !== undefined)
    updateData.scheduled_start_time = scheduled_start_time || null;
  if (scheduled_end_time !== undefined) updateData.scheduled_end_time = scheduled_end_time || null;
  // Only admins can set/clear requires_attachment
  if (requires_attachment !== undefined) {
    const admin = await isUserAdmin(user.id);
    if (admin) {
      updateData.requires_attachment = requires_attachment?.trim() || null;
    }
  }

  // Set completed_at when status changes to Done
  if (status !== undefined) {
    if (status === 'Done') {
      // Server-side enforcement: check attachment requirement
      const attachmentError = await checkAttachmentRequirement(supabase, id);
      if (attachmentError) {
        return { success: false, error: attachmentError };
      }
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

  return { success: true };
}

/**
 * Admin: force-mark a task as Done, bypassing attachment requirements
 */
export async function adminMarkTaskDone(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  const admin = await isUserAdmin(user.id);
  if (!admin) return { success: false, error: 'Admin access required' };

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'Done', completed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) {
    console.error('[adminMarkTaskDone] Error:', error);
    return { success: false, error: error.message };
  }

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

  // Authorization: admin, task creator, assignee, project lead, or workspace member
  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) {
    return { success: false, error: 'You do not have permission to delete this task' };
  }

  // .select() so we detect RLS silently filtering out the row (0 rows affected, no error)
  const { data, error } = await supabase.from('tasks').delete().eq('id', taskId).select('id');

  if (error) {
    console.error('[deleteTask] Error deleting task:', error);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    console.error('[deleteTask] RLS blocked delete for task', taskId);
    return { success: false, error: 'You do not have permission to delete this task' };
  }

  return { success: true };
}

/**
 * Bulk-assign many tasks to one assignee. Admin-only.
 * Notifies the new assignee once with the count of newly-assigned tasks.
 */
export async function bulkAssignTasks(
  taskIds: string[],
  assigneeId: string | null
): Promise<ActionResult> {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return { success: false, error: 'No tasks selected' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Admin access required' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ assignee_id: assigneeId })
    .in('id', taskIds)
    .select('id, title, workspace_id');

  if (error) {
    console.error('[bulkAssignTasks] Error:', error);
    return { success: false, error: error.message };
  }

  const updated = data || [];

  // Notify the new assignee once per task. Skip when unassigning (assigneeId === null)
  // or when the admin assigned tasks to themselves.
  if (assigneeId && assigneeId !== user.id && updated.length > 0) {
    const { notifyTaskAssigned } = await import('./notifications');
    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    const actorName = actor?.full_name || actor?.email || 'An admin';

    // One notification row per task — keeps `link` and `metadata.issue_id` correct
    // and matches how single-assignment notifications already work.
    await Promise.all(
      updated.map((row) =>
        notifyTaskAssigned(row.id, row.title, [assigneeId], row.workspace_id, actorName)
      )
    );
  }

  return { success: true, data: { count: updated.length } };
}

/**
 * Bulk-mark many tasks as Done. Admin-only.
 */
export async function bulkMarkDone(taskIds: string[]): Promise<ActionResult> {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return { success: false, error: 'No tasks selected' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Admin access required' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'Done', completed_at: new Date().toISOString() })
    .in('id', taskIds)
    .select('id');

  if (error) {
    console.error('[bulkMarkDone] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { count: (data || []).length } };
}

/**
 * Bulk-delete many tasks. Admin-only.
 */
export async function bulkDelete(taskIds: string[]): Promise<ActionResult> {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return { success: false, error: 'No tasks selected' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Admin access required' };
  }

  const { data, error } = await supabase.from('tasks').delete().in('id', taskIds).select('id');

  if (error) {
    console.error('[bulkDelete] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { count: (data || []).length } };
}

/**
 * Reorder tasks (batch update sort_order)
 * Used for drag-and-drop reordering.
 *
 * Performance: at most 2 DB round-trips regardless of batch size —
 *   1. auth check (1 query for admin, or 1 batch ownership query for non-admin)
 *   2. single RPC call to batch_update_task_orders
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

  // Authorization: single query — check admin first (cached), then batch ownership check
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    const taskIds = taskUpdates.map(({ id }) => id);
    const { data: accessibleTasks, error: authError } = await supabase
      .from('tasks')
      .select('id')
      .in('id', taskIds)
      .or(`creator_id.eq.${user.id},assignee_id.eq.${user.id}`);

    if (authError) {
      return { success: false, error: 'Authorization check failed' };
    }

    const accessibleIds = new Set((accessibleTasks || []).map((t) => t.id));
    const unauthorized = taskIds.find((id) => !accessibleIds.has(id));
    if (unauthorized) {
      return { success: false, error: 'You do not have permission to reorder one or more tasks' };
    }
  }

  // Single RPC call — batch_update_task_orders handles sort_order + status + completed_at
  const { error } = await supabase.rpc('batch_update_task_orders', {
    updates: JSON.stringify(taskUpdates),
  });

  if (error) {
    console.error('[reorderTasks] RPC error:', error);
    return { success: false, error: 'Failed to reorder tasks' };
  }

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

  // Verify user has access to this project
  const hasAccess = await canAccessProject(user.id, projectId);
  if (!hasAccess) {
    console.error('[getProjectTasks] Access denied for user', user.id);
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
      requires_attachment,
      submission_text,
      submitted_at,
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
      // Server-side enforcement: check attachment requirement
      const attachmentError = await checkAttachmentRequirement(supabase, taskId);
      if (attachmentError) {
        return { success: false, error: attachmentError };
      }
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

  // M14 (OPTIMIZE.md): merged the post-update SELECT into the UPDATE via
  // `.select('workspace_id, title').single()`. Previously we paid an extra
  // round-trip just to read back data the UPDATE already had access to.
  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select('workspace_id, title')
    .single();

  if (error) {
    console.error('[quickUpdateTask] Error updating task:', error);
    return { success: false, error: error.message };
  }

  // Fire task completion notifications to all admins (except the actor).
  // M14: replaced the per-admin `createNotification()` fan-out with one bulk
  // INSERT ... SELECT style fetch + insert so N admin targets = 2 queries
  // (one SELECT, one bulk INSERT) regardless of team size.
  if (updates.status === 'Done' && updatedTask?.workspace_id && updatedTask?.title) {
    const taskWorkspaceId = updatedTask.workspace_id;
    const taskTitle = updatedTask.title;
    (async () => {
      try {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .neq('id', user.id);

        if (!adminProfiles || adminProfiles.length === 0) return;

        const rows = adminProfiles.map((admin) => ({
          user_id: admin.id,
          workspace_id: taskWorkspaceId,
          type: 'task_completed',
          title: 'Task Completed',
          message: `${taskTitle} was marked as done`,
          link: '/tasks',
          metadata: {},
        }));

        const { error: insertError } = await supabase.from('notifications').insert(rows);
        if (insertError) {
          console.error('[quickUpdateTask] Bulk notification insert failed:', insertError);
        }
      } catch (err) {
        console.error('[quickUpdateTask] Failed to send completion notifications:', err);
      }
    })();
  }

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
      requires_attachment,
      submission_text,
      submitted_at,
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

  // Scope visibility — respects "View as" impersonation
  const { effectiveUserId: euId, shouldScope: scope } = await getEffectiveUser(supabase, user.id);
  if (scope) {
    query = query.eq('assignee_id', euId);
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

  return { success: true };
}

/**
 * Get tasks visible across the projects the caller can see.
 *
 * For role='client' we apply two extra filters so internal scratch / backlog
 * never leaks: (1) `is_client_visible = true` (admin-controlled toggle, see
 * migration 20260418130000) and (2) `phase_id IS NOT NULL` (no unphased work).
 * Internal roles see everything in the projects they were given.
 */
export async function getClientVisibleTasks(
  projectIds: string[],
  role: string = 'client'
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!projectIds.length) return { success: true, data: [] };

  let query = supabase
    .from('tasks')
    .select(
      'id, title, status, priority, due_date, project_id, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), project:projects!tasks_project_id_fkey(id, name)'
    )
    .in('project_id', projectIds)
    .in('item_type', ['task', 'issue'])
    .not('status', 'eq', 'Canceled');

  if (role === 'client') {
    query = query.eq('is_client_visible', true).not('phase_id', 'is', null);
  }

  const { data, error } = await query
    .order('status', { ascending: true })
    .order('priority', { ascending: true })
    .limit(200);

  if (error) return { success: false, error: error.message };

  // Normalize FK arrays
  const normalized = (data || []).map((t) => ({
    ...t,
    assignee: Array.isArray(t.assignee) ? t.assignee[0] || null : t.assignee,
    project: Array.isArray(t.project) ? t.project[0] || null : t.project,
  }));

  return { success: true, data: normalized };
}

/**
 * Get backlog tasks (unscheduled, not done)
 */
export async function getBacklogTasks(workspaceId?: string | null): Promise<Task[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

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
      requires_attachment,
      submission_text,
      submitted_at,
      created_at,
      updated_at,
      creator:profiles!tasks_creator_id_fkey (id, full_name, email, avatar_url),
      assignee:profiles!tasks_assignee_id_fkey (id, full_name, email, avatar_url),
      project:projects (id, name, project_type)
    `
    )
    .is('scheduled_start_time', null)
    .in('status', ['Todo', 'In Progress'])
    .order('sort_order', { ascending: true })
    .limit(20);

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  // Scope visibility — respects "View as" impersonation
  const { effectiveUserId: euId, shouldScope: scope } = await getEffectiveUser(supabase, user.id);
  if (scope) {
    query = query.eq('assignee_id', euId);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('[getBacklogTasks] Error:', error);
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
 * Quick toggle task status between Todo/Done (for schedule block checkboxes)
 */
export async function quickToggleTaskStatus(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  const canModify = await canModifyTask(user.id, taskId);
  if (!canModify) return { success: false, error: 'No permission' };

  // Get current status
  const { data: task } = await supabase
    .from('tasks')
    .select('status, requires_attachment')
    .eq('id', taskId)
    .single();

  if (!task) return { success: false, error: 'Task not found' };

  const newStatus = task.status === 'Done' ? 'Todo' : 'Done';

  // Server-side enforcement: check attachment requirement
  if (newStatus === 'Done') {
    const attachmentError = await checkAttachmentRequirement(supabase, taskId);
    if (attachmentError) {
      return { success: false, error: attachmentError };
    }
  }

  const completedAt = newStatus === 'Done' ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, completed_at: completedAt })
    .eq('id', taskId);

  if (error) return { success: false, error: error.message };

  return { success: true, data: { newStatus } };
}

/**
 * Clear all completed tasks from inbox (hides them, doesn't delete)
 * Tasks remain in the DB and can be found via project views
 */
export async function clearCompletedFromInbox(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  const admin = await isUserAdmin(user.id);
  if (!admin) return { success: false, error: 'No permission' };

  const wsId = await getCurrentWorkspaceId();
  if (!wsId) return { success: false, error: 'No workspace' };

  const { error, count } = await supabase
    .from('tasks')
    .update({ show_in_inbox: false })
    .eq('workspace_id', wsId)
    .eq('show_in_inbox', true)
    .eq('status', 'Done');

  if (error) return { success: false, error: error.message };

  return { success: true, data: { cleared: count } };
}
