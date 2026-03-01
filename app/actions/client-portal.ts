'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserAdmin } from './shared';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://qualia-erp.vercel.app';

/**
 * Invite a client to a project by email.
 * If the client already has a Supabase account, links them directly.
 * If not, creates an auth account via inviteUserByEmail and links once profile exists.
 */
export async function inviteClientByEmail(
  projectId: string,
  email: string,
  clientName?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can invite clients' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if a profile with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      // Profile exists — check role
      if (existingProfile.role === 'admin' || existingProfile.role === 'employee') {
        return {
          success: false,
          error: 'This email belongs to a team member, not a client',
        };
      }

      // Already a client profile — just link to project
      return inviteClientToProject(projectId, existingProfile.id);
    }

    // No existing profile — create auth account via admin API
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      return {
        success: false,
        error: 'Service role key not configured. Cannot invite new users.',
      };
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${APP_URL}/portal`,
        data: {
          role: 'client',
          full_name: clientName || null,
        },
      }
    );

    if (inviteError) {
      console.error('[inviteClientByEmail] Invite error:', inviteError);
      return {
        success: false,
        error: `Failed to send invite: ${inviteError.message}`,
      };
    }

    if (!inviteData?.user?.id) {
      return { success: false, error: 'Invite sent but no user ID returned' };
    }

    const newUserId = inviteData.user.id;

    // Ensure profile exists with client role (Supabase trigger may create it,
    // but we upsert to be safe)
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: newUserId,
        email: normalizedEmail,
        full_name: clientName || null,
        role: 'client',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[inviteClientByEmail] Profile creation error:', profileError);
      // Don't fail — the invite was sent, profile will be created on signup
    }

    // Link client to project
    const { error: linkError } = await adminClient.from('client_projects').insert({
      client_id: newUserId,
      project_id: projectId,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    });

    if (linkError) {
      console.error('[inviteClientByEmail] Link error:', linkError);
      return {
        success: false,
        error: 'Invite sent but failed to link project. Try adding manually.',
      };
    }

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return {
      success: true,
      data: { userId: newUserId, emailSent: true },
    };
  } catch (error) {
    console.error('[inviteClientByEmail] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Invite a client to a project (by existing profile ID).
 * Creates a link in client_projects table allowing the client to view the project.
 */
export async function inviteClientToProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can invite clients to projects' };
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('client_projects')
      .select('id')
      .eq('client_id', clientId)
      .eq('project_id', projectId)
      .single();

    if (existingLink) {
      return { success: false, error: 'Client is already invited to this project' };
    }

    // Create the client-project link
    const { data, error } = await supabase
      .from('client_projects')
      .insert({
        client_id: clientId,
        project_id: projectId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return { success: true, data };
  } catch (error) {
    console.error('Failed to invite client to project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite client',
    };
  }
}

/**
 * Remove a client's access to a project
 * Deletes the client_projects link
 */
export async function removeClientFromProject(
  projectId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    if (!(await isUserAdmin(user.id))) {
      return { success: false, error: 'Only admins can remove client access' };
    }

    // Delete the client-project link
    const { error } = await supabase
      .from('client_projects')
      .delete()
      .eq('client_id', clientId)
      .eq('project_id', projectId);

    if (error) throw error;

    revalidatePath('/clients');
    revalidatePath('/projects');
    revalidatePath('/portal');

    return { success: true };
  } catch (error) {
    console.error('Failed to remove client from project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove client access',
    };
  }
}

/**
 * Get all projects a client has access to
 * Returns projects with full details joined from projects table
 */
export async function getClientProjects(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Authorization: user can only query their own projects unless admin
    if (user.id !== clientId && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Not authorized to view these projects' };
    }

    // Query client_projects with project details
    const { data, error } = await supabase
      .from('client_projects')
      .select(
        `
        id,
        client_id,
        project_id,
        access_level,
        invited_at,
        invited_by,
        project:projects (
          id,
          name,
          description,
          project_type,
          project_status,
          start_date,
          end_date,
          lead_id,
          client_id,
          workspace_id,
          created_at,
          updated_at
        )
      `
      )
      .eq('client_id', clientId)
      .order('invited_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get client projects:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client projects',
    };
  }
}
