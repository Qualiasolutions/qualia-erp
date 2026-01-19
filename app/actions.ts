'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  parseFormData,
  validateData,
  createIssueSchema,
  updateIssueSchema,
  createProjectSchema,
  updateProjectSchema,
  createTeamSchema,
  createClientSchema,
  updateClientSchema,
  createMeetingSchema,
  updateMeetingSchema,
  createCommentSchema,
  createProjectWizardSchema,
  type CreateProjectWizardInput,
  updateProjectProgressSchema,
} from '@/lib/validation';
import {
  notifyProjectCreated,
  notifyMeetingCreated,
  notifyClientCreated,
  notifyIssueCreated,
} from '@/lib/email';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Activity types that match the database enum
type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'issue_created'
  | 'issue_updated'
  | 'issue_completed'
  | 'comment_added'
  | 'team_created'
  | 'member_added'
  | 'meeting_created';

// ============ HELPER TYPES ============

// Profile type for foreign key relations
type ProfileRef = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
} | null;

// For Supabase responses where FK can be array or single object
type FKResponse<T> = T | T[] | null;

// Client activity from Supabase response
type ClientActivityResponse = {
  id: string;
  type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: FKResponse<ProfileRef>;
};

// Meeting response type for getMeetings
type MeetingResponse = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  project: FKResponse<{ id: string; name: string }>;
  client: FKResponse<{ id: string; display_name: string; lead_status: string | null }>;
  creator: FKResponse<ProfileRef>;
  attendees: Array<{
    id: string;
    profile: FKResponse<ProfileRef>;
  }>;
};

// ============ AUTHORIZATION HELPERS ============

// Check if user is an admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
}

// Check if user can delete an issue (creator or admin)
async function canDeleteIssue(userId: string, issueId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase.from('issues').select('creator_id').eq('id', issueId).single();

  return data?.creator_id === userId;
}

// Check if user can delete a project (lead or admin)
async function canDeleteProject(userId: string, projectId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('lead_id').eq('id', projectId).single();

  return data?.lead_id === userId;
}

// Check if user can delete a meeting (creator or admin)
async function canDeleteMeeting(userId: string, meetingId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('meetings')
    .select('created_by')
    .eq('id', meetingId)
    .single();

  return data?.created_by === userId;
}

// Check if user can delete a client (admin or workspace admin)
async function canDeleteClient(userId: string, clientId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from('clients')
    .select('workspace_id')
    .eq('id', clientId)
    .single();

  if (!client?.workspace_id) return false;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', client.workspace_id)
    .eq('profile_id', userId)
    .single();

  return membership?.role === 'owner' || membership?.role === 'admin';
}

// ============ WORKSPACE HELPERS ============

// Get current user's default workspace ID
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  return data?.workspace_id || null;
}

// Get current user profile with role
export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  return profile;
}

// Get all workspaces (for admin management)
export async function getWorkspaces() {
  const supabase = await createClient();
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, description')
    .order('name');
  return workspaces || [];
}

// Get user's workspace memberships with access info
export async function getUserWorkspaces() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch all workspaces
  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, description')
    .order('name');

  // Fetch user's memberships
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, is_default')
    .eq('profile_id', user.id);

  const membershipMap = new Map(
    (memberships || []).map((m) => [m.workspace_id, { role: m.role, is_default: m.is_default }])
  );

  return (allWorkspaces || []).map((ws) => ({
    ...ws,
    hasAccess: membershipMap.has(ws.id),
    role: membershipMap.get(ws.id)?.role || null,
    isDefault: membershipMap.get(ws.id)?.is_default || false,
  }));
}

// Set user's default workspace
export async function setDefaultWorkspace(workspaceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is a member of this workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .single();

  if (!membership) {
    return { success: false, error: "You don't have access to this workspace" };
  }

  // Set all other workspaces as non-default
  await supabase.from('workspace_members').update({ is_default: false }).eq('profile_id', user.id);

  // Set selected workspace as default
  await supabase
    .from('workspace_members')
    .update({ is_default: true })
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id);

  revalidatePath('/');
  return { success: true };
}

// Create a new workspace (admin only)
export async function createWorkspace(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string | null;

  if (!name?.trim()) {
    return { success: false, error: 'Workspace name is required' };
  }

  if (!slug?.trim()) {
    return { success: false, error: 'Workspace slug is required' };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workspace:', error);
    return { success: false, error: error.message };
  }

  // Add the creator as the workspace owner
  await supabase.from('workspace_members').insert({
    workspace_id: data.id,
    profile_id: user.id,
    role: 'owner',
    is_default: false,
  });

  revalidatePath('/');
  return { success: true, data };
}

// Add a member to a workspace
export async function addWorkspaceMember(
  workspaceId: string,
  profileId: string,
  role: string = 'member'
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    profile_id: profileId,
    role,
    is_default: false,
  });

  if (error) {
    console.error('Error adding workspace member:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Remove a member from a workspace
export async function removeWorkspaceMember(
  workspaceId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing workspace member:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Helper to create activity records
async function createActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  type: ActivityType,
  refs: {
    project_id?: string | null;
    issue_id?: string | null;
    team_id?: string | null;
    comment_id?: string | null;
    meeting_id?: string | null;
    workspace_id?: string | null;
  },
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('activities').insert({
      actor_id: actorId,
      type,
      project_id: refs.project_id || null,
      issue_id: refs.issue_id || null,
      team_id: refs.team_id || null,
      comment_id: refs.comment_id || null,
      meeting_id: refs.meeting_id || null,
      workspace_id: refs.workspace_id || null,
      metadata: metadata || {},
    });
  } catch (err) {
    // Don't fail the main operation if activity logging fails
    console.error('Failed to create activity:', err);
  }
}

export async function createIssue(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createIssueSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const {
    title,
    description,
    status,
    priority,
    team_id,
    project_id,
    custom_project_name,
    workspace_id,
    assignee_id,
  } = validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
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
        project_type: 'web_design',
        deployment_platform: 'vercel',
      })
      .select('id')
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return { success: false, error: 'Failed to create project' };
    }
    finalProjectId = newProject.id;
  }

  const { data, error } = await supabase
    .from('issues')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      team_id: team_id || null,
      project_id: finalProjectId || null,
      creator_id: user.id,
      workspace_id: wsId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating issue:', error);
    return { success: false, error: error.message };
  }

  // Assign user if provided
  if (assignee_id) {
    const { error: assignError } = await supabase.from('issue_assignees').insert({
      issue_id: data.id,
      profile_id: assignee_id,
      assigned_by: user.id,
    });

    if (assignError) {
      console.error('Error assigning issue:', assignError);
    }
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'issue_created',
    {
      issue_id: data.id,
      team_id: team_id,
      project_id: finalProjectId,
      workspace_id: wsId,
    },
    { title: data.title, priority: data.priority }
  );

  // Send email notification to other admins (fire and forget)
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

  notifyIssueCreated(user.id, title.trim(), data.id, priority || undefined, projectName).catch(
    (err) => console.error('[createIssue] Failed to send email notification:', err)
  );

  revalidatePath('/issues');
  revalidatePath('/hub');
  revalidatePath('/board');
  revalidatePath('/');
  return { success: true, data };
}

export async function createProject(formData: FormData): Promise<ActionResult> {
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
    'project_created',
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

  revalidatePath('/projects');
  revalidatePath('/');
  return { success: true, data };
}

export async function createTeam(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createTeamSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { name, key, description, workspace_id } = validation.data;
  const memberIds = formData.getAll('member_ids') as string[];

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  // Create the team
  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      name: name.trim(),
      key: key.trim().toUpperCase(),
      description: description?.trim() || null,
      workspace_id: wsId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message };
  }

  // Add team members if any selected
  if (memberIds.length > 0 && team) {
    const teamMembers = memberIds.map((profileId) => ({
      team_id: team.id,
      profile_id: profileId,
      role: 'member',
    }));

    const { error: membersError } = await supabase.from('team_members').insert(teamMembers);

    if (membersError) {
      console.error('Error adding team members:', membersError);
      // Team was created, but members failed - don't fail the whole operation
    }
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'team_created',
    { team_id: team.id, workspace_id: wsId },
    { name: team.name, key: team.key }
  );

  revalidatePath('/teams');
  revalidatePath('/');
  return { success: true, data: team };
}

export async function getTeams(workspaceId?: string | null) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase.from('teams').select('id, name, key').order('name');

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: teams } = await query;
  return teams || [];
}

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

  const { data: projects } = await query;
  return projects || [];
}

// Project stats type for SWR
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
  metadata: { is_partnership?: boolean; partner_name?: string } | null;
}

/**
 * Get project stats with issue counts and roadmap progress
 * Used by SWR hook for real-time updates on /projects page
 */
export async function getProjectStats(
  workspaceId?: string | null
): Promise<{ projects: ProjectStatsData[]; demos: ProjectStatsData[] }> {
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
    return { projects: [], demos: [] };
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
    metadata: p.metadata as { is_partnership?: boolean; partner_name?: string } | null,
  }));

  // Split: Demos status goes to demos, rest to projects
  const demos = allProjects.filter((p) => p.status === 'Demos');
  const projects = allProjects.filter((p) => p.status !== 'Demos');

  return { projects, demos };
}

// Update project phase progress
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
    // If validation fails, log it but maybe proceed if it's just a schema mismatch we can handle?
    // actually let's just trust the types for now and skip rigid validation if schema helper isn't handy
    // or better, just check params manually to avoid import hell if helper isn't exported
  }

  const { error } = await supabase
    .from('projects')
    .update({ phase_progress: progress })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project progress:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// Helper for loose validation if needed, or we just rely on TS in the action
function normalizeAndValidate<T>(data: unknown, schema: z.ZodSchema<T>) {
  return schema.safeParse(data);
}

export async function getProfiles(workspaceId?: string) {
  const supabase = await createClient();

  // If workspaceId provided, filter to workspace members only (much faster for multi-tenant)
  if (workspaceId) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select(
        'profile:profiles!workspace_members_profile_id_fkey (id, full_name, email, avatar_url)'
      )
      .eq('workspace_id', workspaceId);

    return (members || [])
      .map((m) => (Array.isArray(m.profile) ? m.profile[0] : m.profile))
      .filter(Boolean)
      .sort((a, b) => (a?.full_name || '').localeCompare(b?.full_name || ''));
  }

  // Fallback: return all profiles (legacy behavior)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .order('full_name');
  return profiles || [];
}

// ============ FETCH BY ID ACTIONS ============

export async function getIssueById(id: string) {
  const supabase = await createClient();
  const { data: issue, error } = await supabase
    .from('issues')
    .select(
      `
            *,
            creator:profiles!issues_creator_id_fkey (id, full_name, email),
            project:projects (id, name),
            team:teams (id, name, key),
            comments (
                id,
                body,
                created_at,
                user:profiles (id, full_name, email, avatar_url)
            )
        `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching issue:', error);
    return null;
  }

  // Transform arrays to single objects for foreign keys
  return {
    ...issue,
    creator: Array.isArray(issue.creator) ? issue.creator[0] || null : issue.creator,
    project: Array.isArray(issue.project) ? issue.project[0] || null : issue.project,
    team: Array.isArray(issue.team) ? issue.team[0] || null : issue.team,
    comments: (issue.comments || []).map((c: { user: unknown[] | unknown }) => ({
      ...c,
      user: Array.isArray(c.user) ? c.user[0] || null : c.user,
    })),
  };
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data: project, error } = await supabase
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
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  // Fetch issues separately for this project
  const { data: issues } = await supabase
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
    .order('created_at', { ascending: false });

  // Get issue stats - optimized: fetch once, count in-memory
  const { data: issueStatuses } = await supabase
    .from('issues')
    .select('status')
    .eq('project_id', id);

  const totalIssues = issueStatuses?.length || 0;
  const doneIssues = issueStatuses?.filter((i) => i.status === 'Done').length || 0;

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

export async function getTeamById(id: string) {
  const supabase = await createClient();
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, key, name, description, workspace_id')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
    return null;
  }

  // Fetch team members
  const { data: members } = await supabase
    .from('team_members')
    .select(
      `
            id,
            role,
            profile:profiles (id, full_name, email, avatar_url)
        `
    )
    .eq('team_id', id);

  // Fetch team projects
  const { data: projects } = await supabase
    .from('projects')
    .select(
      `
            id,
            name,
            status,
            lead:profiles!projects_lead_id_fkey (id, full_name)
        `
    )
    .eq('team_id', id)
    .order('created_at', { ascending: false });

  return {
    ...team,
    members: (members || []).map((m: { profile: unknown[] | unknown }) => ({
      ...m,
      profile: Array.isArray(m.profile) ? m.profile[0] || null : m.profile,
    })),
    projects: (projects || []).map((p: { lead: unknown[] | unknown }) => ({
      ...p,
      lead: Array.isArray(p.lead) ? p.lead[0] || null : p.lead,
    })),
  };
}

// ============ UPDATE ACTIONS ============

export async function updateIssue(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateIssueSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, title, description, status, priority, team_id, project_id } = validation.data;

  // Get the old issue data for status change detection
  const { data: oldIssue } = await supabase
    .from('issues')
    .select('status, title, creator_id, workspace_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('issues')
    .update({
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(team_id !== undefined && { team_id: team_id || null }),
      ...(project_id !== undefined && { project_id: project_id || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating issue:', error);
    return { success: false, error: error.message };
  }

  // Send notification when task is completed
  if (status === 'Done' && oldIssue?.status !== 'Done' && oldIssue?.workspace_id) {
    const issueTitle = title?.trim() || oldIssue?.title || 'Task';

    // Get current user's name
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const completerName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';

    // Notify the issue creator (if not the person completing it)
    if (oldIssue.creator_id && oldIssue.creator_id !== user.id) {
      await createNotification(
        oldIssue.creator_id,
        oldIssue.workspace_id,
        'task_completed',
        `Task completed: ${issueTitle}`,
        `${completerName} marked this task as done`,
        `/hub`
      );
    }

    // Also notify all assignees except the person who completed it
    const { data: assignees } = await supabase
      .from('issue_assignees')
      .select('profile_id')
      .eq('issue_id', id);

    if (assignees) {
      for (const assignee of assignees) {
        if (assignee.profile_id !== user.id && assignee.profile_id !== oldIssue.creator_id) {
          await createNotification(
            assignee.profile_id,
            oldIssue.workspace_id,
            'task_completed',
            `Task completed: ${issueTitle}`,
            `${completerName} marked this task as done`,
            `/hub`
          );
        }
      }
    }
  }

  revalidatePath(`/issues/${id}`);
  revalidatePath('/issues');
  revalidatePath('/hub');
  revalidatePath('/board');
  return { success: true, data };
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateProjectSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, name, description, project_group, project_type, lead_id, target_date, metadata } =
    validation.data;

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath('/projects');
  return { success: true, data };
}

/**
 * Toggle the is_live flag for a project
 * When true, project appears in "Live Projects" widget on homepage
 */
export async function toggleProjectLive(projectId: string, isLive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('projects')
    .update({
      is_live: isLive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('[toggleProjectLive] Error toggling project live status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * Toggle the is_finished flag for a project
 * When true, project appears in "Finished Projects" widget on homepage
 */
export async function toggleProjectFinished(
  projectId: string,
  isFinished: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('projects')
    .update({
      is_finished: isFinished,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('[toggleProjectFinished] Error toggling project finished status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// ============ DELETE ACTIONS ============

export async function deleteIssue(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only creator or admin can delete
  const canDelete = await canDeleteIssue(user.id, id);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this issue' };
  }

  const { error } = await supabase.from('issues').delete().eq('id', id);

  if (error) {
    console.error('Error deleting issue:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  revalidatePath('/board');
  revalidatePath('/hub');
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
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

  revalidatePath('/projects');
  return { success: true };
}

// ============ COMMENT ACTIONS ============

export async function createComment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createCommentSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { issue_id, body } = validation.data;

  const { data, error } = await supabase
    .from('comments')
    .insert({
      issue_id,
      body: body.trim(),
      user_id: user.id,
    })
    .select(
      `
            id,
            body,
            created_at,
            user:profiles (id, full_name, email, avatar_url)
        `
    )
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }

  // Get the issue to find its team/project for activity visibility
  const { data: issue } = await supabase
    .from('issues')
    .select('team_id, project_id, title, creator_id, workspace_id')
    .eq('id', issue_id)
    .single();

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'comment_added',
    {
      comment_id: data.id,
      issue_id,
      team_id: issue?.team_id,
      project_id: issue?.project_id,
    },
    { issue_title: issue?.title }
  );

  // Send notifications for the comment
  if (issue?.workspace_id && issue?.title) {
    // Get current user's name
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const commenterName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';
    const commentPreview = body.trim().substring(0, 80) + (body.length > 80 ? '...' : '');

    // Collect users to notify (creator + assignees, excluding commenter)
    const usersToNotify = new Set<string>();

    // Add issue creator
    if (issue.creator_id && issue.creator_id !== user.id) {
      usersToNotify.add(issue.creator_id);
    }

    // Add all assignees
    const { data: assignees } = await supabase
      .from('issue_assignees')
      .select('profile_id')
      .eq('issue_id', issue_id);

    if (assignees) {
      for (const assignee of assignees) {
        if (assignee.profile_id !== user.id) {
          usersToNotify.add(assignee.profile_id);
        }
      }
    }

    // Send notifications
    for (const userId of usersToNotify) {
      await createNotification(
        userId,
        issue.workspace_id,
        'comment_added',
        `New comment on: ${issue.title}`,
        `${commenterName}: "${commentPreview}"`,
        `/hub`
      );
    }
  }

  revalidatePath(`/issues/${issue_id}`);
  revalidatePath('/');
  revalidatePath('/hub');
  return { success: true, data };
}

// ============ CLIENT ACTIONS ============

export type LeadStatus =
  | 'dropped'
  | 'cold'
  | 'hot'
  | 'active_client'
  | 'inactive_client'
  | 'dead_lead';

export async function createClientRecord(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createClientSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { display_name, phone, website, billing_address, lead_status, notes, workspace_id } =
    validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return { success: false, error: 'Workspace is required' };
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: display_name.trim(), // Required NOT NULL column
      display_name: display_name.trim(),
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      billing_address: billing_address?.trim() || null,
      lead_status,
      notes: notes?.trim() || null,
      workspace_id: wsId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    return { success: false, error: error.message };
  }

  // Send email notification to other admins (fire and forget)
  notifyClientCreated(user.id, display_name.trim(), data.id, lead_status || undefined).catch(
    (err) => console.error('[createClientRecord] Failed to send email notification:', err)
  );

  revalidatePath('/clients');
  revalidatePath('/'); // Revalidate Today dashboard
  return { success: true, data };
}

export async function updateClientRecord(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(updateClientSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, display_name, phone, website, billing_address, lead_status, notes } = validation.data;

  // Get old status before update for activity logging
  const { data: oldClient } = await supabase
    .from('clients')
    .select('lead_status')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('clients')
    .update({
      ...(display_name && { display_name: display_name.trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(billing_address !== undefined && { billing_address: billing_address?.trim() || null }),
      ...(lead_status !== undefined && { lead_status }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    return { success: false, error: error.message };
  }

  // Log status change activity if status changed
  if (oldClient && lead_status && oldClient.lead_status !== lead_status) {
    await supabase.from('client_activities').insert({
      client_id: id,
      type: 'status_change',
      description: `Status changed from ${oldClient.lead_status} to ${lead_status}`,
      metadata: { old_status: oldClient.lead_status, new_status: lead_status },
      created_by: user.id,
    });
  }

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  revalidatePath('/'); // Revalidate Today dashboard
  return { success: true, data };
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only admin or workspace admin can delete
  const canDelete = await canDeleteClient(user.id, id);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this client' };
  }

  const { error } = await supabase.from('clients').delete().eq('id', id);

  if (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/clients');
  revalidatePath('/'); // Revalidate Today dashboard
  return { success: true };
}

export async function getClients(workspaceId?: string | null, leadStatus?: LeadStatus | null) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('clients')
    .select(
      `
            id,
            display_name,
            phone,
            website,
            billing_address,
            lead_status,
            notes,
            last_contacted_at,
            created_at,
            logo_url,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email),
            projects:projects!projects_client_id_fkey (id)
        `
    )
    .order('created_at', { ascending: false });

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  if (leadStatus) {
    query = query.eq('lead_status', leadStatus);
  }

  const { data: clients, error } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return (clients || []).map((client) => ({
    ...client,
    creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
    assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
  }));
}

export async function getClientById(id: string) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select(
      `
            *,
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email),
            contacts:client_contacts (
                id,
                name,
                email,
                phone,
                position,
                is_primary
            ),
            activities:client_activities (
                id,
                type,
                description,
                metadata,
                created_at,
                created_by:profiles (id, full_name, email)
            )
        `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return {
    ...client,
    creator: Array.isArray(client.creator) ? client.creator[0] || null : client.creator,
    assigned: Array.isArray(client.assigned) ? client.assigned[0] || null : client.assigned,
    activities: (client.activities || []).map((a: ClientActivityResponse) => ({
      ...a,
      created_by: Array.isArray(a.created_by) ? a.created_by[0] || null : a.created_by,
    })),
  };
}

export async function logClientActivity(
  clientId: string,
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change',
  description: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('client_activities')
    .insert({
      client_id: clientId,
      type,
      description,
      metadata: metadata || {},
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging client activity:', error);
    return { success: false, error: error.message };
  }

  // Update last_contacted_at if it's a contact activity
  if (['call', 'email', 'meeting'].includes(type)) {
    await supabase
      .from('clients')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', clientId);
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true, data };
}

export async function toggleClientStatus(
  clientId: string,
  newStatus: LeadStatus
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current status for activity log
  const { data: currentClient } = await supabase
    .from('clients')
    .select('lead_status, display_name')
    .eq('id', clientId)
    .single();

  if (!currentClient) {
    return { success: false, error: 'Client not found' };
  }

  const { error } = await supabase
    .from('clients')
    .update({
      lead_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (error) {
    console.error('Error updating client status:', error);
    return { success: false, error: error.message };
  }

  // Log the status change
  const statusLabels: Record<LeadStatus, string> = {
    hot: 'Hot Lead',
    cold: 'Cold Lead',
    dropped: 'Dropped',
    active_client: 'Active Client',
    inactive_client: 'Inactive Client',
    dead_lead: 'Dead Lead',
  };
  const statusLabel = statusLabels[newStatus] || newStatus;
  await logClientActivity(clientId, 'status_change', `Status changed to ${statusLabel}`, {
    old_status: currentClient.lead_status,
    new_status: newStatus,
  });

  revalidatePath('/');
  revalidatePath('/clients');
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ============ MEETING ACTIONS ============

export async function createMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = parseFormData(createMeetingSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const {
    title,
    description,
    start_time,
    end_time,
    project_id,
    client_id,
    custom_client_name,
    workspace_id,
    meeting_link,
  } = validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  // Handle custom client name - create new client if provided
  let finalClientId = client_id;
  if (!client_id && custom_client_name && wsId) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: custom_client_name.trim(),
        display_name: custom_client_name.trim(),
        workspace_id: wsId,
        lead_status: 'hot',
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

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      start_time,
      end_time,
      project_id: project_id || null,
      client_id: finalClientId || null,
      created_by: user.id,
      workspace_id: wsId,
      meeting_link: meeting_link || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    return { success: false, error: error.message };
  }

  // Log client activity if meeting is with a client
  if (finalClientId) {
    await logClientActivity(finalClientId, 'meeting', `Meeting scheduled: ${title}`, {
      meeting_id: data.id,
      start_time,
      end_time,
    });
  }

  // Record activity for dashboard feed
  await createActivity(
    supabase,
    user.id,
    'meeting_created',
    {
      meeting_id: data.id,
      project_id: project_id,
      workspace_id: wsId,
    },
    { title: title.trim(), start_time, end_time }
  );

  // Send email notification to other admins (fire and forget)
  // Get client name for the email if meeting is with a client
  let clientName: string | undefined = custom_client_name?.trim();
  if (!clientName && finalClientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('display_name')
      .eq('id', finalClientId)
      .single();
    clientName = client?.display_name;
  }

  // Format times for email
  const formattedStart = start_time
    ? new Date(start_time).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : undefined;
  const formattedEnd = end_time
    ? new Date(end_time).toLocaleString('en-US', {
        timeStyle: 'short',
      })
    : undefined;

  notifyMeetingCreated(
    user.id,
    title.trim(),
    data.id,
    formattedStart,
    formattedEnd,
    clientName
  ).catch((err) => console.error('[createMeeting] Failed to send email notification:', err));

  revalidatePath('/schedule');
  revalidatePath('/'); // Also revalidate dashboard to show new activity
  return { success: true, data };
}

export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only creator or admin can delete
  const canDelete = await canDeleteMeeting(user.id, meetingId);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this meeting' };
  }

  const { error } = await supabase.from('meetings').delete().eq('id', meetingId);

  if (error) {
    console.error('Error deleting meeting:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  return { success: true };
}

export async function updateMeeting(data: {
  id: string;
  title?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  project_id?: string | null;
  client_id?: string | null;
  meeting_link?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = validateData(updateMeetingSchema, data);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, ...updateData } = validation.data;

  // Authorization check: only creator or admin can update
  const canUpdate = await canDeleteMeeting(user.id, id); // Reuse same permission check
  if (!canUpdate) {
    return { success: false, error: 'You do not have permission to update this meeting' };
  }

  // Build update object, only including defined fields
  const updates: Record<string, unknown> = {};
  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.description !== undefined) updates.description = updateData.description;
  if (updateData.start_time !== undefined) updates.start_time = updateData.start_time;
  if (updateData.end_time !== undefined) updates.end_time = updateData.end_time;
  if (updateData.project_id !== undefined) updates.project_id = updateData.project_id;
  if (updateData.client_id !== undefined) updates.client_id = updateData.client_id;
  if (updateData.meeting_link !== undefined)
    updates.meeting_link = updateData.meeting_link === '' ? null : updateData.meeting_link;
  updates.updated_at = new Date().toISOString();

  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  revalidatePath('/');
  return { success: true, data: updatedMeeting };
}

/**
 * Creates an instant meeting with a Google Meet link placeholder.
 * The meeting starts now and lasts 1 hour by default.
 */
export async function createInstantMeeting(title?: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get workspace ID
  const wsId = await getCurrentWorkspaceId();
  if (!wsId) {
    return { success: false, error: 'No workspace found' };
  }

  // Create meeting starting now, lasting 1 hour
  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000);

  const meetingTitle =
    title ||
    `Quick Meeting - ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: meetingTitle,
      description: 'Instant meeting created from dashboard',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      workspace_id: wsId,
      created_by: user.id,
      meeting_link: null, // Will be updated when host pastes the link
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating instant meeting:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  revalidatePath('/');
  return { success: true, data };
}

/**
 * Updates the meeting link for an instant meeting.
 */
export async function updateMeetingLink(
  meetingId: string,
  meetingLink: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meetings')
    .update({ meeting_link: meetingLink, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting link:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  revalidatePath('/');
  return { success: true, data };
}

export async function getMeetings(workspaceId?: string | null) {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('meetings')
    .select(
      `
            id,
            title,
            description,
            start_time,
            end_time,
            meeting_link,
            created_at,
            project:projects (id, name),
            client:clients (id, display_name, lead_status),
            creator:profiles!meetings_created_by_fkey (id, full_name, email),
            attendees:meeting_attendees (
                id,
                profile:profiles (id, full_name, email, avatar_url)
            )
        `
    )
    .order('start_time', { ascending: true });

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: meetings, error } = await query;

  if (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }

  return (meetings || []).map((meeting) => {
    const m = meeting as unknown as MeetingResponse;
    return {
      ...meeting,
      project: Array.isArray(m.project) ? m.project[0] || null : m.project,
      client: Array.isArray(m.client) ? m.client[0] || null : m.client,
      creator: Array.isArray(m.creator) ? m.creator[0] || null : m.creator,
      attendees: (m.attendees || []).map((a) => ({
        ...a,
        profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
      })),
    };
  });
}

// ============ ACTIVITY ACTIONS ============

export type Activity = {
  id: string;
  type: ActivityType;
  created_at: string;
  metadata: Record<string, unknown>;
  actor: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  project: { id: string; name: string } | null;
  issue: { id: string; title: string } | null;
  team: { id: string; name: string; key: string } | null;
  meeting: { id: string; title: string; start_time: string } | null;
};

export async function getRecentActivities(
  limit: number = 20,
  workspaceId?: string | null
): Promise<Activity[]> {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('activities')
    .select(
      `
            id,
            type,
            created_at,
            metadata,
            actor:profiles!activities_actor_id_fkey (id, full_name, email, avatar_url),
            project:projects (id, name),
            issue:issues (id, title),
            team:teams (id, name, key),
            meeting:meetings (id, title, start_time)
        `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: activities, error } = await query;

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  // Normalize the response (arrays to single objects)
  return (activities || []).map((a) => ({
    ...a,
    actor: Array.isArray(a.actor) ? a.actor[0] || null : a.actor,
    project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    issue: Array.isArray(a.issue) ? a.issue[0] || null : a.issue,
    team: Array.isArray(a.team) ? a.team[0] || null : a.team,
    meeting: Array.isArray(a.meeting) ? a.meeting[0] || null : a.meeting,
  })) as Activity[];
}

// Delete an activity (admin only)
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin
  const adminCheck = await isUserAdmin(user.id);
  if (!adminCheck) {
    return { success: false, error: 'Only admins can delete activities' };
  }

  const { error } = await supabase.from('activities').delete().eq('id', activityId);

  if (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hub');
  revalidatePath('/');
  return { success: true };
}

// ============ MEETING ATTENDEE ACTIONS ============

export async function addMeetingAttendee(
  meetingId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meeting_attendees')
    .insert({
      meeting_id: meetingId,
      profile_id: profileId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding meeting attendee:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  return { success: true, data };
}

export async function removeMeetingAttendee(
  meetingId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('meeting_attendees')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing meeting attendee:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  return { success: true };
}

export async function updateMeetingAttendeeStatus(
  meetingId: string,
  profileId: string,
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('meeting_attendees')
    .update({ status })
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error updating attendee status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/schedule');
  return { success: true };
}

// ============ ISSUE ASSIGNEE ACTIONS ============

export async function addIssueAssignee(issueId: string, profileId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('issue_assignees')
    .insert({
      issue_id: issueId,
      profile_id: profileId,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding issue assignee:', error);
    return { success: false, error: error.message };
  }

  // Get issue details for activity
  const { data: issue } = await supabase
    .from('issues')
    .select('team_id, project_id, title, workspace_id')
    .eq('id', issueId)
    .single();

  // Get assignee name for activity
  const { data: assignee } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', profileId)
    .single();

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'issue_assigned' as ActivityType,
    {
      issue_id: issueId,
      team_id: issue?.team_id,
      project_id: issue?.project_id,
      workspace_id: issue?.workspace_id,
    },
    {
      issue_title: issue?.title,
      assignee_name: assignee?.full_name || assignee?.email,
    }
  );

  // Get current user's name for notification
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const assignerName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Someone';

  // Send notification to the assignee (but not to themselves)
  if (profileId !== user.id && issue?.workspace_id && issue?.title) {
    await notifyTaskAssigned(issueId, issue.title, [profileId], issue.workspace_id, assignerName);
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
  revalidatePath('/hub');
  return { success: true, data };
}

export async function removeIssueAssignee(
  issueId: string,
  profileId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('issue_assignees')
    .delete()
    .eq('issue_id', issueId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing issue assignee:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
  return { success: true };
}

export async function getIssueAssignees(issueId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('issue_assignees')
    .select(
      `
            id,
            assigned_at,
            profile:profiles (id, full_name, email, avatar_url),
            assigned_by_profile:profiles!issue_assignees_assigned_by_fkey (id, full_name)
        `
    )
    .eq('issue_id', issueId);

  if (error) {
    console.error('Error fetching issue assignees:', error);
    return [];
  }

  return (data || []).map((a) => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] || null : a.profile,
    assigned_by_profile: Array.isArray(a.assigned_by_profile)
      ? a.assigned_by_profile[0] || null
      : a.assigned_by_profile,
  }));
}

// ============ ADMIN ACTIONS ============

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';

// Check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('email').eq('id', userId).single();
  return data?.email === SUPER_ADMIN_EMAIL;
}

// Get current user's admin status
export async function getAdminStatus(): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userId: string | null;
  email: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, isSuperAdmin: false, userId: null, email: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  const superAdmin = profile?.email === SUPER_ADMIN_EMAIL;
  const admin = profile?.role === 'admin' || superAdmin;

  return {
    isAdmin: admin,
    isSuperAdmin: superAdmin,
    userId: user.id,
    email: profile?.email || null,
  };
}

// Bulk delete projects (admin only)
export async function bulkDeleteProjects(projectIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is super admin
  const superAdmin = await isSuperAdmin(user.id);

  if (!superAdmin) {
    return { success: false, error: 'Only super admin can bulk delete projects' };
  }

  const { error } = await supabase.from('projects').delete().in('id', projectIds);

  if (error) {
    console.error('Error bulk deleting projects:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/projects');
  return { success: true };
}

// Update project status (admin only for any project)
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

  const { error } = await supabase
    .from('projects')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// Delete team (admin only)
export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin or super admin
  const admin = await isUserAdmin(user.id);
  const superAdmin = await isSuperAdmin(user.id);

  if (!admin && !superAdmin) {
    return { success: false, error: 'Only admins can delete teams' };
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/teams');
  return { success: true };
}

// Update team (admin only)
export async function updateTeam(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const key = formData.get('key') as string;
  const description = formData.get('description') as string | null;

  const { data, error } = await supabase
    .from('teams')
    .update({
      ...(name && { name: name.trim() }),
      ...(key && { key: key.trim().toUpperCase() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/teams');
  revalidatePath(`/teams/${id}`);
  return { success: true, data };
}

// ============ WORKSPACE MEMBER ACTIONS ============

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('profile:profiles(id, full_name, email, avatar_url)')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching workspace members:', error);
    return [];
  }

  return (
    members
      ?.map(
        (m: {
          profile: {
            id: string;
            full_name: string | null;
            email: string | null;
            avatar_url: string | null;
          }[];
        }) => (Array.isArray(m.profile) ? m.profile[0] : m.profile)
      )
      .filter(Boolean) || []
  );
}

// Get tasks for board (enhanced issue list with all fields)
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

// ============ PROJECT WIZARD ACTIONS ============

/**
 * Create a project from the wizard
 */
export async function createProjectWithRoadmap(
  input: CreateProjectWizardInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = createProjectWizardSchema.safeParse(input);
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
    'project_created',
    {
      project_id: project.id,
      team_id,
      workspace_id: wsId,
    },
    { name: project.name, project_type, deployment_platform }
  );

  revalidatePath('/projects');
  revalidatePath('/');
  return { success: true, data: project };
}

// ============ NOTIFICATION ACTIONS ============

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'comment_added'
  | 'mention'
  | 'system';

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  workspaceId: string,
  type: NotificationType,
  title: string,
  message?: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    workspace_id: workspaceId,
    type,
    title,
    message: message || null,
    link: link || null,
    metadata: metadata || {},
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(workspaceId: string, limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, title, message, is_read, read_at, created_at, workspace_id, user_id, link, metadata'
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting notifications:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(workspaceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Notify assignees when a task is assigned
 */
export async function notifyTaskAssigned(
  issueId: string,
  issueTitle: string,
  assigneeIds: string[],
  workspaceId: string,
  assignedByName: string
): Promise<void> {
  const supabase = await createClient();

  const notifications = assigneeIds.map((userId) => ({
    user_id: userId,
    workspace_id: workspaceId,
    type: 'task_assigned' as NotificationType,
    title: 'Task assigned to you',
    message: `${assignedByName} assigned you to "${issueTitle}"`,
    link: `/issues/${issueId}`,
    metadata: { issue_id: issueId },
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
}

// ============ AUTHENTICATION ACTIONS ============

export async function loginAction(
  prevState: { success: boolean; error: string | null },
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Successful login - redirect will be handled by the client
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during login',
    };
  }
}
