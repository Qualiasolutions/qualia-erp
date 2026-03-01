'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserAdmin } from './shared';

/**
 * Invite a client to a project
 * Creates a link in client_projects table allowing the client to view the project
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
