'use server';

import { cache } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';
import { isUserAdmin } from './shared';

// ============ WORKSPACE HELPERS ============

/**
 * Request-scoped memoized workspace id lookup. OPTIMIZE.md M17: this is called
 * 52× across 16 action files per render. React.cache() deduplicates within a
 * single request so parallel actions share one auth+workspace_members roundtrip.
 *
 * The function is parameterless, so every caller in the same request hits the
 * same cache entry.
 */
const getCachedCurrentWorkspaceId = cache(async (): Promise<string | null> => {
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
});

/**
 * Get current user's default workspace ID. Memoized per-request via React.cache().
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  return getCachedCurrentWorkspaceId();
}

/**
 * Get current user profile with role
 */
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

/**
 * Get all workspaces (for admin management)
 */
export async function getWorkspaces() {
  const supabase = await createClient();
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, description')
    .order('name');
  return workspaces || [];
}

/**
 * Get user's workspace memberships with access info
 */
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

/**
 * Set user's default workspace
 */
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

  return { success: true };
}

/**
 * Create a new workspace (admin only)
 */
export async function createWorkspace(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can create workspaces' };
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

  // 1. Create workspace (uses authenticated client)
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

  // 2. Use admin client for membership insert to bypass RLS
  const adminClient = createAdminClient();

  // 3. Check if user already has a default workspace
  const { data: existingDefaults } = await adminClient
    .from('workspace_members')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .limit(1);

  const isFirstWorkspace = !existingDefaults || existingDefaults.length === 0;

  // 4. Insert membership — set is_default if this is user's first workspace
  const { error: memberError } = await adminClient.from('workspace_members').insert({
    workspace_id: data.id,
    profile_id: user.id,
    role: 'owner',
    is_default: isFirstWorkspace,
  });

  // 5. If membership insert fails, rollback workspace and return error
  if (memberError) {
    console.error('Error adding workspace membership:', memberError);
    // Rollback: delete the workspace we just created
    await adminClient.from('workspaces').delete().eq('id', data.id);
    return {
      success: false,
      error: 'Failed to create workspace membership. Workspace has been rolled back.',
    };
  }

  return { success: true, data };
}

/**
 * Add a member to a workspace
 */
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

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can manage workspace members' };
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

/**
 * Remove a member from a workspace
 */
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

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can manage workspace members' };
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

/**
 * Get workspace members
 */
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
