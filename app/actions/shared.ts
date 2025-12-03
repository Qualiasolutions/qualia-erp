'use server';

import { createClient } from '@/lib/supabase/server';

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

// For Supabase responses where FK can be array or single object
export type FKResponse<T> = T | T[] | null;

// Normalize FK response (Supabase can return array or single object)
export function normalizeFKResponse<T>(response: FKResponse<T>): T | null {
  if (Array.isArray(response)) {
    return response[0] || null;
  }
  return response;
}

// ============ AUTHORIZATION HELPERS ============

// Check if user is an admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
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

// Check if user can delete a meeting (creator or admin)
export async function canDeleteMeeting(userId: string, meetingId: string): Promise<boolean> {
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

  const projectData = Array.isArray(phase?.project) ? phase.project[0] : phase?.project;
  return (projectData as { lead_id: string } | null)?.lead_id === userId;
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

  // Handle nested FK array normalization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phaseData = Array.isArray(item?.phase) ? item.phase[0] : (item?.phase as any);
  const projectData = Array.isArray(phaseData?.project) ? phaseData.project[0] : phaseData?.project;
  return projectData?.lead_id === userId;
}
