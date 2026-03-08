'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from './shared';
import { invitationSchema, type InvitationInput } from '@/lib/validation';
import { randomUUID } from 'crypto';

/**
 * Create a new client invitation for a project.
 * Generates a secure token and stores invitation record.
 * Idempotent: returns existing invitation if already sent/resent.
 */
export async function createInvitation(input: InvitationInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: require manager or admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin or manager access required' };
    }

    // Validate input
    const validation = invitationSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid invitation data',
      };
    }

    const { projectId, email } = validation.data;

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, lead_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    // Check if invitation already exists for this project+email
    const { data: existingInvitation } = await supabase
      .from('client_invitations')
      .select('id, invitation_token, email, status')
      .eq('project_id', projectId)
      .eq('email', email)
      .single();

    // Return existing invitation if status is sent or resent (idempotent)
    if (existingInvitation && ['sent', 'resent'].includes(existingInvitation.status)) {
      return {
        success: true,
        data: {
          invitationId: existingInvitation.id,
          token: existingInvitation.invitation_token,
          email: existingInvitation.email,
          isExisting: true,
        },
      };
    }

    // Generate secure token using crypto.randomUUID()
    const token = randomUUID();

    // Insert new invitation
    const { data: invitation, error: insertError } = await supabase
      .from('client_invitations')
      .insert({
        project_id: projectId,
        email,
        invitation_token: token,
        status: 'sent',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        resent_count: 0,
      })
      .select('id, invitation_token, email')
      .single();

    if (insertError) {
      console.error('[createInvitation] Insert error:', insertError);
      return {
        success: false,
        error: insertError.message || 'Failed to create invitation',
      };
    }

    if (!invitation) {
      return { success: false, error: 'Failed to create invitation' };
    }

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        token: invitation.invitation_token,
        email: invitation.email,
        isExisting: false,
      },
    };
  } catch (error) {
    console.error('[createInvitation] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    };
  }
}

/**
 * Resend an existing invitation.
 * Updates status to 'resent', increments counter, and updates timestamp.
 */
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: require manager or admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin or manager access required' };
    }

    // Fetch invitation to verify it exists and check status
    const { data: invitation, error: fetchError } = await supabase
      .from('client_invitations')
      .select('id, email, status, resent_count')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    // Don't allow resending accepted invitations
    if (invitation.status === 'accepted') {
      return { success: false, error: 'Cannot resend accepted invitation' };
    }

    // Update invitation
    const { error: updateError } = await supabase
      .from('client_invitations')
      .update({
        status: 'resent',
        resent_at: new Date().toISOString(),
        resent_count: (invitation.resent_count || 0) + 1,
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('[resendInvitation] Update error:', updateError);
      return { success: false, error: updateError.message || 'Failed to resend invitation' };
    }

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        email: invitation.email,
      },
    };
  } catch (error) {
    console.error('[resendInvitation] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invitation',
    };
  }
}

/**
 * Get invitation history for a project.
 * Returns all invitations with invited_by user details.
 */
export async function getInvitationHistory(projectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: require manager or admin
    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Admin or manager access required' };
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    // Query invitations with invited_by user details
    const { data: invitations, error } = await supabase
      .from('client_invitations')
      .select(
        `
        id,
        email,
        status,
        invited_at,
        resent_at,
        resent_count,
        opened_at,
        account_created_at,
        invited_by_user:profiles!client_invitations_invited_by_fkey(
          id,
          full_name,
          email
        )
      `
      )
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('[getInvitationHistory] Query error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: invitations || [],
    };
  } catch (error) {
    console.error('[getInvitationHistory] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invitation history',
    };
  }
}

/**
 * Get the most recent invitation status for a project.
 * Used for displaying status badges in UI.
 */
export async function getProjectInvitationStatus(
  projectId: string
): Promise<{ hasInvitation: boolean; status: string | null; email: string | null }> {
  try {
    const supabase = await createClient();

    // Query most recent invitation for this project
    const { data: invitation } = await supabase
      .from('client_invitations')
      .select('status, email')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false })
      .limit(1)
      .single();

    if (!invitation) {
      return { hasInvitation: false, status: null, email: null };
    }

    return {
      hasInvitation: true,
      status: invitation.status,
      email: invitation.email,
    };
  } catch (error) {
    console.error('[getProjectInvitationStatus] Error:', error);
    return { hasInvitation: false, status: null, email: null };
  }
}
