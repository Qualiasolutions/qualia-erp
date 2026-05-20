'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

import { getCurrentWorkspaceId } from './workspace';
import { type ActivityType } from './shared';

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

// ============ SCHEMAS ============

const GetRecentActivitiesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

// ============ ACTIVITY ACTIONS ============

/**
 * Get recent activities
 */
export async function getRecentActivities(
  limit: number = 20,
  _workspaceId?: string | null
): Promise<Activity[]> {
  void _workspaceId;

  const parsed = GetRecentActivitiesSchema.safeParse({ limit });
  if (!parsed.success) return [];
  const validatedLimit = parsed.data.limit;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Always derive workspaceId from authenticated user (never trust client)
  const wsId = await getCurrentWorkspaceId();

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
    .limit(validatedLimit);

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
