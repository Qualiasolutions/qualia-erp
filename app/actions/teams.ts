'use server';

import { createClient } from '@/lib/supabase/server';

import { parseFormData, createTeamSchema } from '@/lib/validation';
import { getCurrentWorkspaceId } from './workspace';
import { createActivity, isUserAdmin, type ActionResult, type ActivityType } from './shared';

// ============ TEAM ACTIONS ============

/**
 * Create a new team
 */
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
    'team_created' as ActivityType,
    { team_id: team.id, workspace_id: wsId },
    { name: team.name, key: team.key }
  );

  return { success: true, data: team };
}

/**
 * Get all teams for a workspace
 */
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

/**
 * Get a team by ID with members and projects
 */
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

/**
 * Update a team (admin only)
 */
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

  return { success: true, data };
}

/**
 * Delete a team (admin only)
 */
export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can delete teams' };
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
