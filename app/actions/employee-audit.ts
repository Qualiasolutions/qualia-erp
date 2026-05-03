'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';

/**
 * Employee performance audit — pulls every measurable signal we have
 * about an employee (work sessions, framework reports, project assignments,
 * task completion, attendance) into one shape suitable for an interview.
 *
 * Hidden page consumer at /admin/audit/[id]. Admin-only.
 */

export type AuditOverview = {
  profileId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  daysInCompany: number;
  firstSession: string | null;
  lastSession: string | null;
};

export type AuditAttendance = {
  expectedWeekdays: number;
  attendedWeekdays: number;
  missedWeekdays: number;
  attendancePct: number;
  lateAfter10: number;
  veryLateAfterNoon: number;
};

export type AuditSessions = {
  totalSessions: number;
  totalHours: number;
  distinctWorkdays: number;
  avgSessionMin: number | null;
  unended: number;
  noProject: number;
  noPlannedOutcome: number;
  noPlannedDuration: number;
  noClockOutSummary: number;
  noReportUrl: number;
};

export type AuditReports = {
  total: number;
  verifPassed: number;
  verifFailed: number;
  verifOther: number;
  withGaps: number;
  totalGapCycles: number;
  noDeployUrl: number;
  noNotes: number;
  noClientId: number;
  noFrameworkProjectId: number;
  noQsReportId: number;
  noFrameworkVersion: number;
  distinctProjects: number;
  firstReport: string | null;
  lastReport: string | null;
};

export type AuditAssignments = {
  totalAssignments: number;
  completedAssignments: number;
  removedWithoutComplete: number;
  withDeadline: number;
  missedDeadlines: number;
};

export type AuditTasks = {
  totalAssigned: number;
  completed: number;
  doneOnTime: number;
  onTimePct: number;
  avgDaysToDone: number | null;
};

export type ProjectRow = {
  projectId: string;
  projectName: string;
  clientName: string | null;
  status: string;
  deadlineDate: string | null;
  hoursLogged: number;
  tasksOnProject: number;
  tasksDoneOnProject: number;
};

export type EmployeeAuditPayload = {
  overview: AuditOverview;
  attendance: AuditAttendance;
  sessions: AuditSessions;
  reports: AuditReports;
  assignments: AuditAssignments;
  tasks: AuditTasks;
  projects: ProjectRow[];
  latestAssessment: {
    submittedAt: string;
    responses: Record<string, unknown>;
    notes: string | null;
  } | null;
};

export type AuditIndexRow = {
  profileId: string;
  fullName: string | null;
  email: string | null;
  totalHours: number;
  attendancePct: number;
  reportsTotal: number;
  tasksDone: number;
  hasAssessment: boolean;
};

const REPORT_AUTHOR_ALIASES: Record<string, string[]> = {
  'hasan@qualiasolutions.net': ['Hasan Jahouse', 'Hasan'],
  'moayad@qualiasolutions.net': ['Moayad', 'Moayad Alqam'],
};

function aliasesFor(email: string | null): string[] {
  if (!email) return [];
  return REPORT_AUTHOR_ALIASES[email.toLowerCase()] ?? [];
}

async function authorizeAdmin(): Promise<
  { ok: false } | { ok: true; client: Awaited<ReturnType<typeof createClient>> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return { ok: false };
  return { ok: true, client: supabase };
}

export async function getAuditIndex(): Promise<AuditIndexRow[]> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return [];
  const supabase = auth.client;

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'employee')
    .order('full_name');

  if (!employees) return [];

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const [sessionsRes, assessmentRes] = await Promise.all([
        supabase
          .from('work_sessions')
          .select('duration_minutes, started_at')
          .eq('profile_id', emp.id),
        supabase
          .from('employee_self_assessments')
          .select('id')
          .eq('profile_id', emp.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const totalMinutes = (sessionsRes.data ?? []).reduce(
        (sum, s) => sum + (s.duration_minutes ?? 0),
        0
      );
      const distinctDays = new Set(
        (sessionsRes.data ?? []).map((s) => new Date(s.started_at as string).toDateString())
      ).size;

      // Light attendance proxy
      const aliases = aliasesFor(emp.email);
      const reportsCountQuery = aliases.length
        ? supabase
            .from('session_reports')
            .select('id', { count: 'exact', head: true })
            .in('submitted_by', aliases)
        : null;
      const tasksDoneQuery = supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', emp.id)
        .not('completed_at', 'is', null);

      const [reportsRes, tasksRes] = await Promise.all([
        reportsCountQuery ?? Promise.resolve({ count: 0 }),
        tasksDoneQuery,
      ]);

      const expectedWorkdays = Math.max(distinctDays, 1);
      const attendancePct = Math.min(100, Math.round((distinctDays / expectedWorkdays) * 100));

      return {
        profileId: emp.id,
        fullName: emp.full_name,
        email: emp.email,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        attendancePct,
        reportsTotal: reportsRes.count ?? 0,
        tasksDone: tasksRes.count ?? 0,
        hasAssessment: Boolean(assessmentRes.data),
      } satisfies AuditIndexRow;
    })
  );

  return rows;
}

export async function getEmployeeAudit(profileId: string): Promise<EmployeeAuditPayload | null> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return null;
  const supabase = auth.client;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) return null;

  const aliases = aliasesFor(profile.email);

  const [
    sessionsRowsRes,
    sessionsAggRes,
    reportsRes,
    assignmentsRes,
    tasksAggRes,
    projectsRes,
    assessmentRes,
  ] = await Promise.all([
    // For attendance pattern
    supabase
      .from('work_sessions')
      .select(
        'started_at, ended_at, duration_minutes, project_id, clock_in_note, planned_duration_minutes, summary, report_url'
      )
      .eq('profile_id', profileId)
      .order('started_at', { ascending: true }),

    // Agg
    supabase.from('work_sessions').select('duration_minutes').eq('profile_id', profileId),

    aliases.length
      ? supabase
          .from('session_reports')
          .select(
            'verification, gap_cycles, deployed_url, notes, client_id, framework_project_id, client_report_id, framework_version, project_name, submitted_at'
          )
          .in('submitted_by', aliases)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),

    supabase
      .from('project_assignments')
      .select('completed_at, removed_at, deadline_date')
      .eq('employee_id', profileId),

    supabase
      .from('tasks')
      .select('completed_at, due_date, created_at')
      .eq('assignee_id', profileId),

    supabase
      .from('project_assignments')
      .select(
        `
        assigned_at, deadline_date, completed_at, removed_at,
        project:projects!project_assignments_project_id_fkey (
          id, name, status,
          client:clients!projects_client_id_fkey (id, name)
        )
      `
      )
      .eq('employee_id', profileId)
      .order('assigned_at', { ascending: true }),

    supabase
      .from('employee_self_assessments')
      .select('submitted_at, responses, notes')
      .eq('profile_id', profileId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  /* OVERVIEW */
  const sessions = (sessionsRowsRes.data ?? []) as Array<{
    started_at: string;
    ended_at: string | null;
    duration_minutes: number | null;
    project_id: string | null;
    clock_in_note: string | null;
    planned_duration_minutes: number | null;
    summary: string | null;
    report_url: string | null;
  }>;

  const firstSession = sessions[0]?.started_at ?? null;
  const lastSession = sessions[sessions.length - 1]?.started_at ?? null;
  const daysInCompany = Math.max(
    0,
    Math.round(
      (Date.now() - new Date(profile.created_at as string).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  /* ATTENDANCE — derived in JS so we can be timezone-aware (Cyprus) */
  const TZ = 'Europe/Nicosia';
  const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

  const dayMap = new Map<string, { earliestHour: number }>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    const key = dayKey(d);
    const hour = parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hour: '2-digit',
        hour12: false,
      }).format(d),
      10
    );
    const prev = dayMap.get(key);
    if (!prev || hour < prev.earliestHour) dayMap.set(key, { earliestHour: hour });
  }

  let expectedWeekdays = 0;
  if (firstSession) {
    const start = new Date(firstSession);
    const end = new Date();
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    while (cur <= stop) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) expectedWeekdays += 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  const attendedWeekdays = dayMap.size;
  const missedWeekdays = Math.max(0, expectedWeekdays - attendedWeekdays);
  const attendancePct =
    expectedWeekdays > 0 ? Math.round((attendedWeekdays / expectedWeekdays) * 100) : 0;
  let lateAfter10 = 0;
  let veryLateAfterNoon = 0;
  for (const { earliestHour } of dayMap.values()) {
    if (earliestHour >= 10) lateAfter10 += 1;
    if (earliestHour >= 12) veryLateAfterNoon += 1;
  }

  /* SESSIONS */
  const aggRows = (sessionsAggRes.data ?? []) as Array<{ duration_minutes: number | null }>;
  const totalMinutes = aggRows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const filledDur = aggRows.filter((r) => r.duration_minutes != null);
  const avgSessionMin =
    filledDur.length > 0
      ? Math.round(filledDur.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) / filledDur.length)
      : null;

  const auditSessions: AuditSessions = {
    totalSessions: sessions.length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    distinctWorkdays: dayMap.size,
    avgSessionMin,
    unended: sessions.filter((s) => s.ended_at == null).length,
    noProject: sessions.filter((s) => !s.project_id).length,
    noPlannedOutcome: sessions.filter((s) => !s.clock_in_note).length,
    noPlannedDuration: sessions.filter((s) => s.planned_duration_minutes == null).length,
    noClockOutSummary: sessions.filter((s) => !s.summary).length,
    noReportUrl: sessions.filter((s) => !s.report_url).length,
  };

  /* REPORTS */
  type ReportRow = {
    verification: string | null;
    gap_cycles: number | null;
    deployed_url: string | null;
    notes: string | null;
    client_id: string | null;
    framework_project_id: string | null;
    client_report_id: string | null;
    framework_version: string | null;
    project_name: string | null;
    submitted_at: string | null;
  };
  const reportsRows = (reportsRes.data ?? []) as ReportRow[];
  const reports: AuditReports = {
    total: reportsRows.length,
    verifPassed: reportsRows.filter((r) => r.verification === 'pass').length,
    verifFailed: reportsRows.filter((r) => r.verification === 'fail').length,
    verifOther: reportsRows.filter(
      (r) => r.verification == null || (r.verification !== 'pass' && r.verification !== 'fail')
    ).length,
    withGaps: reportsRows.filter((r) => (r.gap_cycles ?? 0) > 0).length,
    totalGapCycles: reportsRows.reduce((s, r) => s + (r.gap_cycles ?? 0), 0),
    noDeployUrl: reportsRows.filter((r) => !r.deployed_url).length,
    noNotes: reportsRows.filter((r) => !r.notes).length,
    noClientId: reportsRows.filter((r) => !r.client_id).length,
    noFrameworkProjectId: reportsRows.filter((r) => !r.framework_project_id).length,
    noQsReportId: reportsRows.filter((r) => !r.client_report_id).length,
    noFrameworkVersion: reportsRows.filter((r) => !r.framework_version).length,
    distinctProjects: new Set(reportsRows.map((r) => r.project_name).filter(Boolean)).size,
    firstReport:
      reportsRows.reduce<string | null>(
        (min, r) => (r.submitted_at && (!min || r.submitted_at < min) ? r.submitted_at : min),
        null
      ) ?? null,
    lastReport:
      reportsRows.reduce<string | null>(
        (max, r) => (r.submitted_at && (!max || r.submitted_at > max) ? r.submitted_at : max),
        null
      ) ?? null,
  };

  /* ASSIGNMENTS */
  type AssignmentRow = {
    completed_at: string | null;
    removed_at: string | null;
    deadline_date: string | null;
  };
  const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];
  const assignments: AuditAssignments = {
    totalAssignments: assignmentRows.length,
    completedAssignments: assignmentRows.filter((a) => a.completed_at != null).length,
    removedWithoutComplete: assignmentRows.filter(
      (a) => a.removed_at != null && a.completed_at == null
    ).length,
    withDeadline: assignmentRows.filter((a) => a.deadline_date != null).length,
    missedDeadlines: assignmentRows.filter(
      (a) =>
        a.deadline_date != null && new Date(a.deadline_date) < new Date() && a.completed_at == null
    ).length,
  };

  /* TASKS */
  type TaskRow = { completed_at: string | null; due_date: string | null; created_at: string };
  const taskRows = (tasksAggRes.data ?? []) as TaskRow[];
  const completed = taskRows.filter((t) => t.completed_at != null);
  const onTime = completed.filter(
    (t) => !t.due_date || new Date(t.completed_at as string) <= new Date(`${t.due_date}T23:59:59Z`)
  );
  const avgDays =
    completed.length > 0
      ? Math.round(
          (completed.reduce(
            (s, t) =>
              s + (new Date(t.completed_at as string).getTime() - new Date(t.created_at).getTime()),
            0
          ) /
            completed.length /
            (1000 * 60 * 60 * 24)) *
            10
        ) / 10
      : null;
  const tasks: AuditTasks = {
    totalAssigned: taskRows.length,
    completed: completed.length,
    doneOnTime: onTime.length,
    onTimePct: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
    avgDaysToDone: avgDays,
  };

  /* PROJECTS */
  type ProjectRaw = {
    project:
      | {
          id: string;
          name: string;
          status: string;
          client:
            | { id: string; name: string | null }
            | Array<{ id: string; name: string | null }>
            | null;
        }
      | Array<{
          id: string;
          name: string;
          status: string;
          client:
            | { id: string; name: string | null }
            | Array<{ id: string; name: string | null }>
            | null;
        }>
      | null;
    deadline_date: string | null;
  };
  const projectsRaw = (projectsRes.data ?? []) as ProjectRaw[];

  // Aggregate hours/tasks per project
  const projectMap = new Map<string, ProjectRow>();
  for (const row of projectsRaw) {
    const proj = Array.isArray(row.project) ? row.project[0] : row.project;
    if (!proj) continue;
    const client = Array.isArray(proj.client) ? proj.client[0] : proj.client;
    if (!projectMap.has(proj.id)) {
      projectMap.set(proj.id, {
        projectId: proj.id,
        projectName: proj.name,
        clientName: client?.name ?? null,
        status: proj.status,
        deadlineDate: row.deadline_date,
        hoursLogged: 0,
        tasksOnProject: 0,
        tasksDoneOnProject: 0,
      });
    }
  }

  if (projectMap.size > 0) {
    const projectIds = Array.from(projectMap.keys());
    const [hoursRes, projTasksRes] = await Promise.all([
      supabase
        .from('work_sessions')
        .select('project_id, duration_minutes')
        .eq('profile_id', profileId)
        .in('project_id', projectIds),
      supabase
        .from('tasks')
        .select('project_id, completed_at')
        .eq('assignee_id', profileId)
        .in('project_id', projectIds),
    ]);
    for (const ws of (hoursRes.data ?? []) as Array<{
      project_id: string;
      duration_minutes: number | null;
    }>) {
      const row = projectMap.get(ws.project_id);
      if (row) row.hoursLogged += (ws.duration_minutes ?? 0) / 60;
    }
    for (const t of (projTasksRes.data ?? []) as Array<{
      project_id: string;
      completed_at: string | null;
    }>) {
      const row = projectMap.get(t.project_id);
      if (row) {
        row.tasksOnProject += 1;
        if (t.completed_at) row.tasksDoneOnProject += 1;
      }
    }
    for (const row of projectMap.values()) {
      row.hoursLogged = Math.round(row.hoursLogged * 10) / 10;
    }
  }

  /* OVERVIEW */
  const overview: AuditOverview = {
    profileId: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    daysInCompany,
    firstSession,
    lastSession,
  };

  return {
    overview,
    attendance: {
      expectedWeekdays,
      attendedWeekdays,
      missedWeekdays,
      attendancePct,
      lateAfter10,
      veryLateAfterNoon,
    },
    sessions: auditSessions,
    reports,
    assignments,
    tasks,
    projects: Array.from(projectMap.values()).sort((a, b) => b.hoursLogged - a.hoursLogged),
    latestAssessment: assessmentRes.data
      ? {
          submittedAt: assessmentRes.data.submitted_at as string,
          responses: (assessmentRes.data.responses ?? {}) as Record<string, unknown>,
          notes: (assessmentRes.data.notes ?? null) as string | null,
        }
      : null,
  };
}

export async function submitSelfAssessment(
  profileId: string,
  responses: Record<string, unknown>,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: 'Admin only.' };
  const supabase = auth.client;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not signed in.' };

  const { error } = await supabase.from('employee_self_assessments').insert({
    profile_id: profileId,
    responses,
    notes,
    submitted_by: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/audit/${profileId}`);
  revalidatePath('/admin/audit');
  return { success: true };
}
