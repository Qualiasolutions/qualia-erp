'use server';

import { revalidatePath } from 'next/cache';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { sendInternalEmail } from '@/lib/email';
import { knowledgeAssistantModel } from '@/lib/ai/gemini-client';

/**
 * Employee performance audit — pulls every measurable signal we have
 * about an employee (work sessions, framework reports, project assignments,
 * task completion, attendance) into one shape suitable for an interview.
 *
 * Hidden page consumer at /audit/[id]. Admins can open every employee; employees
 * can open only their own audit.
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
  expectedDaysPerWeek: number;
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
  projectsWorked: number;
  attendancePct: number;
  expectedDaysPerWeek: number;
  reportsTotal: number;
  reportRatePct: number;
  hasAssessment: boolean;
};

const REPORT_AUTHOR_ALIASES: Record<string, string[]> = {
  'hasan@qualiasolutions.net': ['Hasan Jahouse', 'Hasan'],
  'moayad@qualiasolutions.net': ['Moayad', 'Moayad Alqam'],
};

/**
 * Per-employee work-week shape, set by Fawzi.
 * 5 = Mon-Fri, 6 = Mon-Sat. Default 5 for new hires.
 * TODO: move to a profiles.expected_days_per_week column when more than 2 employees.
 */
const EXPECTED_DAYS_PER_WEEK: Record<string, number> = {
  'hasan@qualiasolutions.net': 6,
  'moayad@qualiasolutions.net': 5,
};

const AUDIT_RESULT_RECIPIENT = 'info@qualiasolutions.net';

function aliasesFor(email: string | null): string[] {
  if (!email) return [];
  return REPORT_AUTHOR_ALIASES[email.toLowerCase()] ?? [];
}

function expectedDaysPerWeekFor(email: string | null): number {
  if (!email) return 5;
  return EXPECTED_DAYS_PER_WEEK[email.toLowerCase()] ?? 5;
}

/** Returns true if this DOW (0=Sun..6=Sat) is an expected work day. */
function isExpectedDay(dow: number, daysPerWeek: number): boolean {
  if (daysPerWeek >= 7) return true;
  if (daysPerWeek === 6) return dow >= 1 && dow <= 6; // Mon-Sat
  if (daysPerWeek === 5) return dow >= 1 && dow <= 5; // Mon-Fri
  if (daysPerWeek === 4) return dow >= 1 && dow <= 4; // Mon-Thu
  return dow !== 0 && dow !== 6; // fallback
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

async function authorizeAuditAccess(profileId: string): Promise<
  | { ok: false }
  | {
      ok: true;
      client: ReturnType<typeof createAdminClient>;
      isAdmin: boolean;
      userId: string;
    }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin && user.id !== profileId) return { ok: false };

  return {
    ok: true,
    client: createAdminClient(),
    isAdmin,
    userId: user.id,
  };
}

export async function getAuditIndex(): Promise<AuditIndexRow[]> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return [];
  const supabase = createAdminClient();

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'employee')
    .order('full_name');

  if (!employees) return [];

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const aliases = aliasesFor(emp.email);
      const expectedDaysPerWeek = expectedDaysPerWeekFor(emp.email);

      const [sessionsRes, assignmentsRes, reportsRes, assessmentRes] = await Promise.all([
        supabase
          .from('work_sessions')
          .select('started_at')
          .eq('profile_id', emp.id)
          .order('started_at', { ascending: true }),
        supabase.from('project_assignments').select('project_id').eq('employee_id', emp.id),
        aliases.length
          ? supabase
              .from('session_reports')
              .select('id', { count: 'exact', head: true })
              .in('submitted_by', aliases)
          : Promise.resolve({ count: 0 }),
        supabase
          .from('employee_self_assessments')
          .select('id')
          .eq('profile_id', emp.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const sessions = (sessionsRes.data ?? []) as Array<{ started_at: string }>;
      const dayMap = sessionPerDayMap(sessions);
      const expectedWorkdays = countExpectedDays(
        sessions[0]?.started_at ?? null,
        expectedDaysPerWeek
      );
      const attended = dayMap.size;
      const attendancePct =
        expectedWorkdays > 0 ? Math.min(100, Math.round((attended / expectedWorkdays) * 100)) : 0;

      const projectsWorked = new Set(
        ((assignmentsRes.data ?? []) as Array<{ project_id: string | null }>)
          .map((r) => r.project_id)
          .filter(Boolean)
      ).size;

      const totalSessions = sessions.length;
      const reportsTotal = reportsRes.count ?? 0;
      const reportRatePct =
        totalSessions > 0 ? Math.round((reportsTotal / totalSessions) * 100) : 0;

      return {
        profileId: emp.id,
        fullName: emp.full_name,
        email: emp.email,
        projectsWorked,
        attendancePct,
        expectedDaysPerWeek,
        reportsTotal,
        reportRatePct,
        hasAssessment: Boolean(assessmentRes.data),
      } satisfies AuditIndexRow;
    })
  );

  return rows;
}

const TZ = 'Europe/Nicosia';
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

function sessionPerDayMap(
  sessions: Array<{ started_at: string }>
): Map<string, { earliestHour: number }> {
  const map = new Map<string, { earliestHour: number }>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    const key = dayKey(d);
    const hour = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d),
      10
    );
    const prev = map.get(key);
    if (!prev || hour < prev.earliestHour) map.set(key, { earliestHour: hour });
  }
  return map;
}

function countExpectedDays(firstSessionISO: string | null, daysPerWeek: number): number {
  if (!firstSessionISO) return 0;
  const start = new Date(firstSessionISO);
  const end = new Date();
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let count = 0;
  while (cur <= stop) {
    if (isExpectedDay(cur.getUTCDay(), daysPerWeek)) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export type AuditExamPayload = {
  profileId: string;
  fullName: string | null;
  email: string | null;
  latestAssessment: {
    submittedAt: string;
    responses: Record<string, unknown>;
  } | null;
};

/**
 * Lightweight loader for the standalone /audit/[id] exam page.
 * Returns just what the questionnaire needs — no metrics, no projects,
 * no attendance data — so the page renders fast and stays focused.
 */
export async function getAuditExam(profileId: string): Promise<AuditExamPayload | null> {
  const auth = await authorizeAuditAccess(profileId);
  if (!auth.ok) return null;
  const supabase = auth.client;

  const [profileRes, assessmentRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('id', profileId).maybeSingle(),
    supabase
      .from('employee_self_assessments')
      .select('submitted_at, responses')
      .eq('profile_id', profileId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profileRes.data) return null;
  return {
    profileId: profileRes.data.id,
    fullName: profileRes.data.full_name,
    email: profileRes.data.email,
    latestAssessment: assessmentRes.data
      ? {
          submittedAt: assessmentRes.data.submitted_at as string,
          responses: (assessmentRes.data.responses ?? {}) as Record<string, unknown>,
        }
      : null,
  };
}

export async function getEmployeeAudit(profileId: string): Promise<EmployeeAuditPayload | null> {
  const auth = await authorizeAuditAccess(profileId);
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

  /* ATTENDANCE — per-employee work-week shape */
  const expectedDaysPerWeek = expectedDaysPerWeekFor(profile.email);
  const dayMap = sessionPerDayMap(sessions);
  const expectedWeekdays = countExpectedDays(firstSession, expectedDaysPerWeek);
  const attendedWeekdays = dayMap.size;
  const missedWeekdays = Math.max(0, expectedWeekdays - attendedWeekdays);
  const attendancePct =
    expectedWeekdays > 0
      ? Math.min(100, Math.round((attendedWeekdays / expectedWeekdays) * 100))
      : 0;
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
      expectedDaysPerWeek,
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
          notes: auth.isAdmin ? ((assessmentRes.data.notes ?? null) as string | null) : null,
        }
      : null,
  };
}

function asText(value: unknown): string {
  if (value == null || value === '') return 'Not answered';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TEN_MILESTONE_LABELS: Record<string, string> = {
  '<2w': 'Under 2 weeks',
  '2-4w': '2–4 weeks',
  '1-2m': '1–2 months',
  '2-3m': '2–3 months',
  '3m+': '3+ months',
  never: 'Never done one',
};

const CLIENT_COMMS_LABELS: Record<string, string> = {
  confident: 'Yes — confidently, kickoff to handoff',
  light_review: 'Yes, with light review on emails / scope',
  partial: 'Partial — mid-project only, not kickoff or handoff',
  no: 'No — needs full support on client comms',
};

const FREQ_LABELS: Record<string, string> = {
  always: 'Always / Full',
  usually: 'Usually',
  sometimes: 'Sometimes',
  no: 'No / Escalates first',
};

const SOLO_COUNT_LABELS: Record<string, string> = {
  many: 'Yes, many times',
  few: 'A few times',
  once: 'Once',
  never: 'Never',
};

function asList(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'None ticked';
  return value.map(String).join(', ');
}

function asScale(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not answered';
  return `${value} / 10`;
}

function asLabeled(value: unknown, labels: Record<string, string>): string {
  if (typeof value !== 'string' || value === '') return 'Not answered';
  return labels[value] ?? value;
}

function formatResponseBlock(responses: Record<string, unknown>): string {
  const rows: Array<[string, string]> = [
    ['Framework commands mastered', asList(responses.frameworkCommandsMastered)],
    ['Solo-capable project types', asList(responses.soloCapableProjectTypes)],
    [
      '10-milestone V5 project completion time',
      asLabeled(responses.tenMilestoneTime, TEN_MILESTONE_LABELS),
    ],
    ['Client comms 0 → handoff alone', asLabeled(responses.clientCommsAlone, CLIENT_COMMS_LABELS)],
    ['Closes /qualia-verify gaps alone', asLabeled(responses.gapClosureAlone, FREQ_LABELS)],
    ['Shipped a phase to prod solo', asLabeled(responses.shippedSoloCount, SOLO_COUNT_LABELS)],
    ['Production debug default move', asLabeled(responses.debugComfort, FREQ_LABELS)],
    ['Framework add-on / extension fluency', asScale(responses.frameworkAddonScore)],
    ['Overall V5 mastery (self-rated)', asScale(responses.overallMastery)],
    ['Client handoff confidence', asScale(responses.clientHandoffConfidence)],
    ['Weak spots (not yet for solo)', asList(responses.weakSpots)],
    ['Last solo project', asText(responses.lastSoloProject)],
    ['Wished-for command', asText(responses.wishedCommand)],
    ['What feels broken / unclear', asText(responses.unclearOrBroken)],
    ['"Yes, give me solo" project type', asText(responses.yesGiveMeSolo)],
    ['Scenario · inherit a Qualia project mid-build', asText(responses.scenarioInheritProject)],
    [
      'Scenario · white page on mobile, debug walkthrough',
      asText(responses.scenarioWhitePageMobile),
    ],
    ['Scenario · code they are proud of (last 30 days)', asText(responses.scenarioCodeYouProud)],
    [
      'Scenario · client asks for an AI agent — first 3 questions',
      asText(responses.scenarioClientAIBrief),
    ],
    ['Scenario · stuck on a bug 2 hours, next move', asText(responses.scenarioStuckTwoHours)],
    ['Scenario · 8s page load, where they look first', asText(responses.scenarioSlowPage)],
    ['Scenario · PR review checks before approving', asText(responses.scenarioPRReview)],
    ['Scenario · client says "make it pop", what they ask', asText(responses.scenarioVagueRequest)],
    [
      'Scenario · NOT NULL on a 10M-row live table — plan',
      asText(responses.scenarioRiskyMigration),
    ],
    ['Scenario · day 1 of new project, first commit', asText(responses.scenarioFirstCommit)],
  ];

  return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

function buildAuditResultEmail(params: {
  audit: EmployeeAuditPayload;
  responses: Record<string, unknown>;
  notes: string | null;
}): { subject: string; html: string; text: string } {
  const { audit, responses, notes } = params;
  const name = audit.overview.fullName ?? audit.overview.email ?? 'Employee';
  const reportRate =
    audit.sessions.totalSessions > 0
      ? Math.round((audit.reports.total / audit.sessions.totalSessions) * 100)
      : 0;
  const topProjects = audit.projects
    .slice(0, 5)
    .map((project) => `${project.projectName} (${project.hoursLogged.toFixed(1)}h)`)
    .join(', ');
  const responseBlock = formatResponseBlock(responses);

  const overallMastery = asScale(responses.overallMastery);
  const addonFluency = asScale(responses.frameworkAddonScore);
  const handoffConfidence = asScale(responses.clientHandoffConfidence);
  const commandsMastered = Array.isArray(responses.frameworkCommandsMastered)
    ? `${responses.frameworkCommandsMastered.length} commands`
    : '0 commands';
  const soloProjectTypes = Array.isArray(responses.soloCapableProjectTypes)
    ? `${responses.soloCapableProjectTypes.length} project types`
    : '0 project types';

  const subject = `${name} — Framework V5 capability audit`;
  const text = [
    `${name} — Qualia Framework V5 capability audit`,
    '',
    `Email: ${audit.overview.email ?? 'Unknown'}`,
    `Self-rated overall V5 mastery: ${overallMastery}`,
    `Framework add-on / extension fluency: ${addonFluency}`,
    `Client handoff confidence: ${handoffConfidence}`,
    `Commands marked mastered: ${commandsMastered}`,
    `Project types takeable solo: ${soloProjectTypes}`,
    `Attendance: ${audit.attendance.attendancePct}% (${audit.attendance.attendedWeekdays}/${audit.attendance.expectedWeekdays} expected days)`,
    `Reports: ${audit.reports.total}/${audit.sessions.totalSessions} sessions (${reportRate}%)`,
    `Projects worked: ${audit.projects.length}`,
    topProjects
      ? `Top projects by logged time: ${topProjects}`
      : 'Top projects by logged time: none',
    '',
    'Self-assessment answers:',
    responseBlock,
    '',
    notes ? `Private notes:\n${notes}` : 'Private notes: none',
    '',
    `Open the ERP Knowledge agent: ${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.qualiasolutions.net'}/knowledge`,
  ].join('\n');

  const htmlRows = [
    ['Overall V5 mastery (self-rated)', overallMastery],
    ['Framework add-on / extension fluency', addonFluency],
    ['Client handoff confidence', handoffConfidence],
    ['Commands marked mastered', commandsMastered],
    ['Project types takeable solo', soloProjectTypes],
    [
      'Attendance',
      `${audit.attendance.attendancePct}% (${audit.attendance.attendedWeekdays}/${audit.attendance.expectedWeekdays} expected days)`,
    ],
    ['Reports', `${audit.reports.total}/${audit.sessions.totalSessions} sessions (${reportRate}%)`],
    ['Projects worked', audit.projects.length.toString()],
    ['Top projects by logged time', topProjects || 'None'],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#667085;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#101828;font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#101828;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f6f7f8;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #eaecf0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px;border-bottom:1px solid #eaecf0;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#667085;font-weight:700;">Qualia ERP</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;">${escapeHtml(name)} — Framework V5 capability audit</h1>
          <p style="margin:8px 0 0;color:#667085;font-size:14px;">${escapeHtml(audit.overview.email ?? 'Unknown email')}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${htmlRows}</table>
          <h2 style="margin:28px 0 10px;font-size:15px;">Assessment answers</h2>
          <pre style="white-space:pre-wrap;margin:0;padding:16px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;color:#344054;font-size:13px;line-height:1.55;">${escapeHtml(responseBlock)}</pre>
          <h2 style="margin:28px 0 10px;font-size:15px;">Private notes</h2>
          <pre style="white-space:pre-wrap;margin:0;padding:16px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;color:#344054;font-size:13px;line-height:1.55;">${escapeHtml(notes || 'None')}</pre>
          <p style="margin:24px 0 0;color:#667085;font-size:13px;">ERP Knowledge agent: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.qualiasolutions.net'}/knowledge" style="color:#008b95;">open knowledge page</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function submitSelfAssessment(
  profileId: string,
  responses: Record<string, unknown>,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAuditAccess(profileId);
  if (!auth.ok) return { success: false, error: 'You can only submit your own assessment.' };
  const supabase = auth.client;

  const { error } = await supabase.from('employee_self_assessments').insert({
    profile_id: profileId,
    responses,
    notes: auth.isAdmin ? notes : null,
    submitted_by: auth.userId,
  });

  if (error) return { success: false, error: error.message };

  // Email is best-effort — DB write is the source of truth. If notification
  // fails (Resend unconfigured, transient network, etc.), the assessment is
  // still saved and the user should still see success. Log the email
  // failure so admins can investigate without blocking the submission UX.
  const audit = await getEmployeeAudit(profileId);
  if (audit) {
    try {
      const email = buildAuditResultEmail({
        audit,
        responses,
        notes: auth.isAdmin ? notes : null,
      });
      const emailResult = await sendInternalEmail({
        to: AUDIT_RESULT_RECIPIENT,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (!emailResult.success) {
        console.warn(
          '[submitSelfAssessment] result email skipped:',
          emailResult.error ?? 'unknown'
        );
      }
    } catch (e) {
      console.warn('[submitSelfAssessment] result email threw:', e);
    }
  }

  revalidatePath(`/audit/${profileId}`);
  revalidatePath(`/admin/audit/${profileId}`);
  revalidatePath('/admin/audit');
  return { success: true };
}

// ============================================================================
// Drift analysis — compare self-assessment vs actual data using OpenRouter
// ============================================================================

export type AuditDriftFinding = {
  severity: 'high' | 'medium' | 'low' | 'aligned';
  dimension: string;
  claim: string;
  actual: string;
  explanation: string;
};

export type AuditDriftReport = {
  summary: string;
  honestyScore: number;
  findings: AuditDriftFinding[];
  generatedAt: string;
};

const DriftSchema = z.object({
  summary: z
    .string()
    .describe('Two to three sentences summarising overall calibration between claims and data.'),
  honesty_score: z
    .number()
    .min(1)
    .max(10)
    .describe(
      '1 = wildly miscalibrated (claims wildly diverge from reality). 10 = perfectly self-aware.'
    ),
  findings: z
    .array(
      z.object({
        severity: z
          .enum(['high', 'medium', 'low', 'aligned'])
          .describe(
            'high = significant overclaim/underclaim, low = minor noise, aligned = claim matches data and is worth highlighting.'
          ),
        dimension: z
          .string()
          .describe(
            'Short label: framework_fluency, debugging, client_comms, ship_solo, project_count, attendance, code_quality, scenarios, internal_contradiction, etc.'
          ),
        claim: z.string().describe('Quote what they said in the self-assessment, briefly.'),
        actual: z.string().describe('Cite the metric or contradicting answer.'),
        explanation: z.string().describe('One or two sentences. Be direct. No hedging.'),
      })
    )
    .min(3)
    .max(8),
});

function buildDriftPrompt(audit: EmployeeAuditPayload, responses: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(
    `Employee: ${audit.overview.fullName ?? audit.overview.email ?? 'Unknown'} (${audit.overview.email ?? ''})`
  );
  lines.push(
    `Role: ${audit.overview.role ?? 'employee'} · ${audit.overview.daysInCompany} days in company`
  );
  lines.push('');
  lines.push('=== ACTUAL METRICS (last 90 days unless stated) ===');
  lines.push(
    `Attendance: ${audit.attendance.attendancePct}% (${audit.attendance.attendedWeekdays}/${audit.attendance.expectedWeekdays} expected workdays · ${audit.attendance.expectedDaysPerWeek}d/week schedule)`
  );
  lines.push(
    `Late after 10am: ${audit.attendance.lateAfter10} · very late (after noon): ${audit.attendance.veryLateAfterNoon}`
  );
  lines.push(
    `Sessions: ${audit.sessions.totalSessions} sessions · ${audit.sessions.totalHours.toFixed(1)} hours total · ${audit.sessions.distinctWorkdays} distinct workdays`
  );
  lines.push(
    `Avg session: ${audit.sessions.avgSessionMin ?? 'n/a'} min · unended: ${audit.sessions.unended} · no-project: ${audit.sessions.noProject} · no-clockout-summary: ${audit.sessions.noClockOutSummary}`
  );
  const reportRate =
    audit.sessions.totalSessions > 0
      ? Math.round((audit.reports.total / audit.sessions.totalSessions) * 100)
      : 0;
  lines.push(
    `Framework reports filed: ${audit.reports.total} (${reportRate}% of sessions) · verif passed: ${audit.reports.verifPassed}, failed: ${audit.reports.verifFailed} · gap cycles total: ${audit.reports.totalGapCycles}`
  );
  lines.push(
    `Projects worked: ${audit.projects.length} · top by hours: ${
      audit.projects
        .slice(0, 5)
        .map((p) => `${p.projectName} (${p.hoursLogged.toFixed(1)}h)`)
        .join(', ') || 'none'
    }`
  );
  lines.push(
    `Tasks: ${audit.tasks.completed}/${audit.tasks.totalAssigned} completed · on-time: ${audit.tasks.onTimePct}% · avg days to done: ${audit.tasks.avgDaysToDone ?? 'n/a'}`
  );
  lines.push(
    `Project assignments: ${audit.assignments.totalAssignments} · completed: ${audit.assignments.completedAssignments} · removed without complete: ${audit.assignments.removedWithoutComplete}`
  );
  lines.push('');
  lines.push('=== SELF-ASSESSMENT ANSWERS ===');
  const fmt = (k: string, v: unknown) => {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return v.length === 0 ? '' : `${k}: ${v.join(', ')}`;
    return `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`;
  };
  const knownKeys = [
    'overallMastery',
    'frameworkAddonScore',
    'clientHandoffConfidence',
    'frameworkCommandsMastered',
    'soloCapableProjectTypes',
    'weakSpots',
    'tenMilestoneTime',
    'clientCommsAlone',
    'gapClosureAlone',
    'shippedSoloCount',
    'debugComfort',
    'lastSoloProject',
    'wishedCommand',
    'unclearOrBroken',
    'yesGiveMeSolo',
    'scenarioInheritProject',
    'scenarioWhitePageMobile',
    'scenarioCodeYouProud',
    'scenarioClientAIBrief',
    'scenarioStuckTwoHours',
    'scenarioSlowPage',
    'scenarioPRReview',
    'scenarioVagueRequest',
    'scenarioRiskyMigration',
    'scenarioFirstCommit',
  ];
  for (const k of knownKeys) {
    const line = fmt(k, responses[k]);
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

/**
 * Run a drift analysis: compare the employee's self-assessment to their actual
 * metrics via Claude Sonnet (over OpenRouter) and return a structured report.
 *
 * Admin-only. Costs ~$0.02 per run, latency ~3-5s. Not cached — admin can rerun
 * if they want a fresh take.
 */
export async function analyzeAuditDrift(
  profileId: string
): Promise<{ success: true; report: AuditDriftReport } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (!(await isUserAdmin(user.id))) return { success: false, error: 'Admin only' };

  if (!process.env.OPENROUTER_API_KEY) {
    return { success: false, error: 'OPENROUTER_API_KEY not configured' };
  }

  const audit = await getEmployeeAudit(profileId);
  if (!audit) return { success: false, error: 'Audit data not found' };
  if (!audit.latestAssessment) {
    return { success: false, error: 'Employee has not submitted the self-assessment yet' };
  }

  const facts = buildDriftPrompt(audit, audit.latestAssessment.responses);

  try {
    const result = await generateObject({
      model: knowledgeAssistantModel,
      schema: DriftSchema,
      schemaName: 'AuditDrift',
      maxOutputTokens: 1500,
      prompt: `You are auditing the gap between an employee's self-rating and their actual work data over the last 90 days. Be direct. No hedging. Cite specific evidence in every finding.

The goal is to surface drift that helps the boss decide what to route to this employee solo, what to pair on, and where they need coaching.

A drift can go in either direction:
- Overclaim: rated themselves high but data shows otherwise
- Underclaim: data shows they're stronger than they admit
- Internal contradiction: two of their answers don't match each other
- Aligned (still worth a finding when calibration is impressive on a high-stakes dimension)

Surface 3-7 findings. Be specific about commands, project types, scenarios — quote the relevant claim and cite the relevant metric.

EMPLOYEE DATA:

${facts}`,
    });

    return {
      success: true,
      report: {
        summary: result.object.summary,
        honestyScore: result.object.honesty_score,
        findings: result.object.findings,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[analyzeAuditDrift] error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Drift analysis failed',
    };
  }
}
