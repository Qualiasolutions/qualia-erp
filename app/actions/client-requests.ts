'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, isUserAdmin } from './shared';

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

    const isAdmin = await isUserAdmin(user.id);

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

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.status) updateData.status = updates.status;
    if (updates.admin_response !== undefined) updateData.admin_response = updates.admin_response;
    if (updates.title) updateData.title = updates.title.trim();
    if (updates.description !== undefined)
      updateData.description = updates.description?.trim() || null;

    const { data, error } = await supabase
      .from('client_feature_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

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
