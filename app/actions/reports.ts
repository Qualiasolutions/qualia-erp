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

export interface AssignedVsDone {
  profileId: string;
  fullName: string;
  assignedProjects: { id: string; name: string }[];
  workedProjects: { id: string; name: string; minutes: number }[];
  unassignedWork: { name: string; minutes: number }[];
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
 * Get assigned vs done comparison for a date range.
 * Shows which projects each employee was assigned to vs which they actually worked on.
 * Admin only.
 */
export async function getAssignedVsDone(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<AssignedVsDone[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  if (!(await isUserAdmin(user.id))) return [];

  // Get active assignments
  const { data: assignments, error: assignErr } = await supabase
    .from('project_assignments')
    .select(
      `
      profile_id,
      project:projects!project_assignments_project_id_fkey (id, name),
      profile:profiles!project_assignments_profile_id_fkey (id, full_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (assignErr) {
    console.error('[getAssignedVsDone] Assignments error:', assignErr);
    return [];
  }

  // Get work sessions in the date range
  const { data: sessions, error: sessErr } = await supabase
    .from('work_sessions')
    .select(
      `
      profile_id,
      project_id,
      duration_minutes,
      started_at,
      ended_at,
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
    .not('project_id', 'is', null);

  if (sessErr) {
    console.error('[getAssignedVsDone] Sessions error:', sessErr);
    return [];
  }

  // Build per-employee assigned projects map
  const assignedMap = new Map<string, { fullName: string; projects: Map<string, string> }>();
  for (const a of assignments ?? []) {
    const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
    const project = Array.isArray(a.project) ? a.project[0] : a.project;
    if (!profile || !project) continue;
    const p = profile as { id: string; full_name: string | null };
    const proj = project as { id: string; name: string };
    if (!assignedMap.has(p.id)) {
      assignedMap.set(p.id, { fullName: p.full_name ?? 'Unknown', projects: new Map() });
    }
    assignedMap.get(p.id)!.projects.set(proj.id, proj.name);
  }

  // Build per-employee worked projects map
  const workedMap = new Map<
    string,
    { fullName: string; projects: Map<string, { name: string; minutes: number }> }
  >();
  for (const s of sessions ?? []) {
    const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
    const project = Array.isArray(s.project) ? s.project[0] : s.project;
    const p = profile as { id: string; full_name: string | null } | null;
    const proj = project as { id: string; name: string } | null;
    if (!p) continue;

    let minutes = s.duration_minutes;
    if (minutes == null && s.ended_at) {
      minutes = Math.round(
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      );
    }

    if (!workedMap.has(p.id)) {
      workedMap.set(p.id, { fullName: p.full_name ?? 'Unknown', projects: new Map() });
    }
    const key = proj?.id ?? `__note_${s.clock_in_note ?? 'unknown'}`;
    const name = proj?.name ?? s.clock_in_note ?? 'Unspecified';
    const entry = workedMap.get(p.id)!;
    if (!entry.projects.has(key)) {
      entry.projects.set(key, { name, minutes: 0 });
    }
    entry.projects.get(key)!.minutes += minutes ?? 0;
  }

  // Merge — combine all profile IDs from both maps
  const allProfileIds = new Set([...assignedMap.keys(), ...workedMap.keys()]);
  const result: AssignedVsDone[] = [];

  for (const profileId of allProfileIds) {
    const assigned = assignedMap.get(profileId);
    const worked = workedMap.get(profileId);
    const fullName = assigned?.fullName ?? worked?.fullName ?? 'Unknown';

    const assignedProjects = Array.from(assigned?.projects.entries() ?? []).map(([id, name]) => ({
      id,
      name,
    }));

    const assignedIds = new Set(assigned?.projects.keys() ?? []);
    const workedProjects: { id: string; name: string; minutes: number }[] = [];
    const unassignedWork: { name: string; minutes: number }[] = [];

    for (const [key, val] of worked?.projects.entries() ?? []) {
      if (assignedIds.has(key) || key.startsWith('__note_')) {
        if (key.startsWith('__note_')) {
          unassignedWork.push({ name: val.name, minutes: val.minutes });
        } else {
          workedProjects.push({ id: key, name: val.name, minutes: val.minutes });
        }
      } else {
        // Worked on a project they weren't assigned to
        unassignedWork.push({ name: val.name, minutes: val.minutes });
      }
    }

    result.push({ profileId, fullName, assignedProjects, workedProjects, unassignedWork });
  }

  result.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return result;
}

// ============ CHECKIN ANALYTICS ============

export interface CheckinAnalytics {
  byEmployee: {
    profileId: string;
    fullName: string;
    checkinDays: number;
    avgEnergy: number | null;
    avgMood: number | null;
    blockerCount: number;
  }[];
  topBlockers: string[];
  totalCheckins: number;
  avgEnergyOverall: number | null;
  avgMoodOverall: number | null;
}

/**
 * Get check-in analytics for a date range.
 * Admin only.
 */
export async function getCheckinAnalytics(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<CheckinAnalytics | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!(await isUserAdmin(user.id))) return null;

  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select(
      `
      id,
      profile_id,
      checkin_date,
      checkin_type,
      energy_level,
      mood,
      blockers,
      profile:profiles!daily_checkins_profile_id_fkey (id, full_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .gte('checkin_date', startDate)
    .lte('checkin_date', endDate)
    .order('checkin_date', { ascending: false });

  if (error) {
    console.error('[getCheckinAnalytics] Error:', error);
    return null;
  }

  if (!checkins || checkins.length === 0) {
    return {
      byEmployee: [],
      topBlockers: [],
      totalCheckins: 0,
      avgEnergyOverall: null,
      avgMoodOverall: null,
    };
  }

  // Normalize FK
  const normalized = checkins.map((c) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    return {
      ...c,
      profile: profile as { id: string; full_name: string | null } | null,
    };
  });

  // Aggregate by employee
  const empMap = new Map<
    string,
    {
      fullName: string;
      checkinDates: Set<string>;
      energyValues: number[];
      moodValues: number[];
      blockerCount: number;
    }
  >();

  const allBlockers: string[] = [];
  const allEnergy: number[] = [];
  const allMood: number[] = [];

  for (const c of normalized) {
    const pid = c.profile_id;
    const name = c.profile?.full_name ?? 'Unknown';

    if (!empMap.has(pid)) {
      empMap.set(pid, {
        fullName: name,
        checkinDates: new Set(),
        energyValues: [],
        moodValues: [],
        blockerCount: 0,
      });
    }
    const entry = empMap.get(pid)!;
    entry.checkinDates.add(c.checkin_date);

    if (c.checkin_type === 'morning' && c.energy_level != null) {
      entry.energyValues.push(c.energy_level);
      allEnergy.push(c.energy_level);
    }

    if (c.checkin_type === 'evening' && c.mood != null) {
      entry.moodValues.push(c.mood);
      allMood.push(c.mood);
    }

    if (c.checkin_type === 'morning' && c.blockers && c.blockers.trim().length > 0) {
      entry.blockerCount += 1;
      allBlockers.push(c.blockers.trim());
    }
  }

  const byEmployee = Array.from(empMap.entries())
    .map(([profileId, e]) => ({
      profileId,
      fullName: e.fullName,
      checkinDays: e.checkinDates.size,
      avgEnergy:
        e.energyValues.length > 0
          ? Math.round((e.energyValues.reduce((a, b) => a + b, 0) / e.energyValues.length) * 10) /
            10
          : null,
      avgMood:
        e.moodValues.length > 0
          ? Math.round((e.moodValues.reduce((a, b) => a + b, 0) / e.moodValues.length) * 10) / 10
          : null,
      blockerCount: e.blockerCount,
    }))
    .sort((a, b) => b.checkinDays - a.checkinDays);

  // Top blockers: count frequency of each blocker string, return top 5
  const blockerFreq = new Map<string, number>();
  for (const b of allBlockers) {
    const key = b.toLowerCase();
    blockerFreq.set(key, (blockerFreq.get(key) ?? 0) + 1);
  }
  const topBlockers = Array.from(blockerFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text]) => text);

  return {
    byEmployee,
    topBlockers,
    totalCheckins: normalized.length,
    avgEnergyOverall:
      allEnergy.length > 0
        ? Math.round((allEnergy.reduce((a, b) => a + b, 0) / allEnergy.length) * 10) / 10
        : null,
    avgMoodOverall:
      allMood.length > 0
        ? Math.round((allMood.reduce((a, b) => a + b, 0) / allMood.length) * 10) / 10
        : null,
  };
}

// ============ TASK STATS ============

export interface TaskStats {
  created: number;
  completed: number;
  overdue: number;
  avgCompletionDays: number | null;
  byEmployee: {
    profileId: string;
    fullName: string;
    created: number;
    completed: number;
    overdue: number;
  }[];
}

/**
 * Get task statistics for a date range.
 * Admin only.
 */
export async function getTaskStats(
  workspaceId: string,
  startDate: string,
  endDate: string
): Promise<TaskStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (!(await isUserAdmin(user.id))) return null;

  const today = new Date().toISOString().split('T')[0];

  // Fetch created tasks in the range
  const { data: createdTasks, error: createdErr } = await supabase
    .from('tasks')
    .select(
      `
      id,
      assignee_id,
      status,
      due_date,
      created_at,
      updated_at,
      assignee:profiles!tasks_assignee_id_fkey (id, full_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);

  if (createdErr) {
    console.error('[getTaskStats] Created tasks error:', createdErr);
    return null;
  }

  // Fetch completed tasks in the range (status=Done, updated_at in range)
  const { data: completedTasks, error: completedErr } = await supabase
    .from('tasks')
    .select(
      `
      id,
      assignee_id,
      status,
      due_date,
      created_at,
      updated_at,
      assignee:profiles!tasks_assignee_id_fkey (id, full_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('status', 'Done')
    .gte('updated_at', `${startDate}T00:00:00Z`)
    .lte('updated_at', `${endDate}T23:59:59Z`);

  if (completedErr) {
    console.error('[getTaskStats] Completed tasks error:', completedErr);
    return null;
  }

  // Fetch overdue tasks (due_date < today, not Done/Canceled)
  const { data: overdueTasks, error: overdueErr } = await supabase
    .from('tasks')
    .select(
      `
      id,
      assignee_id,
      status,
      due_date,
      assignee:profiles!tasks_assignee_id_fkey (id, full_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .lt('due_date', today)
    .not('status', 'in', '("Done","Canceled")');

  if (overdueErr) {
    console.error('[getTaskStats] Overdue tasks error:', overdueErr);
    return null;
  }

  // Normalize FKs
  const normalizeAssignee = (task: { assignee: unknown }) => {
    const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
    return a as { id: string; full_name: string | null } | null;
  };

  // Calculate avg completion days
  let totalCompletionDays = 0;
  let completionCount = 0;
  for (const t of completedTasks ?? []) {
    const createdMs = new Date(t.created_at).getTime();
    const updatedMs = new Date(t.updated_at).getTime();
    const days = (updatedMs - createdMs) / (1000 * 60 * 60 * 24);
    if (days >= 0) {
      totalCompletionDays += days;
      completionCount += 1;
    }
  }

  // Aggregate by employee
  const empMap = new Map<
    string,
    { fullName: string; created: number; completed: number; overdue: number }
  >();

  const ensureEmployee = (
    profileId: string | null,
    assignee: { id: string; full_name: string | null } | null
  ) => {
    if (!profileId) return;
    if (!empMap.has(profileId)) {
      empMap.set(profileId, {
        fullName: assignee?.full_name ?? 'Unknown',
        created: 0,
        completed: 0,
        overdue: 0,
      });
    }
  };

  for (const t of createdTasks ?? []) {
    const assignee = normalizeAssignee(t);
    ensureEmployee(t.assignee_id, assignee);
    if (t.assignee_id) empMap.get(t.assignee_id)!.created += 1;
  }

  for (const t of completedTasks ?? []) {
    const assignee = normalizeAssignee(t);
    ensureEmployee(t.assignee_id, assignee);
    if (t.assignee_id) empMap.get(t.assignee_id)!.completed += 1;
  }

  for (const t of overdueTasks ?? []) {
    const assignee = normalizeAssignee(t);
    ensureEmployee(t.assignee_id, assignee);
    if (t.assignee_id) empMap.get(t.assignee_id)!.overdue += 1;
  }

  const byEmployee = Array.from(empMap.entries())
    .map(([profileId, e]) => ({
      profileId,
      fullName: e.fullName,
      created: e.created,
      completed: e.completed,
      overdue: e.overdue,
    }))
    .sort((a, b) => b.completed - a.completed);

  return {
    created: (createdTasks ?? []).length,
    completed: (completedTasks ?? []).length,
    overdue: (overdueTasks ?? []).length,
    avgCompletionDays:
      completionCount > 0 ? Math.round((totalCompletionDays / completionCount) * 10) / 10 : null,
    byEmployee,
  };
}

// ============ FRAMEWORK (session_reports) ============
//
// Cross-project admin view of structured reports from /qualia-report.
// session_reports has service_role-only RLS, so reads go through the admin
// client. All functions here gate on isUserAdmin first.

export interface FrameworkReportRow {
  id: string;
  project_name: string;
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
}

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
      'id, project_name, client, submitted_at, submitted_by, milestone, milestone_name, phase, phase_name, total_phases, status, verification, tasks_done, tasks_total, deployed_url, build_count, deploy_count, commits, notes, auth_method'
    )
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    query = query.neq('dry_run', true);
  }

  if (filters.project) query = query.eq('project_name', filters.project);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.verification) query = query.eq('verification', filters.verification);
  if (filters.submittedBy) query = query.ilike('submitted_by', `%${filters.submittedBy}%`);
  if (filters.from) query = query.gte('submitted_at', filters.from);
  if (filters.to) query = query.lte('submitted_at', filters.to);

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    console.error('[getFrameworkReports] Error:', error);
    return [];
  }
  return (data ?? []) as FrameworkReportRow[];
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
    .select('project_name, submitted_at, status, verification, build_count, deploy_count, commits')
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
    if (r.project_name)
      projectCounts.set(r.project_name, (projectCounts.get(r.project_name) ?? 0) + 1);
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
    .select('project_name')
    .order('project_name', { ascending: true });

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    projectsQuery = projectsQuery.neq('dry_run', true);
  }

  const { data } = await projectsQuery;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of data ?? []) {
    if (r.project_name && !seen.has(r.project_name)) {
      seen.add(r.project_name);
      result.push(r.project_name);
    }
  }
  return result;
}
