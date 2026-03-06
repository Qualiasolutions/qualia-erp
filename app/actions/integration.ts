'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserAdmin } from './shared';

/**
 * Link an ERP project to a CRM client.
 * Admin-only operation.
 */
export async function linkProjectToClient(
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
      return { success: false, error: 'Only admins can link projects to clients' };
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return { success: false, error: 'Client not found' };
    }

    // Update project with client_id
    const { error: updateError } = await supabase
      .from('projects')
      .update({ client_id: clientId })
      .eq('id', projectId);

    if (updateError) {
      console.error('[linkProjectToClient] Update error:', updateError);
      return { success: false, error: 'Failed to link project to client' };
    }

    // Revalidate relevant paths
    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/clients');
    revalidatePath(`/clients/${clientId}`);
    revalidatePath('/portal');

    return {
      success: true,
      data: { projectName: project.name, clientName: client.name },
    };
  } catch (error) {
    console.error('[linkProjectToClient] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Remove CRM client link from an ERP project.
 * Admin-only operation.
 */
export async function unlinkProjectFromClient(projectId: string): Promise<ActionResult> {
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
      return { success: false, error: 'Only admins can unlink projects from clients' };
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    if (!project.client_id) {
      return { success: false, error: 'Project is not linked to any client' };
    }

    const previousClientId = project.client_id;

    // Set client_id to NULL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ client_id: null })
      .eq('id', projectId);

    if (updateError) {
      console.error('[unlinkProjectFromClient] Update error:', updateError);
      return { success: false, error: 'Failed to unlink project from client' };
    }

    // Revalidate relevant paths
    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/clients');
    revalidatePath(`/clients/${previousClientId}`);
    revalidatePath('/portal');

    return { success: true, data: { projectName: project.name } };
  } catch (error) {
    console.error('[unlinkProjectFromClient] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Force refresh of project data in portal.
 * Admin-only operation.
 */
export async function syncProjectData(projectId: string): Promise<ActionResult> {
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
      return { success: false, error: 'Only admins can sync project data' };
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found' };
    }

    // Revalidate all portal routes for this project
    revalidatePath('/portal');
    revalidatePath('/portal/projects');
    revalidatePath(`/portal/projects/${projectId}`);
    revalidatePath('/portal/dashboard');

    const syncTimestamp = new Date().toISOString();

    return {
      success: true,
      data: { projectName: project.name, syncedAt: syncTimestamp },
    };
  } catch (error) {
    console.error('[syncProjectData] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all ERP-portal project mappings using the portal_project_mappings view.
 * Admin-only operation.
 */
export async function getProjectMappings(): Promise<ActionResult> {
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
      return { success: false, error: 'Only admins can view project mappings' };
    }

    // Query the portal_project_mappings view
    const { data: mappings, error: mappingsError } = await supabase
      .from('portal_project_mappings')
      .select('*')
      .order('project_name');

    if (mappingsError) {
      console.error('[getProjectMappings] Query error:', mappingsError);
      return { success: false, error: 'Failed to fetch project mappings' };
    }

    return { success: true, data: mappings };
  } catch (error) {
    console.error('[getProjectMappings] Error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
