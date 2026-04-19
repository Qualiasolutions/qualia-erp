'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from '../shared';

/**
 * Get cross-project activity feed for a client (Messages page)
 */
export async function getClientActivityFeed(
  clientId: string,
  limit = 20,
  cursor?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

    // Get client's project IDs
    const { data: clientProjects } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', clientId);

    if (!clientProjects || clientProjects.length === 0) {
      return { success: true, data: { items: [], hasMore: false, nextCursor: null } };
    }

    const projectIds = clientProjects.map((cp) => cp.project_id);

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
        project:projects(id, name),
        actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq('is_client_visible', true)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data || []).map((entry) => ({
      ...entry,
      project: Array.isArray(entry.project) ? entry.project[0] || null : entry.project,
      actor: Array.isArray(entry.actor) ? entry.actor[0] || null : entry.actor,
    }));

    const hasMore = normalized.length === limit;
    const lastItem = normalized[normalized.length - 1];
    const nextCursor = lastItem ? lastItem.created_at : null;

    return {
      success: true,
      data: { items: normalized, hasMore, nextCursor },
    };
  } catch (error) {
    console.error('[getClientActivityFeed] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get activity feed',
    };
  }
}
