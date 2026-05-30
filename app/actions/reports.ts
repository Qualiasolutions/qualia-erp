'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';

// ============ TYPES ============

export interface EmployeeReport {
  profileId: string;
  fullName: string;
  totalMinutes: number;
  sessionCount: number;
  projects: string[];
}

export interface ProjectReport {
  projectId: string | null;
  projectName: string;
  totalMinutes: number;
  sessionCount: number;
  contributors: string[];
}

export interface EmployeeSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  projectId: string | null;
  projectName: string;
  summary: string | null;
}

export interface EmployeeSessionDetail {
  profileId: string;
  fullName: string;
  totalMinutes: number;
  sessions: EmployeeSession[];
}

export interface ReportSummary {
  totalHours: number;
  totalSessions: number;
  activeMembers: number;
  avgHoursPerDay: number;
  byEmployee: EmployeeReport[];
  byProject: ProjectReport[];
}

// ============ ACTIONS ============

/**
 * Get aggregated report data for a date range.
 * Admin only.
 */
export async function getReportData(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<ReportSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!(await isUserAdmin(user.id))) return null;

  // Fetch all sessions in the date range
  const { data: sessions, error } = await supabase
    .from('work_sessions')
    .select(
      `
      id,
      profile_id,
      project_id,
      started_at,
      ended_at,
      duration_minutes,
      summary,
      clock_in_note,
      profile:profiles!work_sessions_profile_id_fkey (id, full_name),
      project:projects!work_sessions_project_id_fkey (id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('hidden_from_reports', false)
    .gte('started_at', `${startDate}T00:00:00Z`)
    .lt('started_at', `${endDate}T23:59:59Z`)
    .not('ended_at', 'is', null)
    .not('project_id', 'is', null)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[getReportData] Error:', error);
    return null;
  }

  if (!sessions || sessions.length === 0) {
    return {
      totalHours: 0,
      totalSessions: 0,
      activeMembers: 0,
      avgHoursPerDay: 0,
      byEmployee: [],
      byProject: [],
    };
  }

  // Compute duration for sessions missing duration_minutes
  const enriched = sessions.map((s) => {
    const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    let minutes = s.duration_minutes;
    if (minutes == null && s.ended_at) {
      minutes = Math.round(
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      );
    }
    return {
      ...s,
      profile: profile as { id: string; full_name: string | null } | null,
      project: project as { id: string; name: string } | null,
      minutes: minutes ?? 0,
    };
  });

  // Aggregate by employee
  const empMap = new Map<
    string,
    { fullName: string; totalMinutes: number; sessionCount: number; projects: Set<string> }
  >();
  for (const s of enriched) {
    const pid = s.profile_id;
    const name = s.profile?.full_name ?? 'Unknown';
    if (!empMap.has(pid)) {
      empMap.set(pid, { fullName: name, totalMinutes: 0, sessionCount: 0, projects: new Set() });
    }
    const entry = empMap.get(pid)!;
    entry.totalMinutes += s.minutes;
    entry.sessionCount += 1;
    if (s.project?.name) entry.projects.add(s.project.name);
    else if (s.clock_in_note) entry.projects.add(s.clock_in_note);
  }

  const byEmployee: EmployeeReport[] = Array.from(empMap.entries())
    .map(([profileId, e]) => ({
      profileId,
      fullName: e.fullName,
      totalMinutes: e.totalMinutes,
      sessionCount: e.sessionCount,
      projects: Array.from(e.projects),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Aggregate by project
  const projMap = new Map<
    string,
    { name: string; totalMinutes: number; sessionCount: number; contributors: Set<string> }
  >();
  for (const s of enriched) {
    const key = s.project_id ?? '__no_project__';
    const name = s.project?.name ?? s.clock_in_note ?? 'Unassigned';
    if (!projMap.has(key)) {
      projMap.set(key, {
        name,
        totalMinutes: 0,
        sessionCount: 0,
        contributors: new Set(),
      });
    }
    const entry = projMap.get(key)!;
    entry.totalMinutes += s.minutes;
    entry.sessionCount += 1;
    if (s.profile?.full_name) entry.contributors.add(s.profile.full_name);
  }

  const byProject: ProjectReport[] = Array.from(projMap.entries())
    .map(([projectId, p]) => ({
      projectId: projectId === '__no_project__' ? null : projectId,
      projectName: p.name,
      totalMinutes: p.totalMinutes,
      sessionCount: p.sessionCount,
      contributors: Array.from(p.contributors),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Totals
  const totalMinutes = enriched.reduce((sum, s) => sum + s.minutes, 0);
  const uniqueProfiles = new Set(enriched.map((s) => s.profile_id));

  // Days in range for average
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(
    1,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / dayMs) + 1
  );

  return {
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalSessions: enriched.length,
    activeMembers: uniqueProfiles.size,
    avgHoursPerDay: Math.round((totalMinutes / 60 / days) * 10) / 10,
    byEmployee,
    byProject,
  };
}

/**
 * Drill-down: every work session for a single employee in a date range.
 * Admin only. Used by the Hours tab to show day, time-of-day, and project per session.
 */
export async function getEmployeeSessionDetail(
  workspaceId: string,
  profileId: string,
  startDate: string,
  endDate: string
): Promise<EmployeeSessionDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!(await isUserAdmin(user.id))) return null;

  const { data, error } = await supabase
    .from('work_sessions')
    .select(
      `
      id,
      started_at,
      ended_at,
      duration_minutes,
      summary,
      clock_in_note,
      project_id,
      profile:profiles!work_sessions_profile_id_fkey (id, full_name),
      project:projects!work_sessions_project_id_fkey (id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId)
    .eq('hidden_from_reports', false)
    .gte('started_at', `${startDate}T00:00:00Z`)
    .lt('started_at', `${endDate}T23:59:59Z`)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[getEmployeeSessionDetail] Error:', error);
    return null;
  }

  const rows = (data ?? []).map((s) => {
    const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    let minutes = s.duration_minutes;
    if ((minutes == null || minutes === 0) && s.ended_at) {
      minutes = Math.round(
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      );
    }
    return {
      profileFullName: (profile as { full_name: string | null } | null)?.full_name ?? 'Unknown',
      session: {
        id: s.id as string,
        startedAt: s.started_at as string,
        endedAt: (s.ended_at as string | null) ?? null,
        durationMinutes: minutes ?? 0,
        projectId: (s.project_id as string | null) ?? null,
        projectName: (project as { name: string } | null)?.name ?? s.clock_in_note ?? 'Unspecified',
        summary: (s.summary as string | null) ?? null,
      } satisfies EmployeeSession,
    };
  });

  const fullName = rows[0]?.profileFullName ?? 'Unknown';
  const sessions = rows.map((r) => r.session);
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return { profileId, fullName, totalMinutes, sessions };
}

// ============ FRAMEWORK (session_reports) ============
//
// Cross-project admin view of structured reports from /qualia-report.
// session_reports has server-only RLS, so reads go through the admin
// client. All functions here gate on isUserAdmin first.

export interface FrameworkReportRow {
  id: string;
  client_report_id: string | null;
  project_name: string;
  erp_project_id: string | null;
  erp_project_name: string | null;
  client: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  milestone: number | null;
  milestone_name: string | null;
  phase: number | null;
  phase_name: string | null;
  total_phases: number | null;
  status: string | null;
  verification: string | null;
  tasks_done: number | null;
  tasks_total: number | null;
  deployed_url: string | null;
  build_count: number | null;
  deploy_count: number | null;
  commits: string[] | null;
  notes: string | null;
  auth_method: string | null;
  // B1 — 'auto' (observed at ship/session-end) vs 'manual' (deliberate /qualia-report).
  // Defaults to 'manual' for legacy rows via the migration.
  source: 'auto' | 'manual';
}

type RawFrameworkReportRow = Omit<FrameworkReportRow, 'erp_project_name'> & {
  erp_project?: { name?: string } | { name?: string }[] | null;
};

export interface FrameworkReportsFilters {
  project?: string;
  status?: string;
  verification?: string;
  submittedBy?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  limit?: number;
  offset?: number;
}

export interface FrameworkReportsStats {
  totalReports: number;
  reportsLast7d: number;
  reportsLast30d: number;
  distinctProjects: number;
  totalCommits: number;
  totalBuilds: number;
  totalDeploys: number;
  topProjects: Array<{ project_name: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  verificationBreakdown: Array<{ verification: string; count: number }>;
}

async function requireAdmin(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  const admin = await isUserAdmin(user.id);
  if (!admin) return { ok: false, error: 'Not authorized' };
  return { ok: true };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getFrameworkReports(
  filters: FrameworkReportsFilters = {},
  options?: { includeDryRun?: boolean }
): Promise<FrameworkReportRow[]> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  const admin = createAdminClient();
  let query = admin
    .from('session_reports')
    .select(
      'id, client_report_id, project_name, erp_project_id, erp_project:projects!session_reports_erp_project_id_fkey(id, name), client, submitted_at, submitted_by, milestone, milestone_name, phase, phase_name, total_phases, status, verification, tasks_done, tasks_total, deployed_url, build_count, deploy_count, commits, notes, auth_method, source'
    )
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    query = query.neq('dry_run', true);
  }

  // Project filters are applied after mapping because modern reports may be
  // canonically linked to an ERP project whose display name differs from the
  // framework repo slug (e.g. legacy USD-Academy -> Underdog-Sales-Academy).
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.verification) query = query.eq('verification', filters.verification);
  if (filters.submittedBy) query = query.ilike('submitted_by', `%${filters.submittedBy}%`);
  if (filters.from) query = query.gte('submitted_at', filters.from);
  if (filters.to) query = query.lte('submitted_at', filters.to);

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  query = filters.project ? query.limit(500) : query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    console.error('[getFrameworkReports] Error:', error);
    return [];
  }
  const rows = ((data ?? []) as unknown as RawFrameworkReportRow[]).map((row) => {
    const erpProject = firstRelation(row.erp_project);
    return {
      ...row,
      erp_project_name: erpProject?.name ?? null,
    };
  });

  const projectFiltered = filters.project
    ? rows.filter(
        (row) => row.project_name === filters.project || row.erp_project_name === filters.project
      )
    : rows;

  return filters.project ? projectFiltered.slice(offset, offset + limit) : projectFiltered;
}

export async function getFrameworkReportsStats(options?: {
  includeDryRun?: boolean;
}): Promise<FrameworkReportsStats> {
  const empty: FrameworkReportsStats = {
    totalReports: 0,
    reportsLast7d: 0,
    reportsLast30d: 0,
    distinctProjects: 0,
    totalCommits: 0,
    totalBuilds: 0,
    totalDeploys: 0,
    topProjects: [],
    statusBreakdown: [],
    verificationBreakdown: [],
  };

  const auth = await requireAdmin();
  if (!auth.ok) return empty;

  const admin = createAdminClient();

  // Pull a single wide window and aggregate in memory — session_reports is
  // small per-org (one row per /qualia-report call) so 2000 rows is plenty.
  let statsQuery = admin
    .from('session_reports')
    .select(
      'project_name, erp_project:projects!session_reports_erp_project_id_fkey(name), submitted_at, status, verification, build_count, deploy_count, commits'
    )
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(2000);

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    statsQuery = statsQuery.neq('dry_run', true);
  }

  const { data, error } = await statsQuery;

  if (error || !data) {
    console.error('[getFrameworkReportsStats] Error:', error);
    return empty;
  }

  const now = Date.now();
  const d7 = now - 7 * 86_400_000;
  const d30 = now - 30 * 86_400_000;

  const projectCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const verifCounts = new Map<string, number>();
  let reportsLast7d = 0;
  let reportsLast30d = 0;
  let totalCommits = 0;
  let totalBuilds = 0;
  let totalDeploys = 0;

  for (const r of data) {
    const ts = r.submitted_at ? new Date(r.submitted_at).getTime() : 0;
    if (ts >= d7) reportsLast7d++;
    if (ts >= d30) reportsLast30d++;
    const erpProject = firstRelation(
      (r as { erp_project?: { name?: string } | { name?: string }[] | null }).erp_project
    );
    const projectName = erpProject?.name ?? r.project_name;
    if (projectName) projectCounts.set(projectName, (projectCounts.get(projectName) ?? 0) + 1);
    if (r.status) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
    if (r.verification) verifCounts.set(r.verification, (verifCounts.get(r.verification) ?? 0) + 1);
    if (Array.isArray(r.commits)) totalCommits += r.commits.length;
    if (typeof r.build_count === 'number') totalBuilds += r.build_count;
    if (typeof r.deploy_count === 'number') totalDeploys += r.deploy_count;
  }

  const topProjects = Array.from(projectCounts.entries())
    .map(([project_name, count]) => ({ project_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const statusBreakdown = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
  const verificationBreakdown = Array.from(verifCounts.entries())
    .map(([verification, count]) => ({ verification, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalReports: data.length,
    reportsLast7d,
    reportsLast30d,
    distinctProjects: projectCounts.size,
    totalCommits,
    totalBuilds,
    totalDeploys,
    topProjects,
    statusBreakdown,
    verificationBreakdown,
  };
}

export async function getFrameworkReportsProjects(options?: {
  includeDryRun?: boolean;
}): Promise<string[]> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];
  const admin = createAdminClient();
  let projectsQuery = admin
    .from('session_reports')
    .select('project_name, erp_project:projects!session_reports_erp_project_id_fkey(name)')
    .order('project_name', { ascending: true });

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    projectsQuery = projectsQuery.neq('dry_run', true);
  }

  const { data } = await projectsQuery;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of data ?? []) {
    const erpProject = firstRelation(
      (r as { erp_project?: { name?: string } | { name?: string }[] | null }).erp_project
    );
    const projectName = erpProject?.name ?? r.project_name;
    if (projectName && !seen.has(projectName)) {
      seen.add(projectName);
      result.push(projectName);
    }
  }
  return result;
}
