'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from './workspace';
import { isUserAdmin, type ActionResult, type ActivityType } from './shared';

// ============ ACTIVITY TYPES ============

export type Activity = {
  id: string;
  type: ActivityType;
  created_at: string;
  metadata: Record<string, unknown>;
  actor: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  project: { id: string; name: string } | null;
  issue: { id: string; title: string } | null;
  team: { id: string; name: string; key: string } | null;
  meeting: { id: string; title: string; start_time: string } | null;
};

// ============ ACTIVITY ACTIONS ============

/**
 * Get recent activities
 */
export async function getRecentActivities(
  limit: number = 20,
  workspaceId?: string | null
): Promise<Activity[]> {
  const supabase = await createClient();

  // Get workspace ID from parameter or user's default
  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  let query = supabase
    .from('activities')
    .select(
      `
            id,
            type,
            created_at,
            metadata,
            actor:profiles!activities_actor_id_fkey (id, full_name, email, avatar_url),
            project:projects (id, name),
            issue:issues (id, title),
            team:teams (id, name, key),
            meeting:meetings (id, title, start_time)
        `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (wsId) {
    query = query.eq('workspace_id', wsId);
  }

  const { data: activities, error } = await query;

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  // Normalize the response (arrays to single objects)
  return (activities || []).map((a) => ({
    ...a,
    actor: Array.isArray(a.actor) ? a.actor[0] || null : a.actor,
    project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    issue: Array.isArray(a.issue) ? a.issue[0] || null : a.issue,
    team: Array.isArray(a.team) ? a.team[0] || null : a.team,
    meeting: Array.isArray(a.meeting) ? a.meeting[0] || null : a.meeting,
  })) as Activity[];
}

/**
 * Delete an activity (admin only)
 */
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user is admin
  const adminCheck = await isUserAdmin(user.id);
  if (!adminCheck) {
    return { success: false, error: 'Only admins can delete activities' };
  }

  const { error } = await supabase.from('activities').delete().eq('id', activityId);

  if (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hub');
  revalidatePath('/');
  return { success: true };
}
