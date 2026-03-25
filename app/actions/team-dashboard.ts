'use server';

import { createClient } from '@/lib/supabase/server';

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

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profileData?.role === 'admin';

  if (isAdmin) {
    // Fetch team profiles via workspace_members (profiles table has no workspace_id)
    const { data: members, error: membersError } = await supabase
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
        (
          p
        ): p is { id: string; full_name: string | null; avatar_url: string | null; role: string } =>
          p !== null && ['admin', 'employee', 'manager'].includes(p.role)
      )
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    // Parallel fetch tasks for all employees
    const memberTasksList = await Promise.all(
      profiles.map(async (profile) => {
        const tasks = await fetchTasksForProfile(supabase, profile.id, workspaceId);
        return { profile, tasks };
      })
    );

    return memberTasksList;
  } else {
    // Employee: only own tasks
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return [];

    const tasks = await fetchTasksForProfile(supabase, user.id, workspaceId);
    return [{ profile, tasks }];
  }
}

/**
 * Fetch active tasks (Todo/In Progress) for a specific profile,
 * joining project data.
 * Sorted by priority then due_date ASC.
 */
async function fetchTasksForProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  workspaceId: string
): Promise<TeamMemberTask[]> {
  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      status,
      priority,
      due_date,
      completed_at,
      assignee_id,
      scheduled_start_time,
      project:projects(id, name, project_type)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('assignee_id', profileId)
    .or(
      `status.in.(Todo,In Progress),and(status.eq.Done,completed_at.gte.${new Date().toISOString().split('T')[0]})`
    );

  if (error || !rawTasks) return [];

  // Normalize FK arrays returned by Supabase joins
  const tasks: TeamMemberTask[] = rawTasks.map(
    (t: {
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
    }) => {
      const project = Array.isArray(t.project) ? (t.project[0] ?? null) : t.project;

      return {
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
    }
  );

  // Sort: scheduled tasks first (by start time), then by priority, then due_date
  tasks.sort((a, b) => {
    // Scheduled tasks come first, sorted chronologically
    const aScheduled = !!a.scheduled_start_time;
    const bScheduled = !!b.scheduled_start_time;
    if (aScheduled && bScheduled) {
      return a.scheduled_start_time!.localeCompare(b.scheduled_start_time!);
    }
    if (aScheduled && !bScheduled) return -1;
    if (!aScheduled && bScheduled) return 1;

    // Non-scheduled: sort by priority then due_date
    const pA = PRIORITY_ORDER[a.priority] ?? 4;
    const pB = PRIORITY_ORDER[b.priority] ?? 4;
    if (pA !== pB) return pA - pB;

    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return tasks;
}
