'use server';

import { createClient } from '@/lib/supabase/server';

// ============ AUTHENTICATION ACTIONS ============

/**
 * Login action for form handling
 */
export async function loginAction(
  _prevState: { success: boolean; error: string | null },
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

/**
 * Get current user's admin status
 */
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

  const SUPER_ADMIN_EMAIL = 'info@qualiasolutions.net';
  const superAdmin = profile?.email === SUPER_ADMIN_EMAIL;
  const admin = profile?.role === 'admin' || superAdmin;

  return {
    isAdmin: admin,
    isSuperAdmin: superAdmin,
    userId: user.id,
    email: profile?.email || null,
  };
}

/**
 * Get profiles for a workspace or all profiles
 */
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
