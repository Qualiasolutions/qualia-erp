'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { type ActionResult } from './shared';

/**
 * Get invitation details by token for signup flow.
 * Validates token and returns invitation with project details.
 * Public read operation (RLS allows read by token).
 */
export async function getInvitationByToken(token: string): Promise<{
  invitation?: {
    id: string;
    email: string;
    project_id: string;
    project_name: string;
    welcome_message?: string;
    workspace_id: string;
    invited_by: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Query invitation with project details
    const { data: invitation, error } = await supabase
      .from('client_invitations')
      .select(
        `
        id,
        email,
        project_id,
        status,
        invited_by,
        created_at,
        project:projects(
          id,
          name,
          workspace_id,
          metadata
        )
      `
      )
      .eq('invitation_token', token)
      .single();

    if (error || !invitation) {
      console.error('[getInvitationByToken] Query error:', error);
      return { error: 'Invalid or expired invitation link' };
    }

    // Check if invitation is already accepted
    if (invitation.status === 'accepted') {
      return { error: 'This invitation has already been used' };
    }

    // Check if invitation has expired (7-day window)
    if (invitation.created_at) {
      const expirationMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(invitation.created_at).getTime() > expirationMs) {
        return {
          error: 'This invitation has expired. Please ask your project manager to send a new one.',
        };
      }
    }

    // Normalize FK response for project
    const project = Array.isArray(invitation.project) ? invitation.project[0] : invitation.project;

    if (!project) {
      return { error: 'Project not found' };
    }

    // Extract welcome message from project.metadata JSONB
    const metadata = project.metadata as { portal_settings?: { welcomeMessage?: string } } | null;
    const welcomeMessage = metadata?.portal_settings?.welcomeMessage;

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        project_id: invitation.project_id,
        project_name: project.name,
        welcome_message: welcomeMessage,
        workspace_id: project.workspace_id,
        invited_by: invitation.invited_by,
      },
    };
  } catch (error) {
    console.error('[getInvitationByToken] Unexpected error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to validate invitation',
    };
  }
}

/**
 * Mark invitation as opened when client visits signup page.
 * Uses admin client since called before user auth exists.
 * Accepts invitation TOKEN (not UUID PK) to prevent enumeration.
 */
export async function markInvitationOpened(token: string): Promise<ActionResult> {
  try {
    if (!token || token.length < 10) {
      return { success: false, error: 'Invalid token' };
    }

    const adminClient = createAdminClient();

    // Only update if status is 'sent' or 'resent' (don't overwrite 'accepted')
    const { error } = await adminClient
      .from('client_invitations')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('invitation_token', token)
      .in('status', ['sent', 'resent']);

    if (error) {
      console.error('[markInvitationOpened] Update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[markInvitationOpened] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark invitation opened',
    };
  }
}

/**
 * Mark invitation as accepted when client creates account.
 * Uses admin client since called during signup before session established.
 * Accepts invitation TOKEN (not UUID PK) to prevent enumeration.
 * @internal — called only from signup flow, not exposed as a public API
 */
export async function markInvitationAccepted(token: string): Promise<ActionResult> {
  try {
    if (!token || token.length < 10) {
      return { success: false, error: 'Invalid token' };
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('client_invitations')
      .update({
        status: 'accepted',
        account_created_at: new Date().toISOString(),
      })
      .eq('invitation_token', token)
      .in('status', ['opened', 'sent', 'resent']);

    if (error) {
      console.error('[markInvitationAccepted] Update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[markInvitationAccepted] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark invitation accepted',
    };
  }
}
