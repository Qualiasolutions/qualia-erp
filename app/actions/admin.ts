'use server';

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
    .in('role', ['admin', 'manager', 'employee'])
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
  if (!['admin', 'manager', 'employee'].includes(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) return { success: false, error: error.message };
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

  if (!['admin', 'manager', 'employee'].includes(role)) {
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

  return { success: true, data: { id: newUser.user.id, email } };
}

// Remove team member (admin only — deactivates, doesn't delete)
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

  // Ban user from auth (soft disable — needs service role key)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: '876000h', // ~100 years
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
