'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getInvitationByToken, markInvitationAccepted } from './client-invitations';

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

  // Auto-resolve workspace if not provided
  let wsId = workspaceId;
  if (!wsId) {
    const { getCurrentWorkspaceId } = await import('./workspace');
    wsId = (await getCurrentWorkspaceId()) || undefined;
  }

  // Filter to workspace members only (much faster for multi-tenant)
  if (wsId) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select(
        'profile:profiles!workspace_members_profile_id_fkey (id, full_name, email, avatar_url, role)'
      )
      .eq('workspace_id', wsId);

    return (members || [])
      .map((m) => (Array.isArray(m.profile) ? m.profile[0] : m.profile))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined)
      .filter((p) => p.role !== 'client')
      .sort((a, b) => (a.full_name || 'zzz').localeCompare(b.full_name || 'zzz'));
  }

  // Fallback: return all profiles (legacy behavior)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .order('full_name');
  return profiles || [];
}

/**
 * Client signup with invitation action
 * Creates auth user, profile, and client_projects link in single atomic flow
 */
export async function signupWithInvitationAction(
  _prevState: { success: boolean; error: string | null; projectId?: string },
  formData: FormData
): Promise<{ success: boolean; error: string | null; projectId?: string }> {
  try {
    // Extract form fields
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const invitationToken = formData.get('invitationToken') as string;

    // Validate required fields
    if (!email || !password || !fullName || !invitationToken) {
      return { success: false, error: 'All fields are required' };
    }

    // Validate invitation token and get details
    const invitationResult = await getInvitationByToken(invitationToken);
    if (invitationResult.error || !invitationResult.invitation) {
      return { success: false, error: invitationResult.error || 'Invalid invitation' };
    }

    const invitation = invitationResult.invitation;

    // Verify email matches invitation
    if (email.trim().toLowerCase() !== invitation.email.toLowerCase()) {
      return { success: false, error: 'Email does not match invitation' };
    }

    // Create Supabase auth user
    const supabase = await createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      console.error('[signupWithInvitation] SignUp error:', signUpError);
      return {
        success: false,
        error: signUpError?.message || 'Failed to create account',
      };
    }

    const userId = signUpData.user.id;

    // Use admin client to create profile and client_projects
    // (RLS won't allow new user to write to these tables yet)
    const adminClient = createAdminClient();

    // Create profile with role='client'
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      email: email.trim(),
      full_name: fullName,
      role: 'client',
    });

    if (profileError) {
      console.error('[signupWithInvitation] Profile creation error:', profileError);
      return {
        success: false,
        error: 'Failed to create user profile',
      };
    }

    // Create client_projects link
    const { error: clientProjectError } = await adminClient.from('client_projects').insert({
      client_id: userId,
      project_id: invitation.project_id,
      access_level: 'comment',
      invited_by: invitation.invited_by,
    });

    if (clientProjectError) {
      console.error('[signupWithInvitation] Client project link error:', clientProjectError);
      return {
        success: false,
        error: 'Failed to link project to account',
      };
    }

    // Mark invitation as accepted — pass token, not UUID PK
    const acceptResult = await markInvitationAccepted(invitationToken);
    if (!acceptResult.success) {
      console.error('[signupWithInvitation] Mark accepted error:', acceptResult.error);
      // Non-fatal - account was created successfully
    }

    return {
      success: true,
      error: null,
      projectId: invitation.project_id,
    };
  } catch (error) {
    console.error('[signupWithInvitation] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
