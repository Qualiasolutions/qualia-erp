'use server';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { normalizeFKResponse, type FKResponse } from '@/lib/server-utils';

// Type alias for the Supabase client return type
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

// Activity types that match the database enum
export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'issue_created'
  | 'issue_updated'
  | 'issue_completed'
  | 'comment_added'
  | 'team_created'
  | 'member_added'
  | 'meeting_created';

// Profile type for foreign key relations
export type ProfileRef = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
} | null;

// ============ AUTHORIZATION HELPERS ============

/**
 * Cached per-request role lookup — calling this multiple times in one request
 * only queries the DB once thanks to React's cache() deduplication.
 */
const getCachedUserRole = cache(async (userId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role || null;
});

// Check if user is an admin (owner)
export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getCachedUserRole(userId);
  return role === 'admin';
}

// Check if user is manager or above (manager + admin)
export async function isUserManagerOrAbove(userId: string): Promise<boolean> {
  const role = await getCachedUserRole(userId);
  return role === 'admin' || role === 'manager';
}

// Get user's role
export async function getUserRole(userId: string): Promise<string | null> {
  return getCachedUserRole(userId);
}

// Check if user can delete an issue (creator or admin)
export async function canDeleteIssue(userId: string, issueId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase.from('issues').select('creator_id').eq('id', issueId).single();

  return data?.creator_id === userId;
}

// Check if user can delete a project (lead or admin)
export async function canDeleteProject(userId: string, projectId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('lead_id').eq('id', projectId).single();

  return data?.lead_id === userId;
}

// Check if user can delete a meeting (creator, manager, or admin)
export async function canDeleteMeeting(userId: string, meetingId: string): Promise<boolean> {
  if (await isUserManagerOrAbove(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('meetings')
    .select('created_by')
    .eq('id', meetingId)
    .single();

  return data?.created_by === userId;
}

// Check if user can delete a client (admin or workspace admin)
export async function canDeleteClient(userId: string, clientId: string): Promise<boolean> {
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
export async function canDeletePhase(userId: string, phaseId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: phase } = await supabase
    .from('project_phases')
    .select('project:projects(lead_id)')
    .eq('id', phaseId)
    .single();

  const projectData = normalizeFKResponse(phase?.project as FKResponse<{ lead_id: string }>);
  return projectData?.lead_id === userId;
}

// Check if user can delete a phase item (project lead or admin)
export async function canDeletePhaseItem(userId: string, itemId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('phase_items')
    .select('phase:project_phases(project:projects(lead_id))')
    .eq('id', itemId)
    .single();

  // Handle nested FK array normalization - Supabase returns ambiguous types for nested relations
  const phaseData = normalizeFKResponse(
    item?.phase as FKResponse<{ project: FKResponse<{ lead_id: string }> }>
  );
  const projectData = normalizeFKResponse(phaseData?.project as FKResponse<{ lead_id: string }>);
  return projectData?.lead_id === userId;
}

// ============ TASK AUTHORIZATION HELPERS ============

// Check if user can modify a task (creator, assignee, project lead, or admin)
export async function canModifyTask(userId: string, taskId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id, assignee_id, project:projects(lead_id)')
    .eq('id', taskId)
    .single();

  if (!task) return false;

  // Creator can modify
  if (task.creator_id === userId) return true;

  // Assignee can modify
  if (task.assignee_id === userId) return true;

  // Project lead can modify
  const project = Array.isArray(task.project) ? task.project[0] : task.project;
  if (project?.lead_id === userId) return true;

  return false;
}

// ============ PROJECT FILE AUTHORIZATION HELPERS ============

// Check if user can access a project (workspace member)
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();

  // Get project's workspace
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single();

  if (!project?.workspace_id) return false;

  // Check if user is a member of the workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', project.workspace_id)
    .eq('profile_id', userId)
    .single();

  return !!membership;
}

// Check if user can delete a project file (uploader, project lead, or admin)
export async function canDeleteProjectFile(userId: string, fileId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data: file } = await supabase
    .from('project_files')
    .select('uploaded_by, project:projects(lead_id)')
    .eq('id', fileId)
    .single();

  if (!file) return false;

  // Uploader can delete
  if (file.uploaded_by === userId) return true;

  // Project lead can delete
  const project = Array.isArray(file.project) ? file.project[0] : file.project;
  if (project?.lead_id === userId) return true;

  return false;
}

// ============ ACTIVITY LOGGING HELPERS ============

/**
 * Helper to create activity records (used by multiple domain modules)
 */
export async function createActivity(
  supabase: SupabaseClientType,
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
