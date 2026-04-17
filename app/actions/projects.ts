'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

import {
  parseFormData,
  createProjectSchema,
  updateProjectSchema,
  createProjectWizardSchema,
  updateProjectProgressSchema,
  type CreateProjectWizardInput,
} from '@/lib/validation';
import { notifyProjectCreated } from '@/lib/email';

import { getCurrentWorkspaceId } from './workspace';
import {
  createActivity,
  canDeleteProject,
  isUserManagerOrAbove,
  type ActionResult,
  type ActivityType,
} from './shared';
import { assertNotImpersonating } from '@/lib/portal-utils';

// ============ PROJECT TYPES ============

export interface ProjectStatsData {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  project_group: string | null;
  project_type: string | null;
  deployment_platform: string | null;
  client_id: string | null;
  client_name: string | null;
  logo_url: string | null;
  lead: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  issue_stats: {
    total: number;
    done: number;
  };
  roadmap_progress: number;
  is_pre_production: boolean;
  metadata: { is_partnership?: boolean; partner_name?: string } | null;
  sort_order: number;
}

// ============ PROJECT ACTIONS ============

/**
 * Create a new project
 */
export async function createProject(formData: FormData): Promise<ActionResult> {
  const imp = await assertNotImpersonating();
  if (!imp.ok) return { success: false, error: imp.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createProjectSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { name, description, status, team_id, target_date, workspace_id, project_group } =
    validation.data;

  // Business rule: team is required
  if (!team_id) {
    return { success: false, error: 'Team is required' };
  }

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      status,
      team_id,
      lead_id: user.id,
      target_date: target_date || null,
      workspace_id: wsId,
      project_group,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'project_created' as ActivityType,
    {
      project_id: data.id,
      team_id,
      workspace_id: wsId,
    },
    { name: data.name, status: data.status }
  );

  // Send email notification to other admins (fire and forget)
  // Get team name for the email
  let teamName: string | undefined;
  if (team_id) {
    const { data: team } = await supabase.from('teams').select('name').eq('id', team_id).single();
    teamName = team?.name;
  }

  notifyProjectCreated(user.id, name.trim(), data.id, teamName, target_date || undefined).catch(
    (err) => console.error('[createProject] Failed to send email notification:', err)
  );

  return { success: true, data };
}

/**
 * Get all projects for a workspace (simple list)
 */
export async function getProjects(workspaceId?: string | null) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase.from('projects').select('id, name').order('name');

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  // Fetch projects and user auth in parallel
  const [
    { data: projects },
    {
      data: { user },
    },
  ] = await Promise.all([query, supabase.auth.getUser()]);

  // Clients only see their linked projects; internal users (admin/manager/employee)
  // see everything in the workspace.
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'client') {
      const { data: links } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id);
      const clientIds = new Set((links || []).map((l) => l.project_id));
      return (projects || []).filter((p) => clientIds.has(p.id));
    }
  }

  return projects || [];
}

/**
 * Get all active/launched projects (for admin clock-in)
 */
export async function getActiveProjects(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();
  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .eq('workspace_id', wsId!)
    .in('status', ['Active', 'Launched'])
    .order('name');
  return data || [];
}

/**
 * Get project stats with issue counts and roadmap progress
 */
export async function getProjectStats(workspaceId?: string | null): Promise<{
  demos: ProjectStatsData[];
  building: ProjectStatsData[];
  preProduction: ProjectStatsData[];
  live: ProjectStatsData[];
  done: ProjectStatsData[];
  archived: ProjectStatsData[];
}> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  const { data: rawProjects, error } = await supabase.rpc('get_project_stats', {
    p_workspace_id: wsId,
  });

  if (error) {
    console.error('Error fetching project stats:', error);
    return { demos: [], building: [], preProduction: [], live: [], done: [], archived: [] };
  }

  // Fetch sort_order, team assignments, GitHub integrations, AND user auth in parallel
  // Each query is individually caught so a single failure doesn't blank the dashboard
  const projectIds = (rawProjects || []).map((p: Record<string, unknown>) => p.id as string);
  const [sortResult, assignmentResult, githubResult, userResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, sort_order')
      .in('id', projectIds)
      .then(
        (r) => r,
        () => ({ data: null })
      ),
    supabase
      .from('project_assignments')
      .select(
        'project_id, employee:profiles!project_assignments_employee_id_fkey(id, full_name, avatar_url)'
      )
      .in('project_id', projectIds)
      .is('removed_at', null)
      .then(
        (r) => r,
        () => ({ data: null })
      ),
    supabase
      .from('project_integrations')
      .select('project_id')
      .eq('service_type', 'github')
      .in('project_id', projectIds)
      .then(
        (r) => r,
        () => ({ data: null })
      ),
    supabase.auth.getUser().then(
      (r) => r,
      () => ({ data: { user: null } })
    ),
  ]);
  const sortData = sortResult.data;
  const assignmentData = assignmentResult.data;
  const githubData = githubResult.data;
  const { user } = userResult.data;
  const sortMap = new Map<string, number>();
  for (const s of sortData || []) {
    sortMap.set(s.id, s.sort_order ?? 0);
  }
  const teamByProject = new Map<
    string,
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >();
  for (const a of assignmentData || []) {
    const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
    if (!emp?.id) continue;
    const existing = teamByProject.get(a.project_id) || [];
    existing.push({ id: emp.id, full_name: emp.full_name, avatar_url: emp.avatar_url });
    teamByProject.set(a.project_id, existing);
  }
  const githubProjectIds = new Set((githubData || []).map((i) => i.project_id));

  // Clients only see their linked projects. Internal users (admin/manager/employee)
  // see every project in the workspace — no assignment-based filtering.
  let clientProjectIds: Set<string> | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'client') {
      const { data: links } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id);
      clientProjectIds = new Set((links || []).map((l) => l.project_id));
    }
  }

  const allProjects: ProjectStatsData[] = (rawProjects || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    status: p.status as string,
    start_date: p.start_date as string | null,
    target_date: p.target_date as string | null,
    project_group: p.project_group as string | null,
    project_type: p.project_type as string | null,
    deployment_platform: p.deployment_platform as string | null,
    client_id: p.client_id as string | null,
    client_name: p.client_name as string | null,
    logo_url: (p.logo_url as string | null) || null,
    lead: p.lead_id
      ? {
          id: p.lead_id as string,
          full_name: p.lead_full_name as string | null,
          email: p.lead_email as string | null,
        }
      : null,
    issue_stats: {
      total: Number(p.total_issues),
      done: Number(p.done_issues),
    },
    roadmap_progress: (p.roadmap_progress as number) || 0,
    is_pre_production: (p.is_pre_production as boolean) || false,
    metadata: p.metadata as { is_partnership?: boolean; partner_name?: string } | null,
    sort_order: sortMap.get(p.id as string) ?? 0,
    team: teamByProject.get(p.id as string) || [],
    has_github: githubProjectIds.has(p.id as string),
  }));

  // Filter only for clients (linked projects only); internal users see all.
  const visibleProjects = clientProjectIds
    ? allProjects.filter((p) => clientProjectIds!.has(p.id))
    : allProjects;

  const sortByOrder = (a: ProjectStatsData, b: ProjectStatsData) => a.sort_order - b.sort_order;

  // Status-based filtering — pipeline stages, sorted by sort_order
  const demos = visibleProjects.filter((p) => p.status === 'Demos').sort(sortByOrder);
  const activeDelayed = visibleProjects.filter((p) => ['Active', 'Delayed'].includes(p.status));
  const building = activeDelayed.filter((p) => !p.is_pre_production).sort(sortByOrder);
  const preProduction = activeDelayed.filter((p) => p.is_pre_production).sort(sortByOrder);
  const live = visibleProjects.filter((p) => p.status === 'Launched').sort(sortByOrder);
  const done = visibleProjects.filter((p) => p.status === 'Done').sort(sortByOrder);
  const archived = visibleProjects
    .filter((p) => ['Archived', 'Canceled'].includes(p.status))
    .sort(sortByOrder);

  return { demos, building, preProduction, live, done, archived };
}

/**
 * Get a project by ID
 */
export async function getProjectById(id: string) {
  const supabase = await createClient();

  // Parallelize project + issues queries — they're independent
  const [projectResult, issuesResult] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `
            *,
            lead:profiles!projects_lead_id_fkey (id, full_name, email, avatar_url),
            team:teams (id, name, key),
            client:clients (id, name)
        `
      )
      .eq('id', id)
      .single(),
    supabase
      .from('issues')
      .select(
        `
            id,
            title,
            status,
            priority,
            created_at
        `
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const { data: project, error } = projectResult;
  const { data: issues } = issuesResult;

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  // Compute stats from already-fetched issues (was a second query before)
  const totalIssues = issues?.length || 0;
  const doneIssues = issues?.filter((i) => i.status === 'Done')?.length || 0;

  return {
    ...project,
    lead: Array.isArray(project.lead) ? project.lead[0] || null : project.lead,
    team: Array.isArray(project.team) ? project.team[0] || null : project.team,
    client: Array.isArray(project.client) ? project.client[0] || null : project.client,
    issues: issues || [],
    issue_stats: {
      total: totalIssues || 0,
      done: doneIssues || 0,
    },
  };
}

/**
 * Update a project
 */
export async function updateProject(formData: FormData): Promise<ActionResult> {
  const imp = await assertNotImpersonating();
  if (!imp.ok) return { success: false, error: imp.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Role guard: only managers and admins can update projects
  const isPriv = await isUserManagerOrAbove(user.id);
  if (!isPriv) return { success: false, error: 'Not authorized' };

  // Validate input
  const validation = parseFormData(updateProjectSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const {
    id,
    name,
    description,
    project_group,
    project_type,
    lead_id,
    target_date,
    metadata,
    status,
    client_id,
  } = validation.data;

  // Get current project status if status is being updated
  let existingProject = null;
  if (status !== undefined) {
    const { data } = await supabase.from('projects').select('status').eq('id', id).single();
    existingProject = data;
  }

  // Parse metadata JSON if provided
  let parsedMetadata: Record<string, unknown> | undefined;
  if (metadata) {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return { success: false, error: 'Invalid metadata JSON' };
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(project_group !== undefined && { project_group: project_group || null }),
      ...(project_type !== undefined && { project_type: project_type || null }),
      ...(lead_id !== undefined && { lead_id: lead_id || null }),
      ...(target_date !== undefined && { target_date: target_date || null }),
      ...(parsedMetadata !== undefined && { metadata: parsedMetadata }),
      ...(status !== undefined && { status }),
      ...(client_id !== undefined && { client_id: client_id || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }

  // Notify clients if status changed (fire-and-forget)
  if (status !== undefined && existingProject && existingProject.status !== status) {
    const { data: employee } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { notifyClientOfProjectStatusChange } = await import('@/lib/email');
    notifyClientOfProjectStatusChange(
      id,
      employee?.full_name || 'Team member',
      existingProject.status,
      status
    ).catch((err) => console.error('[updateProject] Client notification error:', err));
  }

  return { success: true, data };
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<ActionResult> {
  const imp = await assertNotImpersonating();
  if (!imp.ok) return { success: false, error: imp.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only lead or admin can delete
  const canDelete = await canDeleteProject(user.id, id);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this project' };
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update project phase progress
 */
export async function updateProjectPhaseProgress(
  projectId: string,
  progress: Record<string, number[]>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = normalizeAndValidate({ projectId, progress }, updateProjectProgressSchema);
  if (!validation.success) {
    // If validation fails, log it but proceed
  }

  const { error } = await supabase
    .from('projects')
    .update({ phase_progress: progress })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project progress:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Helper for loose validation
function normalizeAndValidate<T>(data: unknown, schema: z.ZodSchema<T>) {
  return schema.safeParse(data);
}

/**
 * Bulk delete projects (admin only)
 */
export async function bulkDeleteProjects(projectIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.email === 'info@qualiasolutions.net';

  if (!isSuperAdmin) {
    return { success: false, error: 'Only super admin can bulk delete projects' };
  }

  const { error } = await supabase.from('projects').delete().in('id', projectIds);

  if (error) {
    console.error('Error bulk deleting projects:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current project status before updating
  const { data: existingProject } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  const { error } = await supabase
    .from('projects')
    .update({
      status: newStatus,
      is_pre_production: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project status:', error);
    return { success: false, error: error.message };
  }

  // Notify clients if status changed (fire-and-forget)
  if (existingProject && existingProject.status !== newStatus) {
    const { data: employee } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { notifyClientOfProjectStatusChange } = await import('@/lib/email');
    notifyClientOfProjectStatusChange(
      projectId,
      employee?.full_name || 'Team member',
      existingProject.status,
      newStatus
    ).catch((err) => console.error('[updateProjectStatus] Client notification error:', err));
  }

  return { success: true };
}

/**
 * Toggle project pre-production flag
 */
export async function toggleProjectPreProduction(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current value
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('is_pre_production')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return { success: false, error: 'Project not found' };
  }

  const { error } = await supabase
    .from('projects')
    .update({
      is_pre_production: !project.is_pre_production,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error toggling pre-production:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get board tasks (enhanced issue list)
 */
export async function getBoardTasks(
  workspaceId: string,
  options: {
    status?: string[];
    limit?: number;
  } = {}
) {
  const supabase = await createClient();
  const { status, limit = 100 } = options;

  // First check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getBoardTasks] No authenticated user');
    return [];
  }

  // Simplified query - fetch tasks first, then relations separately if needed
  let query = supabase
    .from('issues')
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      created_at,
      updated_at,
      creator_id,
      project_id,
      projects!issues_project_id_fkey (id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('[getBoardTasks] Error fetching board tasks:', error);
    return [];
  }

  // Get assignees separately to avoid join issues
  const taskIds = (tasks || []).map((t) => t.id);
  const assigneesMap: Record<
    string,
    Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  > = {};

  if (taskIds.length > 0) {
    const { data: assigneesData } = await supabase
      .from('issue_assignees')
      .select('issue_id, profiles!issue_assignees_profile_id_fkey (id, full_name, avatar_url)')
      .in('issue_id', taskIds);

    if (assigneesData) {
      assigneesData.forEach((a) => {
        if (!assigneesMap[a.issue_id]) {
          assigneesMap[a.issue_id] = [];
        }
        const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        if (profile) {
          assigneesMap[a.issue_id].push(profile);
        }
      });
    }
  }

  return (tasks || []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    created_at: task.created_at,
    updated_at: task.updated_at,
    creator_id: task.creator_id,
    project: Array.isArray(task.projects) ? task.projects[0] || null : task.projects,
    assignees: assigneesMap[task.id] || [],
  }));
}

/**
 * Create a project with roadmap (wizard)
 * Optionally starts provisioning if integration selections are provided
 */
export async function createProjectWithRoadmap(
  input: CreateProjectWizardInput & {
    /** Integration selections to auto-provision after project creation */
    selectedIntegrations?: {
      github?: boolean;
      vercel?: boolean;
    };
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Extract integration selections before validation (they're not in the schema)
  const { selectedIntegrations, ...validationInput } = input;

  // Validate input
  const validation = createProjectWizardSchema.safeParse(validationInput);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { success: false, error: firstError?.message || 'Validation failed' };
  }

  const {
    name,
    description,
    project_type,
    deployment_platform,
    client_id,
    custom_client_name,
    team_id,
    workspace_id,
    is_demo,
  } = validation.data;

  // Get workspace ID from input or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  // Handle custom client name - create new client if provided
  let finalClientId = client_id;
  if (!client_id && custom_client_name) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: custom_client_name.trim(),
        display_name: custom_client_name.trim(),
        workspace_id: wsId,
        lead_status: 'active_client',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return { success: false, error: 'Failed to create client' };
    }
    finalClientId = newClient.id;
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      project_type,
      deployment_platform,
      client_id: finalClientId,
      team_id,
      lead_id: user.id,
      workspace_id: wsId,
      status: is_demo ? 'Demos' : 'Active',
      project_group: is_demo ? 'demos' : 'active',
    })
    .select()
    .single();

  if (projectError) {
    console.error('Error creating project:', projectError);
    return { success: false, error: projectError.message };
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'project_created' as ActivityType,
    {
      project_id: project.id,
      team_id,
      workspace_id: wsId,
    },
    { name: project.name, project_type, deployment_platform }
  );

  // Start provisioning if integrations were selected
  // We do this fire-and-forget since the UI will poll for status
  if (selectedIntegrations && Object.keys(selectedIntegrations).length > 0) {
    // Import here to avoid circular dependency
    const { setupProjectIntegrations } = await import('@/lib/integrations/orchestrator');

    // Get client name for the repo
    let clientName: string | undefined;
    if (finalClientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('display_name')
        .eq('id', finalClientId)
        .single();
      clientName = client?.display_name || undefined;
    }

    // Create provisioning record first
    await supabase.from('project_provisioning').upsert(
      {
        project_id: project.id,
        workspace_id: wsId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    // Run provisioning asynchronously - don't await
    // The UI will poll for status
    setupProjectIntegrations({
      projectId: project.id,
      projectName: project.name,
      projectType: project_type,
      deploymentPlatform: deployment_platform || 'none',
      description: description || undefined,
      clientName,
      workspaceId: wsId,
      selectedIntegrations,
    }).catch((err) => {
      console.error('[createProjectWithRoadmap] Provisioning error:', err);
    });
  }

  return { success: true, data: project };
}

/**
 * Reorder projects within a stage — swaps sort_order between two projects
 */
export async function reorderProject(
  projectId: string,
  direction: 'up' | 'down',
  stageProjectIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const idx = stageProjectIds.indexOf(projectId);
  if (idx === -1) return { success: false, error: 'Project not in stage' };

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= stageProjectIds.length) {
    return { success: false, error: 'Cannot move further' };
  }

  const targetId = stageProjectIds[swapIdx];

  // Fetch current sort_orders
  const { data: projects } = await supabase
    .from('projects')
    .select('id, sort_order')
    .in('id', [projectId, targetId]);

  if (!projects || projects.length !== 2) {
    return { success: false, error: 'Projects not found' };
  }

  const current = projects.find((p) => p.id === projectId)!;
  const target = projects.find((p) => p.id === targetId)!;

  // Swap sort_orders
  const { error: e1 } = await supabase
    .from('projects')
    .update({ sort_order: target.sort_order ?? 0 })
    .eq('id', projectId);

  const { error: e2 } = await supabase
    .from('projects')
    .update({ sort_order: current.sort_order ?? 0 })
    .eq('id', targetId);

  if (e1 || e2) {
    return { success: false, error: 'Failed to reorder' };
  }

  return { success: true };
}
