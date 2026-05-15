'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isUserAdmin, type ActionResult } from './shared';
import { validateData } from '@/lib/validation';
import type { Database } from '@/types/database';

type UserRole = Database['public']['Enums']['user_role'];

// ============ ZOD SCHEMAS ============

const updateUserRoleSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
  newRole: z.enum(['admin', 'employee'] as const, {
    message: 'Role must be admin or employee',
  }),
});

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address').trim(),
  fullName: z.string().min(1, 'Full name is required').max(200),
  role: z.enum(['admin', 'employee'] as const, {
    message: 'Role must be admin or employee',
  }),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const targetUserIdSchema = z.string().uuid('Invalid user ID');

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

  if (!(await isUserAdmin(user.id))) {
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
  const parsed = validateData(updateUserRoleSchema, { targetUserId, newRole });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can change roles' };
  }

  // Prevent self-demotion
  if (parsed.data.targetUserId === user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ role: parsed.data.newRole })
    .eq('id', parsed.data.targetUserId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!updated) return { success: false, error: 'User not found or update blocked by RLS' };

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
  const parsed = validateData(inviteTeamMemberSchema, { email, fullName, role, password });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can invite members' };
  }

  // Create auth user via admin API (needs service role key)
  const adminClient = createAdminClient();
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (authError) return { success: false, error: authError.message };

  // Update profile with role and name
  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .update({ role: parsed.data.role, full_name: parsed.data.fullName })
    .eq('id', newUser.user.id)
    .select()
    .single();

  if (profileError) return { success: false, error: profileError.message };
  if (!updatedProfile)
    return { success: false, error: 'Profile update blocked — RLS may be misconfigured' };

  revalidatePath('/admin');
  revalidatePath('/team');
  return { success: true, data: { id: newUser.user.id, email: parsed.data.email } };
}

// Remove team member (admin only).
// Bans auth, removes workspace memberships, and removes any team memberships —
// so the person actually disappears from Team Management + Team Status lists.
export async function removeTeamMember(targetUserId: string): Promise<ActionResult> {
  const parsed = validateData(targetUserIdSchema, targetUserId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins can remove members' };
  }

  if (parsed.data === user.id) {
    return { success: false, error: 'Cannot remove yourself' };
  }

  const adminClient = createAdminClient();

  // 1. Ban the auth user (prevents login).
  const { error: banError } = await adminClient.auth.admin.updateUserById(parsed.data, {
    ban_duration: '876000h', // ~100 years
  });
  if (banError) return { success: false, error: banError.message };

  // 2. Remove workspace memberships so they disappear from team lists.
  // Admin client bypasses RLS — .select() ensures we detect zero-row deletes.
  const { error: wmError } = await adminClient
    .from('workspace_members')
    .delete()
    .eq('profile_id', parsed.data)
    .select();
  if (wmError) return { success: false, error: wmError.message };

  // 3. Remove team memberships (soft references — don't fail if none exist).
  await adminClient.from('team_members').delete().eq('profile_id', parsed.data).select();

  revalidatePath('/admin');
  revalidatePath('/team');
  return { success: true };
}
