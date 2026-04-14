'use server';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
import { canAccessProject } from '@/lib/portal-utils';
export type { ActivityLogEntry } from '@/lib/activity-utils';

interface CreateActivityLogInput {
  projectId: string;
  actionType: string;
  actionData?: Record<string, unknown>;
  isClientVisible: boolean;
}

/**
 * Get activity feed for a project
 * @param projectId - Project ID to fetch activity for
 * @param clientVisibleOnly - If true, only return entries with is_client_visible=true
 * @param limit - Maximum number of entries to return (default: 20)
 * @param cursor - Optional ISO timestamp of last item for pagination
 */
export async function getProjectActivityFeed(
  projectId: string,
  clientVisibleOnly = false,
  limit = 20,
  cursor?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user has access to this project
  const hasAccess = await canAccessProject(user.id, projectId);
  if (!hasAccess) {
    return { success: false, error: 'Access denied' };
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

  // Add cursor filter if provided (fetch items older than cursor)
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

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
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const normalized = (data || []).map((entry: Record<string, any>) => ({
    ...entry,
    actor: normalizeFKResponse(entry.actor),
  })) as Array<Record<string, any>>;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // For backward compatibility: if no cursor was provided, return simple array
  if (!cursor && cursor !== '') {
    return { success: true, data: normalized };
  }

  // For paginated requests: return with hasMore and nextCursor
  const hasMore = normalized.length === limit;
  const lastItem = normalized[normalized.length - 1];
  const nextCursor = lastItem ? (lastItem.created_at as string) : null;

  return {
    success: true,
    data: {
      items: normalized,
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Get cross-project activity feed for multiple projects.
 * Used by the standalone /activity page.
 * @param projectIds - Array of project IDs to fetch activity for
 * @param limit - Maximum entries to return (default: 30)
 * @param cursor - Optional ISO timestamp for cursor-based pagination
 */
export async function getCrossProjectActivityFeed(
  projectIds: string[],
  limit = 30,
  cursor?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!projectIds.length) {
    return { success: true, data: { items: [], hasMore: false, nextCursor: null } };
  }

  let query = supabase
    .from('activity_log')
    .select(
      `
      id, project_id, action_type, actor_id, action_data, is_client_visible, created_at,
      actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url),
      project:projects!activity_log_project_id_fkey(id, name)
    `
    )
    .in('project_id', projectIds)
    .eq('is_client_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getCrossProjectActivityFeed] Error:', error);
    return { success: false, error: error.message };
  }

  const normalized = (data || []).map((entry) => ({
    ...entry,
    actor: normalizeFKResponse(entry.actor),
    project: normalizeFKResponse(entry.project),
  }));

  const hasMore = normalized.length === limit;
  const lastItem = normalized[normalized.length - 1];

  return {
    success: true,
    data: { items: normalized, hasMore, nextCursor: lastItem?.created_at || null },
  };
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

  const { projectId, actionType, actionData, isClientVisible } = data;

  // Always use the authenticated user — never trust caller-supplied actor IDs
  const finalActorId = user.id;

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

  return { success: true, data: entry };
}
