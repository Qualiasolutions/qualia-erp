'use server';

import { createClient } from '@/lib/supabase/server';

import { type ActionResult, isUserManagerOrAbove } from './shared';
import { notifyAssignedEmployees } from '@/lib/notifications';
import { FeatureRequestCreateSchema, UpdateFeatureRequestSchema } from '@/lib/validation';
import { assertNotImpersonating } from '@/lib/portal-utils';

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
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const parsed = FeatureRequestCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }
    const safeInput = parsed.data;

    // Verify project_id belongs to this client if provided
    if (safeInput.project_id) {
      const { data: ownership } = await supabase
        .from('client_projects')
        .select('project_id')
        .eq('client_id', user.id)
        .eq('project_id', safeInput.project_id)
        .single();

      if (!ownership) {
        return { success: false, error: 'Project not found or access denied' };
      }
    }

    const { data, error } = await supabase
      .from('client_feature_requests')
      .insert({
        client_id: user.id,
        project_id: safeInput.project_id || null,
        title: safeInput.title.trim(),
        description: safeInput.description?.trim() || null,
        priority: safeInput.priority || 'medium',
      })
      .select()
      .single();

    if (error) throw error;

    // Add activity log entry and notify assigned employees
    try {
      // Use the specified project_id, or fall back to any linked project
      const activityProjectId = safeInput.project_id || null;
      let resolvedProjectId = activityProjectId;

      if (!resolvedProjectId) {
        const { data: clientProject } = await supabase
          .from('client_projects')
          .select('project_id')
          .eq('client_id', user.id)
          .limit(1)
          .single();
        resolvedProjectId = clientProject?.project_id || null;
      }

      if (resolvedProjectId) {
        await supabase.from('activity_log').insert({
          project_id: resolvedProjectId,
          action_type: 'feature_request',
          actor_id: user.id,
          action_data: { request_title: safeInput.title, request_id: data.id },
          is_client_visible: true,
        });

        await notifyAssignedEmployees(
          resolvedProjectId,
          `Client submitted feature request: ${safeInput.title}`,
          {
            request_id: data.id,
            action_type: 'feature_request',
          }
        );
      }
    } catch (err) {
      console.error('[createFeatureRequest] Activity/notification error:', err);
    }

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
    const imp = await assertNotImpersonating();
    if (!imp.ok) return { success: false, error: imp.error };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Validate input with Zod
    const parsed = UpdateFeatureRequestSchema.safeParse(updates);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }
    const safeUpdates = parsed.data;

    const isAdmin = await isUserManagerOrAbove(user.id);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (isAdmin) {
      // Admins can update all fields
      if (safeUpdates.status) updateData.status = safeUpdates.status;
      if (safeUpdates.admin_response !== undefined)
        updateData.admin_response = safeUpdates.admin_response;
      if (safeUpdates.title) updateData.title = safeUpdates.title.trim();
      if (safeUpdates.description !== undefined)
        updateData.description = safeUpdates.description?.trim() || null;
    } else {
      // Clients can only update title and description of pending/in_review requests
      if (safeUpdates.title !== undefined) updateData.title = safeUpdates.title.trim();
      if (safeUpdates.description !== undefined)
        updateData.description = safeUpdates.description?.trim() || null;
    }

    let query = supabase.from('client_feature_requests').update(updateData).eq('id', requestId);

    // Non-admin clients can only update their own pending/in_review requests
    if (!isAdmin) {
      query = query.eq('client_id', user.id).in('status', ['pending', 'in_review']);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Request not found or access denied' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateFeatureRequest] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update request',
    };
  }
}
