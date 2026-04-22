'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isUserAdmin, isUserManagerOrAbove, type ActionResult } from './shared';
import type { Database } from '@/types/database';

type UserRole = Database['public']['Enums']['user_role'];

export type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  created_at: string | null;
};

// Get all team members (admin/manager only)
export async function getTeamMembers(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserManagerOrAbove(user.id))) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at')
    .in('role', ['admin', 'employee'])
    .order('created_at');

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// Update user role (admin only)
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can change roles' };
  }

  // Prevent self-demotion
  if (targetUserId === user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }

  // Only allow valid internal roles
  if (!['admin', 'employee'].includes(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/team');
  return { success: true };
}

// Invite a new team member (admin only)
export async function inviteTeamMember(
  email: string,
  fullName: string,
  role: UserRole,
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can invite members' };
  }

  if (!['admin', 'employee'].includes(role)) {
    return { success: false, error: 'Invalid role' };
  }

  // Create auth user via admin API (needs service role key)
  const adminClient = createAdminClient();
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) return { success: false, error: authError.message };

  // Update profile with role and name
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role, full_name: fullName })
    .eq('id', newUser.user.id);

  if (profileError) return { success: false, error: profileError.message };

  revalidatePath('/admin');
  revalidatePath('/team');
  return { success: true, data: { id: newUser.user.id, email } };
}

// Remove team member (admin only).
// Bans auth, removes workspace memberships, and removes any team memberships —
// so the person actually disappears from Team Management + Team Status lists.
export async function removeTeamMember(targetUserId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can remove members' };
  }

  if (targetUserId === user.id) {
    return { success: false, error: 'Cannot remove yourself' };
  }

  const adminClient = createAdminClient();

  // 1. Ban the auth user (prevents login).
  const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: '876000h', // ~100 years
  });
  if (banError) return { success: false, error: banError.message };

  // 2. Remove workspace memberships so they disappear from team lists.
  const { error: wmError } = await adminClient
    .from('workspace_members')
    .delete()
    .eq('profile_id', targetUserId);
  if (wmError) return { success: false, error: wmError.message };

  // 3. Remove team memberships (soft references — don't fail if none exist).
  await adminClient.from('team_members').delete().eq('profile_id', targetUserId);

  revalidatePath('/admin');
  revalidatePath('/team');
  return { success: true };
}
