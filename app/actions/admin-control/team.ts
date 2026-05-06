'use server';

import { createClient } from '@/lib/supabase/server';
import { getTeamMembers } from '@/app/actions/admin';
import { getTeamStatus } from '@/app/actions/work-sessions';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import type { AdminProfile } from '@/app/actions/admin';
import type { TeamMemberStatus } from '@/app/actions/work-sessions';

type TaskStatus = 'Todo' | 'In Progress' | 'Done' | 'Canceled';
type TaskPriority = 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';

export type AssignmentProject = {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
};

export type TeamTaskStub = {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  updatedAt: string;
};

export type TeamProjectLoad = {
  projectId: string | null;
  projectName: string;
  weightedLoad: number;
  taskCount: number;
};

export type TeamWorkloadPerson = {
  profileId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  status: TeamMemberStatus['status'];
  sessionId: string | null;
  sessionStartedAt: string | null;
  sessionProjectName: string | null;
  weightedLoad: number;
  capacityRatio: number;
  activeTaskCount: number;
  completedThisWeek: number;
  hoursThisWeek: number;
  inboxUnscheduled: number;
  overdueTasks: TeamTaskStub[];
  dueThisWeek: TeamTaskStub[];
  staleTasks: TeamTaskStub[];
  projectLoads: TeamProjectLoad[];
  latestBlocker: {
    reportId: string;
    projectName: string;
    notes: string | null;
    gapCycles: number;
    submittedAt: string | null;
  } | null;
};

export type TeamPayload = {
  workspaceId: string | null;
  members: AdminProfile[];
  liveStatus: TeamMemberStatus[];
  workload: TeamWorkloadPerson[];
  summary: {
    activePeople: number;
    completedThisWeek: number;
    overdueTasks: number;
    blockedPeople: number;
    overloadedPeople: number;
  };
  assignments: {
    employees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
    projects: AssignmentProject[];
    /** Employee id → set of project ids they're assigned to */
    matrix: Record<string, string[]>;
  };
};

export async function loadTeamTab(): Promise<TeamPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return {
      workspaceId: null,
      members: [],
      liveStatus: [],
      workload: [],
      summary: {
        activePeople: 0,
        completedThisWeek: 0,
        overdueTasks: 0,
        blockedPeople: 0,
        overloadedPeople: 0,
      },
      assignments: { employees: [], projects: [], matrix: {} },
    };
  }

  const workspaceId = await getCurrentWorkspaceId();

  const [membersRes, liveStatus, assignmentsData] = await Promise.all([
    getTeamMembers(),
    workspaceId ? getTeamStatus(workspaceId) : Promise.resolve([]),
    loadAssignmentMatrix(workspaceId),
  ]);

  const members = (membersRes.success ? (membersRes.data as AdminProfile[]) : []) ?? [];
  const workload = workspaceId ? await loadTeamWorkload(workspaceId, members, liveStatus) : [];

  return {
    members,
    liveStatus,
    workload,
    summary: {
      activePeople: workload.filter((p) => p.status === 'online').length,
      completedThisWeek: workload.reduce((sum, p) => sum + p.completedThisWeek, 0),
      overdueTasks: workload.reduce((sum, p) => sum + p.overdueTasks.length, 0),
      blockedPeople: workload.filter((p) => p.latestBlocker || p.staleTasks.length > 0).length,
      overloadedPeople: workload.filter((p) => p.capacityRatio >= 1).length,
    },
    workspaceId,
    assignments: assignmentsData,
  };
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  Urgent: 3,
  High: 2,
  Medium: 1,
  Low: 0.5,
  'No Priority': 0.5,
};

const ACTIVE_STATUSES: TaskStatus[] = ['Todo', 'In Progress'];
const DEFAULT_CAPACITY = 10;

function weekStart(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function weekEnd(d = new Date()): Date {
  const out = weekStart(d);
  out.setDate(out.getDate() + 7);
  return out;
}

function normalizeAuthor(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function authorMatches(member: AdminProfile, author: string | null | undefined): boolean {
  const a = normalizeAuthor(author);
  if (!a) return false;
  const full = normalizeAuthor(member.full_name);
  const email = normalizeAuthor(member.email);
  return a === full || a === email || (full.length > 0 && a.includes(full));
}

async function loadTeamWorkload(
  workspaceId: string,
  members: AdminProfile[],
  liveStatus: TeamMemberStatus[]
): Promise<TeamWorkloadPerson[]> {
  if (members.length === 0) return [];

  const supabase = await createClient();
  const monday = weekStart();
  const sunday = weekEnd();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const staleBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const memberIds = members.map((m) => m.id);
  const [tasksRes, sessionsRes, blockersRes] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `
        id, title, assignee_id, status, priority, due_date, updated_at, completed_at, created_at, show_in_inbox, project_id,
        project:projects!tasks_project_id_fkey (id, name)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('assignee_id', memberIds)
      .or(
        `status.in.(${ACTIVE_STATUSES.join(',')}),and(status.eq.Done,completed_at.gte.${monday.toISOString()})`
      )
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('work_sessions')
      .select('profile_id, duration_minutes, started_at, ended_at')
      .eq('workspace_id', workspaceId)
      .in('profile_id', memberIds)
      .gte('started_at', monday.toISOString()),
    supabase
      .from('session_reports')
      .select('id, submitted_by, project_name, notes, gap_cycles, submitted_at')
      .neq('dry_run', true)
      .gt('gap_cycles', 0)
      .gte('submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('submitted_at', { ascending: false })
      .limit(100),
  ]);

  type RawTask = {
    id: string;
    title: string;
    assignee_id: string | null;
    status: TaskStatus;
    priority: TaskPriority | null;
    due_date: string | null;
    updated_at: string;
    completed_at: string | null;
    show_in_inbox: boolean;
    project_id: string | null;
    project:
      | { id: string; name: string | null }
      | Array<{ id: string; name: string | null }>
      | null;
  };

  const tasksByMember = new Map<string, RawTask[]>();
  for (const task of (tasksRes.data as RawTask[] | null) ?? []) {
    if (!task.assignee_id) continue;
    const list = tasksByMember.get(task.assignee_id) ?? [];
    list.push(task);
    tasksByMember.set(task.assignee_id, list);
  }

  const hoursByMember = new Map<string, number>();
  for (const row of (sessionsRes.data ?? []) as Array<{
    profile_id: string | null;
    duration_minutes: number | null;
    started_at: string;
    ended_at: string | null;
  }>) {
    if (!row.profile_id) continue;
    let minutes = row.duration_minutes ?? 0;
    if (!minutes && !row.ended_at) {
      minutes = Math.max(0, Math.round((Date.now() - new Date(row.started_at).getTime()) / 60000));
    }
    hoursByMember.set(row.profile_id, (hoursByMember.get(row.profile_id) ?? 0) + minutes / 60);
  }

  type RawBlocker = {
    id: string;
    submitted_by: string | null;
    project_name: string | null;
    notes: string | null;
    gap_cycles: number | null;
    submitted_at: string | null;
  };
  const blockers = (blockersRes.data as RawBlocker[] | null) ?? [];

  const statusByMember = new Map(liveStatus.map((s) => [s.profileId, s]));

  return members
    .map((member) => {
      const rows = tasksByMember.get(member.id) ?? [];
      const active = rows.filter((t) => ACTIVE_STATUSES.includes(t.status));
      const taskStub = (t: RawTask): TeamTaskStub => {
        const project = Array.isArray(t.project) ? t.project[0] : t.project;
        return {
          id: t.id,
          title: t.title,
          projectId: t.project_id,
          projectName: project?.name ?? null,
          priority: t.priority ?? 'No Priority',
          status: t.status,
          dueDate: t.due_date,
          updatedAt: t.updated_at,
        };
      };

      const projectLoadsMap = new Map<string, TeamProjectLoad>();
      let weightedLoad = 0;
      for (const t of active) {
        const weight = PRIORITY_WEIGHT[t.priority ?? 'No Priority'] ?? 0.5;
        weightedLoad += weight;
        const project = Array.isArray(t.project) ? t.project[0] : t.project;
        const key = t.project_id ?? '__none__';
        const existing =
          projectLoadsMap.get(key) ??
          ({
            projectId: t.project_id,
            projectName: project?.name ?? 'No project',
            weightedLoad: 0,
            taskCount: 0,
          } satisfies TeamProjectLoad);
        existing.weightedLoad += weight;
        existing.taskCount += 1;
        projectLoadsMap.set(key, existing);
      }

      const completedThisWeek = rows.filter(
        (t) => t.status === 'Done' && t.completed_at && new Date(t.completed_at) >= monday
      ).length;

      const overdueTasks = active
        .filter((t) => t.due_date && new Date(`${t.due_date}T00:00:00`) < today)
        .map(taskStub)
        .slice(0, 5);

      const dueThisWeek = active
        .filter((t) => {
          if (!t.due_date) return false;
          const due = new Date(`${t.due_date}T00:00:00`);
          return due >= today && due < sunday;
        })
        .map(taskStub)
        .slice(0, 6);

      const staleTasks = active
        .filter((t) => t.status === 'In Progress' && t.updated_at < staleBefore)
        .map(taskStub)
        .slice(0, 5);

      const latestBlockerRaw = blockers.find((b) => authorMatches(member, b.submitted_by));
      const live = statusByMember.get(member.id);

      return {
        profileId: member.id,
        fullName: member.full_name,
        email: member.email,
        avatarUrl: member.avatar_url,
        role: member.role,
        status: live?.status ?? 'offline',
        sessionId: live?.sessionId ?? null,
        sessionStartedAt: live?.sessionStartedAt ?? null,
        sessionProjectName: live?.projectName ?? null,
        weightedLoad: Math.round(weightedLoad * 10) / 10,
        capacityRatio: Math.round((weightedLoad / DEFAULT_CAPACITY) * 100) / 100,
        activeTaskCount: active.length,
        completedThisWeek,
        hoursThisWeek: Math.round((hoursByMember.get(member.id) ?? 0) * 10) / 10,
        inboxUnscheduled: active.filter(
          (t) => t.status === 'Todo' && t.show_in_inbox && !t.due_date
        ).length,
        overdueTasks,
        dueThisWeek,
        staleTasks,
        projectLoads: Array.from(projectLoadsMap.values()).sort(
          (a, b) => b.weightedLoad - a.weightedLoad
        ),
        latestBlocker: latestBlockerRaw
          ? {
              reportId: latestBlockerRaw.id,
              projectName: latestBlockerRaw.project_name ?? 'Framework report',
              notes: latestBlockerRaw.notes,
              gapCycles: latestBlockerRaw.gap_cycles ?? 0,
              submittedAt: latestBlockerRaw.submitted_at,
            }
          : null,
      } satisfies TeamWorkloadPerson;
    })
    .sort((a, b) => {
      if (a.latestBlocker && !b.latestBlocker) return -1;
      if (!a.latestBlocker && b.latestBlocker) return 1;
      if (a.capacityRatio !== b.capacityRatio) return b.capacityRatio - a.capacityRatio;
      return (a.fullName ?? '').localeCompare(b.fullName ?? '');
    });
}

async function loadAssignmentMatrix(workspaceId: string | null) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from('project_assignments')
    .select(
      `
      project_id,
      employee_id,
      employee:profiles!project_assignments_employee_id_fkey (id, full_name, avatar_url),
      project:projects!project_assignments_project_id_fkey (id, name, client_id, client:clients (id, name, display_name))
    `
    )
    .eq('workspace_id', workspaceId ?? '')
    .is('removed_at', null);

  const employeesMap = new Map<
    string,
    { id: string; full_name: string | null; avatar_url: string | null }
  >();
  const projectsMap = new Map<string, AssignmentProject>();
  const matrix: Record<string, string[]> = {};

  for (const a of assignments ?? []) {
    const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
    const proj = Array.isArray(a.project) ? a.project[0] : a.project;
    if (!emp || !proj) continue;

    employeesMap.set(emp.id, {
      id: emp.id,
      full_name: emp.full_name,
      avatar_url: emp.avatar_url,
    });

    if (!projectsMap.has(proj.id)) {
      const clientRel = Array.isArray(proj.client) ? proj.client[0] : proj.client;
      projectsMap.set(proj.id, {
        id: proj.id,
        name: proj.name,
        client_id: proj.client_id ?? null,
        client_name: clientRel?.display_name ?? clientRel?.name ?? null,
      });
    }

    matrix[emp.id] = matrix[emp.id] ?? [];
    if (!matrix[emp.id].includes(proj.id)) matrix[emp.id].push(proj.id);
  }

  return {
    employees: Array.from(employeesMap.values()).sort((a, b) =>
      (a.full_name ?? '').localeCompare(b.full_name ?? '')
    ),
    projects: Array.from(projectsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    matrix,
  };
}
