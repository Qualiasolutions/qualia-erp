'use server';

import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateData } from '@/lib/validation';
import { type ActionResult } from './shared';

// ============ ZOD SCHEMAS ============

const invitationTokenSchema = z.string().min(10, 'Invalid token');

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
    const parsed = validateData(invitationTokenSchema, token);
    if (!parsed.success) return { error: parsed.error };

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
    const parsed = validateData(invitationTokenSchema, token);
    if (!parsed.success) return { success: false, error: parsed.error };

    const adminClient = createAdminClient();

    // Only update if status is 'sent' or 'resent' (don't overwrite 'accepted')
    // Admin client bypasses RLS — multi-row update is intentional (match by token + status filter).
    const { data: updated, error } = await adminClient
      .from('client_invitations')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('invitation_token', parsed.data)
      .in('status', ['sent', 'resent'])
      .select();

    if (error) {
      console.error('[markInvitationOpened] Update error:', error);
      return { success: false, error: error.message };
    }

    // No rows updated is expected if already opened/accepted — not an error.
    return { success: true, data: { rowsUpdated: updated?.length ?? 0 } };
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
    const parsed = validateData(invitationTokenSchema, token);
    if (!parsed.success) return { success: false, error: parsed.error };

    const adminClient = createAdminClient();

    const { data: updated, error } = await adminClient
      .from('client_invitations')
      .update({
        status: 'accepted',
        account_created_at: new Date().toISOString(),
      })
      .eq('invitation_token', parsed.data)
      .in('status', ['opened', 'sent', 'resent'])
      .select();

    if (error) {
      console.error('[markInvitationAccepted] Update error:', error);
      return { success: false, error: error.message };
    }

    if (!updated || updated.length === 0) {
      return {
        success: false,
        error: 'Invitation not found or already accepted',
      };
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
