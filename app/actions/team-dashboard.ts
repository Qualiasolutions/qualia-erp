'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

// ============ TYPES ============

export interface TeamMemberTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  scheduled_start_time: string | null;
  project: { id: string; name: string; project_type: string | null } | null;
}

export interface TeamMemberTasks {
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
  tasks: TeamMemberTask[];
}

// Priority order for sorting
const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  'No Priority': 4,
};

/**
 * Get team task dashboard data.
 * Admins see all employee tasks; employees see only their own.
 * Filters to Todo/In Progress tasks, sorted by priority then due_date.
 */
export async function getTeamTaskDashboard(workspaceId: string): Promise<TeamMemberTasks[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Verify user is not a client
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profileData || profileData.role === 'client') return [];

  // Use admin client for cross-user reads (team grid visible to all non-client roles)
  const adminClient = createAdminClient();

  // Fetch all workspace members — only employees/managers for the team grid
  const { data: members, error: membersError } = await adminClient
    .from('workspace_members')
    .select('profile:profiles!workspace_members_profile_id_fkey(id, full_name, avatar_url, role)')
    .eq('workspace_id', workspaceId);

  if (membersError || !members) return [];

  const profiles = members
    .map((m: { profile: unknown }) => {
      const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return p as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string;
      } | null;
    })
    .filter(
      (p): p is { id: string; full_name: string | null; avatar_url: string | null; role: string } =>
        p !== null && p.role === 'employee'
    )
    .sort((a, b) => (a.full_name || 'zzz').localeCompare(b.full_name || 'zzz'));

  // Single batch query for all members' tasks
  const memberIds = profiles.map((p) => p.id);
  const allTasks = await fetchTasksForProfiles(adminClient, memberIds, workspaceId);

  return profiles.map((profile) => ({
    profile,
    tasks: allTasks.get(profile.id) || [],
  }));
}

/**
 * Batch-fetch active tasks for multiple profiles in a single query.
 * Returns a Map of profileId -> sorted tasks.
 */
async function fetchTasksForProfiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileIds: string[],
  workspaceId: string
): Promise<Map<string, TeamMemberTask[]>> {
  if (profileIds.length === 0) return new Map();

  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select(
      `id, title, status, priority, due_date, completed_at, assignee_id, scheduled_start_time, project:projects(id, name, project_type)`
    )
    .eq('workspace_id', workspaceId)
    .in('assignee_id', profileIds)
    .or(
      `status.in.(Todo,In Progress),and(status.eq.Done,completed_at.gte.${new Date().toISOString().split('T')[0]})`
    );

  if (error || !rawTasks) return new Map();

  const result = new Map<string, TeamMemberTask[]>();
  for (const t of rawTasks as Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    completed_at: string | null;
    assignee_id: string | null;
    scheduled_start_time: string | null;
    project:
      | { id: string; name: string; project_type: string | null }
      | { id: string; name: string; project_type: string | null }[]
      | null;
  }>) {
    const project = Array.isArray(t.project) ? (t.project[0] ?? null) : t.project;
    const task: TeamMemberTask = {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      completed_at: t.completed_at,
      assignee_id: t.assignee_id,
      scheduled_start_time: t.scheduled_start_time,
      project,
    };
    const key = t.assignee_id || '';
    if (!result.has(key)) result.set(key, []);
    result.get(key)!.push(task);
  }

  // Sort each member's tasks
  for (const tasks of result.values()) {
    tasks.sort((a, b) => {
      const aScheduled = !!a.scheduled_start_time;
      const bScheduled = !!b.scheduled_start_time;
      if (aScheduled && bScheduled)
        return a.scheduled_start_time!.localeCompare(b.scheduled_start_time!);
      if (aScheduled && !bScheduled) return -1;
      if (!aScheduled && bScheduled) return 1;
      const pA = PRIORITY_ORDER[a.priority] ?? 4;
      const pB = PRIORITY_ORDER[b.priority] ?? 4;
      if (pA !== pB) return pA - pB;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }

  return result;
}
