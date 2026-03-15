'use server';

import { createClient } from '@/lib/supabase/server';

// ============ TYPES ============

export interface TeamMemberTaskTimeLog {
  started_at: string;
  finished_at: string | null;
  time_spent_minutes: number | null;
}

export interface TeamMemberTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  project: { id: string; name: string } | null;
  time_log: TeamMemberTaskTimeLog | null;
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
    // Fetch all employee profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('workspace_id', workspaceId)
      .in('role', ['admin', 'employee'])
      .order('full_name', { ascending: true });

    if (profilesError || !profiles) return [];

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
 * joining project and time_log data.
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
      assignee_id,
      project:projects(id, name),
      time_log:task_time_logs(started_at, ended_at, duration_minutes)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('assignee_id', profileId)
    .in('status', ['Todo', 'In Progress']);

  if (error || !rawTasks) return [];

  // Normalize FK arrays returned by Supabase joins
  const tasks: TeamMemberTask[] = rawTasks.map(
    (t: {
      id: string;
      title: string;
      status: string;
      priority: string;
      due_date: string | null;
      assignee_id: string | null;
      project: { id: string; name: string } | { id: string; name: string }[] | null;
      time_log:
        | { started_at: string; ended_at: string | null; duration_minutes: number | null }
        | { started_at: string; ended_at: string | null; duration_minutes: number | null }[]
        | null;
    }) => {
      const project = Array.isArray(t.project) ? (t.project[0] ?? null) : t.project;
      const rawLog = Array.isArray(t.time_log) ? (t.time_log[0] ?? null) : t.time_log;
      const time_log: TeamMemberTaskTimeLog | null = rawLog
        ? {
            started_at: rawLog.started_at,
            finished_at: rawLog.ended_at,
            time_spent_minutes: rawLog.duration_minutes,
          }
        : null;

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assignee_id: t.assignee_id,
        project,
        time_log,
      };
    }
  );

  // Sort by priority then due_date ASC (nulls last)
  tasks.sort((a, b) => {
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
