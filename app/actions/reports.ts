'use server';

import { createClient } from '@/lib/supabase/server';
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
    .gte('started_at', `${startDate}T00:00:00Z`)
    .lt('started_at', `${endDate}T23:59:59Z`)
    .not('ended_at', 'is', null)
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
    .gte('started_at', `${startDate}T00:00:00Z`)
    .lt('started_at', `${endDate}T23:59:59Z`)
    .not('ended_at', 'is', null);

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
