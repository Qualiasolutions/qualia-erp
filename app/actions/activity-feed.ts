'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
export type { ActivityLogEntry } from '@/lib/activity-utils';

interface CreateActivityLogInput {
  projectId: string;
  actionType: string;
  actionData?: Record<string, unknown>;
  isClientVisible: boolean;
  actorId?: string;
}

/**
 * Get activity feed for a project
 * @param projectId - Project ID to fetch activity for
 * @param clientVisibleOnly - If true, only return entries with is_client_visible=true
 * @param limit - Maximum number of entries to return (default: 50)
 */
export async function getProjectActivityFeed(
  projectId: string,
  clientVisibleOnly = false,
  limit = 50
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Build query
  let query = supabase
    .from('activity_log')
    .select(
      `
      id,
      project_id,
      action_type,
      actor_id,
      action_data,
      is_client_visible,
      created_at,
      actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url, email)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter by client visibility if requested
  if (clientVisibleOnly) {
    query = query.eq('is_client_visible', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getProjectActivityFeed] Error:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalized = (data || []).map((entry: Record<string, any>) => ({
    ...entry,
    actor: normalizeFKResponse(entry.actor),
  }));

  return { success: true, data: normalized };
}

/**
 * Create a new activity log entry
 */
export async function createActivityLogEntry(data: CreateActivityLogInput): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { projectId, actionType, actionData, isClientVisible, actorId } = data;

  // Use provided actorId or fall back to current user
  const finalActorId = actorId || user.id;

  // Insert activity log entry
  const { data: entry, error } = await supabase
    .from('activity_log')
    .insert({
      project_id: projectId,
      action_type: actionType,
      actor_id: finalActorId,
      action_data: actionData || null,
      is_client_visible: isClientVisible,
    })
    .select()
    .single();

  if (error) {
    console.error('[createActivityLogEntry] Error:', error);
    return { success: false, error: error.message };
  }

  // Revalidate portal updates path
  revalidatePath(`/portal/${projectId}/updates`);
  revalidatePath(`/portal/${projectId}`);

  return { success: true, data: entry };
}
