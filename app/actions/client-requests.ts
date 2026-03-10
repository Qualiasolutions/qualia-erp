'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserManagerOrAbove } from './shared';
import { notifyAssignedEmployees } from '@/lib/notifications';

/**
 * Create a feature request from a client
 */
export async function createFeatureRequest(input: {
  project_id?: string;
  title: string;
  description?: string;
  priority?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (!input.title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    // Verify project_id belongs to this client if provided
    if (input.project_id) {
      const { data: ownership } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id)
        .eq('project_id', input.project_id)
        .single();

      if (!ownership) {
        return { success: false, error: 'Project not found or access denied' };
      }
    }

    const { data, error } = await supabase
      .from('client_feature_requests')
      .insert({
        client_id: user.id,
        project_id: input.project_id || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority || 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    // Add activity log entry and notify assigned employees
    try {
      // Get a project for the client to associate with
      const { data: clientProject } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id)
        .limit(1)
        .single();

      if (clientProject) {
        await supabase.from('activity_log').insert({
          project_id: clientProject.project_id,
          action_type: 'feature_request',
          actor_id: user.id,
          action_data: { request_title: input.title, request_id: data.id },
          is_client_visible: true,
        });

        await notifyAssignedEmployees(
          clientProject.project_id,
          `Client submitted feature request: ${input.title}`,
          {
            request_id: data.id,
            action_type: 'feature_request',
          }
        );
      }
    } catch (err) {
      console.error('[createFeatureRequest] Activity/notification error:', err);
    }

    revalidatePath('/portal/requests');
    revalidatePath('/portal');
    return { success: true, data };
  } catch (error) {
    console.error('[createFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create request',
    };
  }
}

/**
 * Get feature requests for the current client
 */
export async function getClientFeatureRequests(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserManagerOrAbove(user.id);

    let query = supabase
      .from('client_feature_requests')
      .select(
        `
        id,
        client_id,
        project_id,
        title,
        description,
        priority,
        status,
        admin_response,
        created_at,
        updated_at,
        project:projects(id, name)
      `
      )
      .order('created_at', { ascending: false });

    // Clients only see their own (RLS enforces this too)
    if (!isAdmin) {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Normalize FK arrays
    const normalized = (data || []).map((r) => ({
      ...r,
      project: Array.isArray(r.project) ? r.project[0] || null : r.project,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('[getClientFeatureRequests] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get requests',
    };
  }
}

/**
 * Update a feature request (admin: status/response, client: title/description if pending)
 */
export async function updateFeatureRequest(
  requestId: string,
  updates: {
    status?: string;
    admin_response?: string;
    title?: string;
    description?: string;
  }
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserManagerOrAbove(user.id);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (isAdmin) {
      // Admins can update all fields
      if (updates.status) updateData.status = updates.status;
      if (updates.admin_response !== undefined) updateData.admin_response = updates.admin_response;
      if (updates.title) updateData.title = updates.title.trim();
      if (updates.description !== undefined)
        updateData.description = updates.description?.trim() || null;
    } else {
      // Clients can only update title and description
      if (updates.title !== undefined) updateData.title = updates.title.trim();
      if (updates.description !== undefined)
        updateData.description = updates.description?.trim() || null;
    }

    let query = supabase.from('client_feature_requests').update(updateData).eq('id', requestId);

    // Non-admin clients can only update their own requests (IDOR fix)
    if (!isAdmin) {
      query = query.eq('client_id', user.id);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Request not found or access denied' };
    }

    revalidatePath('/portal/requests');
    revalidatePath('/portal');
    return { success: true, data };
  } catch (error) {
    console.error('[updateFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update request',
    };
  }
}
