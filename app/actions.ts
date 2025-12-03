'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  parseFormData,
  createIssueSchema,
  updateIssueSchema,
  createProjectSchema,
  updateProjectSchema,
  createTeamSchema,
  createClientSchema,
  updateClientSchema,
  createMeetingSchema,
  createPhaseSchema,
  updatePhaseSchema,
  createPhaseItemSchema,
  updatePhaseItemSchema,
  createCommentSchema,
} from '@/lib/validation';
import { getPhaseTemplates, type ProjectType } from '@/lib/phase-templates';

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

// Phase item from Supabase response
type PhaseItemResponse = {
  id: string;
  title: string;
  description: string | null;
  helper_text: string | null;
  display_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  linked_issue_id: string | null;
  template_key: string | null;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
  linked_issue?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  completed_by_profile?: ProfileRef;
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

// Check if user can delete a project phase (project lead or admin)
async function canDeletePhase(userId: string, phaseId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: phase } = await supabase
    .from('project_phases')
    .select('project:projects(lead_id)')
    .eq('id', phaseId)
    .single();

  const projectData = Array.isArray(phase?.project) ? phase.project[0] : phase?.project;
  return (projectData as { lead_id: string } | null)?.lead_id === userId;
}

// Check if user can delete a phase item (project lead or admin)
async function canDeletePhaseItem(userId: string, itemId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('phase_items')
    .select('phase:project_phases(project:projects(lead_id))')
    .eq('id', itemId)
    .single();

  // Handle nested FK array normalization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phaseData = Array.isArray(item?.phase) ? item.phase[0] : (item?.phase as any);
  const projectData = Array.isArray(phaseData?.project) ? phaseData.project[0] : phaseData?.project;
  return projectData?.lead_id === userId;
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

  const { title, description, status, priority, team_id, project_id, workspace_id } =
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
    .from('issues')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority,
      team_id: team_id || null,
      project_id: project_id || null,
      creator_id: user.id,
      workspace_id: wsId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating issue:', error);
    return { success: false, error: error.message };
  }

  // Record activity
  await createActivity(
    supabase,
    user.id,
    'issue_created',
    {
      issue_id: data.id,
      team_id: team_id,
      project_id: project_id,
      workspace_id: wsId,
    },
    { title: data.title, priority: data.priority }
  );

  revalidatePath('/issues');
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

  // Business rule: project group is required
  if (!project_group) {
    return { success: false, error: 'Project group is required' };
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

export async function getProfiles() {
  const supabase = await createClient();
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

  // Get issue stats
  const { count: totalIssues } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id);

  const { count: doneIssues } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('status', 'Done');

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
  const { data: team, error } = await supabase.from('teams').select('*').eq('id', id).single();

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

  revalidatePath(`/issues/${id}`);
  revalidatePath('/issues');
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

  const { id, name, description, project_group, lead_id, team_id, target_date } = validation.data;

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(project_group !== undefined && { project_group: project_group || null }),
      ...(lead_id !== undefined && { lead_id: lead_id || null }),
      ...(team_id !== undefined && { team_id: team_id || null }),
      ...(target_date !== undefined && { target_date: target_date || null }),
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
    .select('team_id, project_id, title')
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

  revalidatePath(`/issues/${issue_id}`);
  revalidatePath('/');
  return { success: true, data };
}

// ============ CLIENT ACTIONS ============

export type LeadStatus = 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client';

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

  revalidatePath('/clients');
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
            creator:profiles!clients_created_by_fkey (id, full_name, email),
            assigned:profiles!clients_assigned_to_fkey (id, full_name, email)
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
  newStatus: 'active_client' | 'inactive_client'
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
  const statusLabel = newStatus === 'active_client' ? 'Active' : 'Inactive';
  await logClientActivity(clientId, 'status_change', `Status changed to ${statusLabel}`, {
    old_status: currentClient.lead_status,
    new_status: newStatus,
  });

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

  const { title, description, start_time, end_time, project_id, client_id, workspace_id } =
    validation.data;

  // Get workspace ID from form or from user's default
  let wsId = workspace_id;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      start_time,
      end_time,
      project_id: project_id || null,
      client_id: client_id || null,
      created_by: user.id,
      workspace_id: wsId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting:', error);
    return { success: false, error: error.message };
  }

  // Log client activity if meeting is with a client
  if (client_id) {
    await logClientActivity(client_id, 'meeting', `Meeting scheduled: ${title}`, {
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

  revalidatePath(`/issues/${issueId}`);
  revalidatePath('/issues');
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

// ============ PROJECT PHASES (ROADMAP) ============

// Get phases for a project with items
export async function getProjectPhases(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_phases')
    .select(
      `
            *,
            items:phase_items(
                *,
                linked_issue:issues(id, title, status, priority),
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
    const items = (phase.items || []) as PhaseItemResponse[];
    const completed = items.filter((i) => i.is_completed).length;
    const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

    return {
      ...phase,
      progress,
      items: items.map((item) => ({
        ...item,
        linked_issue: Array.isArray(item.linked_issue)
          ? item.linked_issue[0] || null
          : item.linked_issue,
        completed_by_profile: Array.isArray(item.completed_by_profile)
          ? item.completed_by_profile[0] || null
          : item.completed_by_profile,
      })),
    };
  });
}

// Initialize phases from template for a project
export async function initializeProjectPhases(
  projectId: string,
  projectType: ProjectType
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get workspace for this project
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single();

  if (!project?.workspace_id) {
    return { success: false, error: 'Project workspace not found' };
  }

  // Check if phases already exist
  const { count } = await supabase
    .from('project_phases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (count && count > 0) {
    return { success: false, error: 'Phases already exist for this project' };
  }

  // Get templates
  const templates = getPhaseTemplates(projectType);
  if (templates.length === 0) {
    return { success: false, error: 'No templates found for this project type' };
  }

  // Create phases and items
  for (let phaseIndex = 0; phaseIndex < templates.length; phaseIndex++) {
    const template = templates[phaseIndex];

    const { data: phase, error: phaseError } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        workspace_id: project.workspace_id,
        name: template.name,
        description: template.description || null,
        helper_text: template.helperText || null,
        display_order: phaseIndex,
        template_key: template.templateKey,
        is_custom: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (phaseError || !phase) {
      console.error('Error creating phase:', phaseError);
      continue;
    }

    // Create items for this phase
    const itemsToInsert = template.items.map((item, itemIndex) => ({
      phase_id: phase.id,
      title: item.title,
      description: item.description || null,
      helper_text: item.helperText || null,
      display_order: itemIndex,
      template_key: item.templateKey,
      is_custom: false,
    }));

    const { error: itemsError } = await supabase.from('phase_items').insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating phase items:', itemsError);
    }
  }

  // Update project type if not set
  if (projectType) {
    await supabase.from('projects').update({ project_type: projectType }).eq('id', projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/roadmap`);
  return { success: true };
}

// Create a custom phase
export async function createPhase(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = parseFormData(createPhaseSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { data, error } = await supabase
    .from('project_phases')
    .insert({
      ...validation.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${validation.data.project_id}`);
  revalidatePath(`/projects/${validation.data.project_id}/roadmap`);
  return { success: true, data };
}

// Update a phase
export async function updatePhase(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = parseFormData(updatePhaseSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, ...updates } = validation.data;

  const { data, error } = await supabase
    .from('project_phases')
    .update(updates)
    .eq('id', id)
    .select('project_id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${data.project_id}`);
  revalidatePath(`/projects/${data.project_id}/roadmap`);
  return { success: true };
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

  // Authorization check: only project lead or admin can delete phases
  const canDelete = await canDeletePhase(user.id, phaseId);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this phase' };
  }

  // Get project_id before deleting
  const { data: phase } = await supabase
    .from('project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .single();

  const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (phase) {
    revalidatePath(`/projects/${phase.project_id}`);
    revalidatePath(`/projects/${phase.project_id}/roadmap`);
  }
  return { success: true };
}

// Create a phase item
export async function createPhaseItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = parseFormData(createPhaseItemSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { data, error } = await supabase
    .from('phase_items')
    .insert(validation.data)
    .select('*, phase:project_phases(project_id)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const projectId = (data.phase as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/roadmap`);
  }
  return { success: true, data };
}

// Toggle item completion
export async function togglePhaseItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current state
  const { data: item } = await supabase
    .from('phase_items')
    .select('is_completed, phase:project_phases(project_id)')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { success: false, error: 'Item not found' };
  }

  const newCompleted = !item.is_completed;

  const { error } = await supabase
    .from('phase_items')
    .update({
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      completed_by: newCompleted ? user.id : null,
    })
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(item.phase) ? item.phase[0] : item.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/roadmap`);
  }
  return { success: true };
}

// Update a phase item
export async function updatePhaseItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = parseFormData(updatePhaseItemSchema, formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { id, is_completed, ...updates } = validation.data;

  // Handle completion separately to track who/when
  const updateData: Record<string, unknown> = { ...updates };

  if (is_completed !== undefined) {
    updateData.is_completed = is_completed;
    updateData.completed_at = is_completed ? new Date().toISOString() : null;
    updateData.completed_by = is_completed ? user.id : null;
  }

  const { data, error } = await supabase
    .from('phase_items')
    .update(updateData)
    .eq('id', id)
    .select('phase:project_phases(project_id)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(data.phase) ? data.phase[0] : data.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/roadmap`);
  }
  return { success: true };
}

// Delete a phase item
export async function deletePhaseItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Authorization check: only project lead or admin can delete phase items
  const canDelete = await canDeletePhaseItem(user.id, itemId);
  if (!canDelete) {
    return { success: false, error: 'You do not have permission to delete this item' };
  }

  // Get project_id before deleting
  const { data: item } = await supabase
    .from('phase_items')
    .select('phase:project_phases(project_id)')
    .eq('id', itemId)
    .single();

  const { error } = await supabase.from('phase_items').delete().eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(item?.phase) ? item.phase[0] : item?.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/roadmap`);
  }
  return { success: true };
}

// Link an issue to a phase item
export async function linkIssueToPhaseItem(
  itemId: string,
  issueId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('phase_items')
    .update({ linked_issue_id: issueId })
    .eq('id', itemId)
    .select('phase:project_phases(project_id)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const phaseData = Array.isArray(data.phase) ? data.phase[0] : data.phase;
  const projectId = (phaseData as { project_id: string } | null)?.project_id;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/roadmap`);
  }
  return { success: true };
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

// Move project to a different group (admin only)
export async function moveProjectToGroup(
  projectId: string,
  newGroup: string
): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can move projects between groups' };
  }

  const { error } = await supabase
    .from('projects')
    .update({
      project_group: newGroup,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error moving project:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// Bulk move projects (admin only)
export async function bulkMoveProjects(
  projectIds: string[],
  newGroup: string
): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can bulk move projects' };
  }

  const { error } = await supabase
    .from('projects')
    .update({
      project_group: newGroup,
      updated_at: new Date().toISOString(),
    })
    .in('id', projectIds);

  if (error) {
    console.error('Error bulk moving projects:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/projects');
  return { success: true };
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
