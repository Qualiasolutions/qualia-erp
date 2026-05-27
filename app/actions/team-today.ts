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
  projectId?: string | null;
  phaseName?: string | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface TeamMemberLatestProgress {
  projectId: string | null;
  projectName: string | null;
  phaseLabel: string | null;
  phaseName: string | null;
  status: string | null;
  note: string | null;
  updatedAt: string | null;
  source: 'work_session' | 'task';
}

export interface TeamMemberToday {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  onlineProjectName: string | null;
  openTasksCount: number;
  topTasks: TeamMemberTodayTask[];
  latestProgress: TeamMemberLatestProgress | null;
}

type PhaseRow = {
  project_id: string;
  name: string;
  status: string | null;
  milestone_number: number | null;
  sort_order: number | null;
  display_order: number | null;
  updated_at: string | null;
};

function isCompletedPhase(status: string | null | undefined): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'completed' || normalized === 'done' || normalized.includes('complete');
}

function phaseLabel(phase: PhaseRow | null | undefined): string | null {
  if (!phase) return null;
  const phaseNumber = phase.name.match(/^(\d+(?:\.\d+)?)/)?.[1];
  const phasePart = phaseNumber ? `P${phaseNumber}` : phase.name;
  return phase.milestone_number ? `M${phase.milestone_number} ${phasePart}` : phasePart;
}

function currentPhaseByProject(phases: PhaseRow[]): Map<string, PhaseRow> {
  const grouped = new Map<string, PhaseRow[]>();
  for (const phase of phases) {
    const list = grouped.get(phase.project_id) ?? [];
    list.push(phase);
    grouped.set(phase.project_id, list);
  }

  const result = new Map<string, PhaseRow>();
  for (const [projectId, rows] of grouped.entries()) {
    const sorted = rows.sort((a, b) => {
      const milestoneA = a.milestone_number ?? 999;
      const milestoneB = b.milestone_number ?? 999;
      if (milestoneA !== milestoneB) return milestoneA - milestoneB;
      return (a.sort_order ?? a.display_order ?? 9999) - (b.sort_order ?? b.display_order ?? 9999);
    });
    result.set(
      projectId,
      sorted.find((phase) => !isCompletedPhase(phase.status)) ?? sorted.at(-1)!
    );
  }

  return result;
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
      'id, title, priority, milestone, phase_name, status, assignee_id, project_id, updated_at, project:projects!tasks_project_id_fkey(id, name)'
    )
    .in('assignee_id', profileIds)
    .neq('status', 'Done')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: latestSessions } = await supabase
    .from('work_sessions')
    .select(
      'profile_id, project_id, started_at, ended_at, summary, clock_in_note, project:projects!work_sessions_project_id_fkey(id, name)'
    )
    .in('profile_id', profileIds)
    .not('project_id', 'is', null)
    .order('started_at', { ascending: false })
    .limit(200);

  const latestSessionByProfile = new Map<
    string,
    {
      profile_id: string | null;
      project_id: string | null;
      started_at: string;
      ended_at: string | null;
      summary: string | null;
      clock_in_note: string | null;
      project:
        | { id: string; name: string | null }
        | Array<{ id: string; name: string | null }>
        | null;
    }
  >();

  for (const session of latestSessions ?? []) {
    if (!session.profile_id || latestSessionByProfile.has(session.profile_id)) continue;
    latestSessionByProfile.set(session.profile_id, session);
  }

  const tasksByAssignee = new Map<string, TeamMemberTodayTask[]>();
  const latestTaskByAssignee = new Map<string, TeamMemberTodayTask>();
  for (const t of openTasks ?? []) {
    const list = tasksByAssignee.get(t.assignee_id as string) ?? [];
    const project = Array.isArray(t.project) ? t.project[0] : t.project;
    const task = {
      id: t.id as string,
      title: t.title as string,
      projectId: (t.project_id as string) ?? null,
      projectName: (project?.name as string) ?? null,
      priority: (t.priority as string) ?? null,
      milestone: (t.milestone as string) ?? null,
      phaseName: (t.phase_name as string) ?? null,
      status: (t.status as string) ?? null,
      updatedAt: (t.updated_at as string) ?? null,
    };
    const currentLatest = latestTaskByAssignee.get(t.assignee_id as string);
    if (
      !currentLatest ||
      new Date(task.updatedAt ?? 0).getTime() > new Date(currentLatest.updatedAt ?? 0).getTime()
    ) {
      latestTaskByAssignee.set(t.assignee_id as string, task);
    }
    if (list.length >= 5) continue;
    list.push(task);
    tasksByAssignee.set(t.assignee_id as string, list);
  }

  // Count all open tasks per assignee (not capped).
  const countByAssignee = new Map<string, number>();
  for (const t of openTasks ?? []) {
    const key = t.assignee_id as string;
    countByAssignee.set(key, (countByAssignee.get(key) ?? 0) + 1);
  }

  const progressProjectIds = Array.from(
    new Set(
      [
        ...Array.from(latestSessionByProfile.values()).map((session) => session.project_id),
        ...Array.from(latestTaskByAssignee.values()).map((task) => task.projectId),
      ].filter((id): id is string => Boolean(id))
    )
  );

  const { data: phaseRows } =
    progressProjectIds.length > 0
      ? await supabase
          .from('project_phases')
          .select(
            'project_id, name, status, milestone_number, sort_order, display_order, updated_at'
          )
          .in('project_id', progressProjectIds)
          .eq('phase_type', 'phase')
      : { data: [] };
  const phaseByProject = currentPhaseByProject((phaseRows ?? []) as PhaseRow[]);

  return employees.map((e) => {
    const status = statusById.get(e.id);
    const tasks = tasksByAssignee.get(e.id) ?? [];
    const latestSession = latestSessionByProfile.get(e.id);
    const latestTask = latestTaskByAssignee.get(e.id);
    const sessionProject = latestSession
      ? Array.isArray(latestSession.project)
        ? latestSession.project[0]
        : latestSession.project
      : null;
    const latestProgress = latestSession
      ? {
          projectId: latestSession.project_id,
          projectName: sessionProject?.name ?? null,
          phaseLabel: phaseLabel(
            latestSession.project_id ? phaseByProject.get(latestSession.project_id) : null
          ),
          phaseName: latestSession.project_id
            ? (phaseByProject.get(latestSession.project_id)?.name ?? null)
            : null,
          status: latestSession.ended_at ? 'Last session' : 'Working now',
          note: latestSession.summary || latestSession.clock_in_note || null,
          updatedAt: latestSession.ended_at ?? latestSession.started_at,
          source: 'work_session' as const,
        }
      : latestTask
        ? {
            projectId: latestTask.projectId ?? null,
            projectName: latestTask.projectName,
            phaseLabel:
              latestTask.projectId && phaseByProject.has(latestTask.projectId)
                ? phaseLabel(phaseByProject.get(latestTask.projectId))
                : (latestTask.milestone ?? null),
            phaseName:
              latestTask.phaseName ??
              (latestTask.projectId
                ? (phaseByProject.get(latestTask.projectId)?.name ?? null)
                : null),
            status: latestTask.status ?? null,
            note: latestTask.title,
            updatedAt: latestTask.updatedAt ?? null,
            source: 'task' as const,
          }
        : null;
    return {
      profileId: e.id,
      fullName: e.full_name,
      avatarUrl: e.avatar_url,
      isOnline: status?.status === 'online',
      onlineProjectName: status?.projectName ?? null,
      openTasksCount: countByAssignee.get(e.id) ?? 0,
      topTasks: tasks,
      latestProgress,
    };
  });
}
