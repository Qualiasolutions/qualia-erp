'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getTeamMembers } from '@/app/actions/admin';
import { hueFromId } from '@/lib/color-constants';

/* ------------------------------------------------------------------ *
 *  Public payload shapes
 * ------------------------------------------------------------------ */

export type ReportFlag = {
  reportId: string;
  reason: 'stuck' | 'verification_fail' | 'zero_progress';
  submittedBy: string | null;
  projectName: string | null;
  milestone: string | null;
  notes: string | null;
  submittedAt: string | null;
};

export type EmployeePerfRow = {
  profileId: string | null;
  fullName: string | null;
  email: string | null;
  performanceIndex: number | null; // 0-10
  performanceDelta: number | null; // delta vs prior week (-10..+10)
  sessions: number;
  tasksDone: number;
  tasksTotal: number;
  completionPct: number | null;
  gapCycles: number;
  verificationPass: number;
  verificationFail: number;
  zeroProgress: number;
  commits: number;
  deploys: number;
  projects: string[];
  sparkline: number[]; // last 4 weeks performance index
  currentStreak: number; // current run of clean sessions (gap_cycles=0 AND tasks_done>0)
};

export type ProjectPerfRow = {
  projectKey: string; // framework_project_id || erp_project_id || project_name slug
  projectName: string;
  hue: number;
  reports: number;
  fourWeekAvg: number; // avg reports/week over previous 4 weeks
  volumeMultiplier: number | null; // reports / fourWeekAvg
  contributors: { name: string; count: number }[];
  tasksDone: number;
  tasksTotal: number;
  completionPct: number | null;
  gapCycles: number;
  verificationFails: number;
  deploys: number;
  commits: number;
  latestMilestone: string | null;
};

export type ReportsPerfPayload = {
  weekStartISO: string;
  weekEndISO: string;
  flags: ReportFlag[];
  employees: EmployeePerfRow[];
  projects: ProjectPerfRow[];
  totals: {
    sessions: number;
    tasksDone: number;
    gapCycles: number;
    verificationFails: number;
  };
};

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */

function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay();
  out.setDate(out.getDate() + (dow === 0 ? -6 : 1 - dow));
  return out;
}

function weekEnd(d: Date): Date {
  const start = weekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
}

function computeIndex(row: {
  tasksDone: number;
  tasksTotal: number;
  gapCycles: number;
  sessions: number;
  verificationPass: number;
  verificationFail: number;
}): number | null {
  if (row.sessions === 0) return null;
  const completion = row.tasksTotal > 0 ? row.tasksDone / row.tasksTotal : 0;
  const gapCycleAvoidance = 1 - Math.min(1, row.gapCycles / row.sessions);
  const verifTotal = row.verificationPass + row.verificationFail;
  const verifPassRate = verifTotal > 0 ? row.verificationPass / verifTotal : 1;
  const score = 0.4 * completion + 0.3 * gapCycleAvoidance + 0.3 * verifPassRate;
  return Math.round(score * 10 * 10) / 10; // 0..10, 1 decimal
}

function normalizeAuthor(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function authorMatches(
  member: { full_name: string | null; email: string | null },
  author: string | null | undefined
): boolean {
  const a = normalizeAuthor(author);
  if (!a) return false;
  const full = normalizeAuthor(member.full_name);
  const email = normalizeAuthor(member.email);
  return a === full || a === email || (full.length > 0 && a.includes(full));
}

/* ================================================================== *
 *  Loader
 * ================================================================== */

type ReportRow = {
  id: string;
  submitted_by: string | null;
  submitted_at: string | null;
  framework_project_id: string | null;
  erp_project_id: string | null;
  project_name: string;
  milestone_name: string | null;
  tasks_done: number | null;
  tasks_total: number | null;
  gap_cycles: number | null;
  verification: string | null;
  deploy_count: number | null;
  commits: string[] | null;
  notes: string | null;
};

export async function getReportsPerformance(
  weekOffset: number = 0
): Promise<ReportsPerfPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return null;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;

  const now = new Date();
  const referenceDate = new Date(now);
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
  const wkStart = weekStart(referenceDate);
  const wkEnd = weekEnd(referenceDate);
  const fourWeeksBefore = new Date(wkStart);
  fourWeeksBefore.setDate(fourWeeksBefore.getDate() - 28);

  const [reportsRes, prevWeekReportsRes, fourWeekReportsRes, membersRes] = await Promise.all([
    supabase
      .from('session_reports')
      .select(
        `id, submitted_by, submitted_at, framework_project_id, erp_project_id, project_name,
         milestone_name, tasks_done, tasks_total, gap_cycles, verification, deploy_count, commits, notes`
      )
      .neq('dry_run', true)
      .gte('submitted_at', wkStart.toISOString())
      .lt('submitted_at', wkEnd.toISOString())
      .order('submitted_at', { ascending: false }),
    supabase
      .from('session_reports')
      .select(
        `id, submitted_by, submitted_at, framework_project_id, project_name,
         tasks_done, tasks_total, gap_cycles, verification`
      )
      .neq('dry_run', true)
      .gte('submitted_at', new Date(wkStart.getTime() - 7 * 86_400_000).toISOString())
      .lt('submitted_at', wkStart.toISOString()),
    supabase
      .from('session_reports')
      .select('id, submitted_at, framework_project_id, project_name')
      .neq('dry_run', true)
      .gte('submitted_at', fourWeeksBefore.toISOString())
      .lt('submitted_at', wkStart.toISOString()),
    getTeamMembers(),
  ]);

  const rows: ReportRow[] = (reportsRes.data as ReportRow[] | null) ?? [];
  const prevRows: Array<{
    id: string;
    submitted_by: string | null;
    submitted_at: string | null;
    framework_project_id: string | null;
    project_name: string;
    tasks_done: number | null;
    tasks_total: number | null;
    gap_cycles: number | null;
    verification: string | null;
  }> =
    (prevWeekReportsRes.data as Array<{
      id: string;
      submitted_by: string | null;
      submitted_at: string | null;
      framework_project_id: string | null;
      project_name: string;
      tasks_done: number | null;
      tasks_total: number | null;
      gap_cycles: number | null;
      verification: string | null;
    }> | null) ?? [];
  const fourWeekRows: Array<{
    id: string;
    submitted_at: string | null;
    framework_project_id: string | null;
    project_name: string;
  }> =
    (fourWeekReportsRes.data as Array<{
      id: string;
      submitted_at: string | null;
      framework_project_id: string | null;
      project_name: string;
    }> | null) ?? [];

  const members =
    membersRes.success && Array.isArray(membersRes.data)
      ? (membersRes.data as Array<{ id: string; full_name: string | null; email: string | null }>)
      : [];

  /* ------- FLAGS (sessions worth surfacing) ------- */
  const flags: ReportFlag[] = [];
  for (const r of rows) {
    if ((r.gap_cycles ?? 0) >= 3) {
      flags.push({
        reportId: r.id,
        reason: 'stuck',
        submittedBy: r.submitted_by,
        projectName: r.project_name,
        milestone: r.milestone_name,
        notes: r.notes,
        submittedAt: r.submitted_at,
      });
    } else if (r.verification === 'fail') {
      flags.push({
        reportId: r.id,
        reason: 'verification_fail',
        submittedBy: r.submitted_by,
        projectName: r.project_name,
        milestone: r.milestone_name,
        notes: r.notes,
        submittedAt: r.submitted_at,
      });
    } else if (r.tasks_done === 0 && (r.tasks_total ?? 0) > 0) {
      flags.push({
        reportId: r.id,
        reason: 'zero_progress',
        submittedBy: r.submitted_by,
        projectName: r.project_name,
        milestone: r.milestone_name,
        notes: r.notes,
        submittedAt: r.submitted_at,
      });
    }
  }

  /* ------- EMPLOYEE AGGREGATION ------- */
  type Acc = {
    profileId: string | null;
    fullName: string | null;
    email: string | null;
    sessions: number;
    tasksDone: number;
    tasksTotal: number;
    gapCycles: number;
    verificationPass: number;
    verificationFail: number;
    zeroProgress: number;
    commits: number;
    deploys: number;
    projectsSet: Set<string>;
    timestampsAsc: { ts: string; clean: boolean }[];
  };
  const empMap = new Map<string, Acc>();

  // Bucket members by id-of-acc keyed by author (lowercased name/email)
  const ensureAccForRow = (r: ReportRow): Acc => {
    const author = normalizeAuthor(r.submitted_by);
    const matchedMember = members.find((m) => authorMatches(m, r.submitted_by));
    const key = matchedMember?.id ?? author ?? 'unknown';
    let acc = empMap.get(key);
    if (!acc) {
      acc = {
        profileId: matchedMember?.id ?? null,
        fullName: matchedMember?.full_name ?? r.submitted_by ?? null,
        email: matchedMember?.email ?? null,
        sessions: 0,
        tasksDone: 0,
        tasksTotal: 0,
        gapCycles: 0,
        verificationPass: 0,
        verificationFail: 0,
        zeroProgress: 0,
        commits: 0,
        deploys: 0,
        projectsSet: new Set(),
        timestampsAsc: [],
      };
      empMap.set(key, acc);
    }
    return acc;
  };

  for (const r of rows) {
    const acc = ensureAccForRow(r);
    acc.sessions += 1;
    acc.tasksDone += r.tasks_done ?? 0;
    acc.tasksTotal += r.tasks_total ?? 0;
    acc.gapCycles += r.gap_cycles ?? 0;
    acc.commits += Array.isArray(r.commits) ? r.commits.length : 0;
    acc.deploys += r.deploy_count ?? 0;
    if (r.verification === 'pass') acc.verificationPass += 1;
    if (r.verification === 'fail') acc.verificationFail += 1;
    if ((r.tasks_done ?? 0) === 0 && (r.tasks_total ?? 0) > 0) acc.zeroProgress += 1;
    if (r.project_name) acc.projectsSet.add(r.project_name);
    const isClean = (r.gap_cycles ?? 0) === 0 && (r.tasks_done ?? 0) > 0;
    if (r.submitted_at) acc.timestampsAsc.push({ ts: r.submitted_at, clean: isClean });
  }

  // Previous-week index per author (for delta + sparkline anchor)
  const prevByAuthorKey = new Map<
    string,
    {
      sessions: number;
      tasksDone: number;
      tasksTotal: number;
      gapCycles: number;
      verificationPass: number;
      verificationFail: number;
    }
  >();
  for (const r of prevRows) {
    const author = normalizeAuthor(r.submitted_by);
    const matchedMember = members.find((m) => authorMatches(m, r.submitted_by));
    const key = matchedMember?.id ?? author ?? 'unknown';
    const acc = prevByAuthorKey.get(key) ?? {
      sessions: 0,
      tasksDone: 0,
      tasksTotal: 0,
      gapCycles: 0,
      verificationPass: 0,
      verificationFail: 0,
    };
    acc.sessions += 1;
    acc.tasksDone += r.tasks_done ?? 0;
    acc.tasksTotal += r.tasks_total ?? 0;
    acc.gapCycles += r.gap_cycles ?? 0;
    if (r.verification === 'pass') acc.verificationPass += 1;
    if (r.verification === 'fail') acc.verificationFail += 1;
    prevByAuthorKey.set(key, acc);
  }

  // Sparkline = current week + 3 prior weeks worth of indexes (4 points)
  // We approximate by re-bucketing prevRows + an extended fetch isn't worth it; use 2 points (this + prev).
  // For now expose [prev, current] which is enough to convey direction.
  // (Future improvement: fetch more weeks. Intentionally cheap for now.)
  const employees: EmployeePerfRow[] = Array.from(empMap.entries()).map(([key, acc]) => {
    const currentIndex = computeIndex({
      tasksDone: acc.tasksDone,
      tasksTotal: acc.tasksTotal,
      gapCycles: acc.gapCycles,
      sessions: acc.sessions,
      verificationPass: acc.verificationPass,
      verificationFail: acc.verificationFail,
    });
    const prev = prevByAuthorKey.get(key);
    const prevIndex = prev
      ? computeIndex({
          tasksDone: prev.tasksDone,
          tasksTotal: prev.tasksTotal,
          gapCycles: prev.gapCycles,
          sessions: prev.sessions,
          verificationPass: prev.verificationPass,
          verificationFail: prev.verificationFail,
        })
      : null;
    const completionPct =
      acc.tasksTotal > 0 ? Math.round((acc.tasksDone / acc.tasksTotal) * 100) : null;

    // current ship streak — count consecutive clean sessions counting backward
    acc.timestampsAsc.sort((a, b) => a.ts.localeCompare(b.ts));
    let streak = 0;
    for (let i = acc.timestampsAsc.length - 1; i >= 0; i--) {
      if (acc.timestampsAsc[i].clean) streak += 1;
      else break;
    }

    return {
      profileId: acc.profileId,
      fullName: acc.fullName,
      email: acc.email,
      performanceIndex: currentIndex,
      performanceDelta:
        currentIndex != null && prevIndex != null
          ? Math.round((currentIndex - prevIndex) * 10) / 10
          : null,
      sessions: acc.sessions,
      tasksDone: acc.tasksDone,
      tasksTotal: acc.tasksTotal,
      completionPct,
      gapCycles: acc.gapCycles,
      verificationPass: acc.verificationPass,
      verificationFail: acc.verificationFail,
      zeroProgress: acc.zeroProgress,
      commits: acc.commits,
      deploys: acc.deploys,
      projects: Array.from(acc.projectsSet),
      sparkline:
        prevIndex != null && currentIndex != null
          ? [prevIndex, currentIndex]
          : currentIndex != null
            ? [currentIndex]
            : [],
      currentStreak: streak,
    } satisfies EmployeePerfRow;
  });
  employees.sort((a, b) => (b.sessions || 0) - (a.sessions || 0));

  /* ------- PROJECT AGGREGATION ------- */
  type ProjAcc = {
    key: string;
    name: string;
    reports: number;
    tasksDone: number;
    tasksTotal: number;
    gapCycles: number;
    verificationFails: number;
    deploys: number;
    commits: number;
    contributors: Map<string, number>;
    latestMilestone: string | null;
    latestSubmittedAt: string | null;
  };
  const projMap = new Map<string, ProjAcc>();
  const projKey = (r: { framework_project_id: string | null; project_name: string }) =>
    r.framework_project_id ?? r.project_name;
  for (const r of rows) {
    const key = projKey(r);
    let acc = projMap.get(key);
    if (!acc) {
      acc = {
        key,
        name: r.project_name,
        reports: 0,
        tasksDone: 0,
        tasksTotal: 0,
        gapCycles: 0,
        verificationFails: 0,
        deploys: 0,
        commits: 0,
        contributors: new Map(),
        latestMilestone: null,
        latestSubmittedAt: null,
      };
      projMap.set(key, acc);
    }
    acc.reports += 1;
    acc.tasksDone += r.tasks_done ?? 0;
    acc.tasksTotal += r.tasks_total ?? 0;
    acc.gapCycles += r.gap_cycles ?? 0;
    if (r.verification === 'fail') acc.verificationFails += 1;
    acc.deploys += r.deploy_count ?? 0;
    acc.commits += Array.isArray(r.commits) ? r.commits.length : 0;
    if (r.submitted_by) {
      acc.contributors.set(r.submitted_by, (acc.contributors.get(r.submitted_by) ?? 0) + 1);
    }
    if (r.submitted_at && (!acc.latestSubmittedAt || r.submitted_at > acc.latestSubmittedAt)) {
      acc.latestSubmittedAt = r.submitted_at;
      acc.latestMilestone = r.milestone_name;
    }
  }

  // 4-week avg (prior 4 weeks excluding current)
  const fourWeekCounts = new Map<string, number>();
  for (const r of fourWeekRows) {
    const key = r.framework_project_id ?? r.project_name;
    fourWeekCounts.set(key, (fourWeekCounts.get(key) ?? 0) + 1);
  }

  const projects: ProjectPerfRow[] = Array.from(projMap.values()).map((acc) => {
    const fourWeekTotal = fourWeekCounts.get(acc.key) ?? 0;
    const fourWeekAvg = fourWeekTotal / 4;
    return {
      projectKey: acc.key,
      projectName: acc.name,
      hue: hueFromId(acc.key),
      reports: acc.reports,
      fourWeekAvg: Math.round(fourWeekAvg * 10) / 10,
      volumeMultiplier: fourWeekAvg > 0 ? Math.round((acc.reports / fourWeekAvg) * 10) / 10 : null,
      contributors: Array.from(acc.contributors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      tasksDone: acc.tasksDone,
      tasksTotal: acc.tasksTotal,
      completionPct: acc.tasksTotal > 0 ? Math.round((acc.tasksDone / acc.tasksTotal) * 100) : null,
      gapCycles: acc.gapCycles,
      verificationFails: acc.verificationFails,
      deploys: acc.deploys,
      commits: acc.commits,
      latestMilestone: acc.latestMilestone,
    };
  });
  projects.sort((a, b) => b.reports - a.reports);

  return {
    weekStartISO: wkStart.toISOString(),
    weekEndISO: wkEnd.toISOString(),
    flags,
    employees,
    projects,
    totals: {
      sessions: rows.length,
      tasksDone: rows.reduce((sum, r) => sum + (r.tasks_done ?? 0), 0),
      gapCycles: rows.reduce((sum, r) => sum + (r.gap_cycles ?? 0), 0),
      verificationFails: rows.filter((r) => r.verification === 'fail').length,
    },
  };
}
