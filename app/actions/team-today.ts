'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';
import { getTeamStatus } from './work-sessions';

export interface TeamMemberTodayTask {
  id: string;
  title: string;
  projectName: string | null;
  priority: string | null;
  milestone: string | null;
}

export interface TeamMemberToday {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  onlineProjectName: string | null;
  openTasksCount: number;
  topTasks: TeamMemberTodayTask[];
}

/**
 * Admin-only lightweight snapshot: every employee in the workspace plus their
 * current open tasks (capped at 5 per person). Used by the admin Today page
 * so the admin can see at a glance what each teammate has on deck. Online
 * status is derived from the live `work_sessions` table (open session ⇒
 * online). Returns [] for non-admins.
 */
export async function getTeamTodaySnapshot(): Promise<TeamMemberToday[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return [];

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  // getTeamStatus already fetches workspace_members → profiles (id, full_name,
  // avatar_url, role) plus open sessions. No need for a separate profiles query.
  const liveStatuses = await getTeamStatus(workspaceId);

  if (liveStatuses.length === 0) return [];

  const statusById = new Map(liveStatuses.map((s) => [s.profileId, s]));

  // Build the employees list from the status result — same shape the rest of
  // this function expects.
  const employees = liveStatuses.map((s) => ({
    id: s.profileId,
    full_name: s.fullName,
    avatar_url: s.avatarUrl,
  }));

  const profileIds = employees.map((e) => e.id);

  // Open tasks for every employee in a single query. Cap top tasks per-person
  // client-side — we fetch at most 200 rows total (50 employees × 4 avg).
  const { data: openTasks } = await supabase
    .from('tasks')
    .select(
      'id, title, priority, milestone, assignee_id, project:projects!tasks_project_id_fkey(name)'
    )
    .in('assignee_id', profileIds)
    .neq('status', 'Done')
    .order('created_at', { ascending: false })
    .limit(200);

  const tasksByAssignee = new Map<string, TeamMemberTodayTask[]>();
  for (const t of openTasks ?? []) {
    const list = tasksByAssignee.get(t.assignee_id as string) ?? [];
    if (list.length >= 5) continue;
    const project = Array.isArray(t.project) ? t.project[0] : t.project;
    list.push({
      id: t.id as string,
      title: t.title as string,
      projectName: (project?.name as string) ?? null,
      priority: (t.priority as string) ?? null,
      milestone: (t.milestone as string) ?? null,
    });
    tasksByAssignee.set(t.assignee_id as string, list);
  }

  // Count all open tasks per assignee (not capped).
  const countByAssignee = new Map<string, number>();
  for (const t of openTasks ?? []) {
    const key = t.assignee_id as string;
    countByAssignee.set(key, (countByAssignee.get(key) ?? 0) + 1);
  }

  return employees.map((e) => {
    const status = statusById.get(e.id);
    const tasks = tasksByAssignee.get(e.id) ?? [];
    return {
      profileId: e.id,
      fullName: e.full_name,
      avatarUrl: e.avatar_url,
      isOnline: status?.status === 'online',
      onlineProjectName: status?.projectName ?? null,
      openTasksCount: countByAssignee.get(e.id) ?? 0,
      topTasks: tasks,
    };
  });
}
