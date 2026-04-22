'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';

import { isUserAdmin, isUserManagerOrAbove } from './shared';
import type { ActionResult } from './shared';

// ============ TYPES ============

export interface TeamMemberStatus {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: 'online' | 'offline';
  // When online:
  projectName: string | null;
  clockInNote: string | null;
  sessionStartedAt: string | null;
  // When offline:
  lastSessionEndedAt: string | null;
}

export interface WorkSession {
  id: string;
  workspace_id: string;
  profile_id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  summary: string | null;
  clock_in_note: string | null;
  created_at: string;
  project?: { id: string; name: string } | null;
  profile?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

// ============ ACTIONS ============

/**
 * Get today's date string in UTC (YYYY-MM-DD).
 */
function todayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Clock in: create a new work session.
 * Rejects if user already has an open session TODAY.
 * Stale sessions from previous days are auto-closed before creating a new one.
 */
export async function clockIn(
  workspaceId: string,
  projectId: string | null,
  clockInNote?: string,
  plannedDurationMinutes?: number,
  clockInReason?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Auto-close any stale open sessions from previous days (cap at 8h from start)
  const today = todayUTC();
  const { data: staleSessions } = await supabase
    .from('work_sessions')
    .select('id, started_at')
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .lt('started_at', `${today}T00:00:00.000Z`);

  if (staleSessions && staleSessions.length > 0) {
    await Promise.all(
      staleSessions.map((stale) => {
        const cappedEnd = new Date(
          new Date(stale.started_at).getTime() + 8 * 60 * 60 * 1000
        ).toISOString();
        return supabase
          .from('work_sessions')
          .update({ ended_at: cappedEnd, summary: '[Auto-closed: forgot to clock out]' })
          .eq('id', stale.id)
          .eq('profile_id', user.id);
      })
    );
  }

  // Check for existing open session TODAY
  const { data: existing } = await supabase
    .from('work_sessions')
    .select('id')
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .gte('started_at', `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'You already have an active session. Clock out first.' };
  }

  if (!projectId && !clockInNote?.trim()) {
    return { success: false, error: 'Please describe what you will be working on.' };
  }

  if (!projectId && !plannedDurationMinutes) {
    return { success: false, error: 'Please select how long you plan to work.' };
  }

  if (!projectId && !clockInReason?.trim()) {
    return { success: false, error: 'Please provide a reason for this session.' };
  }

  const { data, error } = await supabase
    .from('work_sessions')
    .insert({
      workspace_id: workspaceId,
      profile_id: user.id,
      project_id: projectId,
      started_at: new Date().toISOString(),
      clock_in_note: clockInNote?.trim() || null,
      planned_duration_minutes: plannedDurationMinutes || null,
      clock_in_reason: clockInReason?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[clockIn] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/tasks');

  return { success: true, data };
}

/**
 * Clock out: close the active session with a summary and computed duration.
 * Validates that the session belongs to the current user.
 */
export async function clockOut(
  workspaceId: string,
  sessionId: string,
  summary: string,
  reportUrl?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!summary.trim()) {
    return { success: false, error: 'Summary is required.' };
  }

  // Fetch the open session (must belong to this user)
  const { data: session, error: fetchError } = await supabase
    .from('work_sessions')
    .select('id, started_at')
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .maybeSingle();

  if (fetchError) {
    console.error('[clockOut] Fetch error:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!session) {
    return { success: false, error: 'No active session found.' };
  }

  const updatePayload: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
    summary: summary.trim(),
  };
  if (reportUrl) {
    updatePayload.report_url = reportUrl;
  }

  const { data, error } = await supabase
    .from('work_sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[clockOut] Update error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/tasks');

  return { success: true, data };
}

/**
 * Auto clock out: close the active session without requiring user input.
 * Used by idle detection when grace period expires.
 * Validates that the session belongs to the current user and is still open.
 */
export async function autoClockOut(
  workspaceId: string,
  sessionId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch the open session (must belong to this user)
  const { data: session, error: fetchError } = await supabase
    .from('work_sessions')
    .select('id, started_at')
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .maybeSingle();

  if (fetchError) {
    console.error('[autoClockOut] Fetch error:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!session) {
    return { success: false, error: 'No active session found.' };
  }

  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      ended_at: new Date().toISOString(),
      summary: reason,
    })
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[autoClockOut] Update error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get the current user's active (open) session, or null if none.
 */
export async function getActiveSession(workspaceId: string): Promise<WorkSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = todayUTC();

  // Item 24: Explicit column projection instead of select('*')
  const { data, error } = await supabase
    .from('work_sessions')
    .select(
      'id, workspace_id, profile_id, project_id, started_at, ended_at, clock_in_note, project_status, summary, duration_minutes, created_at, project:projects!work_sessions_project_id_fkey (id, name)'
    )
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .gte('started_at', `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getActiveSession] Error:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
  } as WorkSession;
}

/**
 * Get all work sessions for the current user today (open and closed).
 * Ordered by started_at ascending.
 */
export async function getTodaysSessions(workspaceId: string): Promise<WorkSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];

  // Item 24: Explicit column projection instead of select('*')
  const { data, error } = await supabase
    .from('work_sessions')
    .select(
      'id, workspace_id, profile_id, project_id, started_at, ended_at, clock_in_note, project_status, summary, duration_minutes, created_at, project:projects!work_sessions_project_id_fkey (id, name)'
    )
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .gte('started_at', `${today}T00:00:00.000Z`)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[getTodaysSessions] Error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    project: Array.isArray(row.project) ? row.project[0] || null : row.project,
  })) as WorkSession[];
}

/**
 * Get work sessions for admin attendance view.
 * Admin only. Supports filtering by profileId, date, and limit.
 */
export async function getSessionsAdmin(
  workspaceId: string,
  options: {
    profileId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<WorkSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    console.warn('[getSessionsAdmin] Non-admin attempted to access all sessions');
    return [];
  }

  let query = supabase
    .from('work_sessions')
    .select(
      `
      id, workspace_id, profile_id, project_id, started_at, ended_at, duration_minutes, summary, clock_in_note, created_at,
      profile:profiles!work_sessions_profile_id_fkey (id, full_name, avatar_url),
      project:projects!work_sessions_project_id_fkey (id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false });

  if (options.profileId) {
    query = query.eq('profile_id', options.profileId);
  }

  if (options.startDate && options.endDate) {
    query = query
      .gte('started_at', `${options.startDate}T00:00:00Z`)
      .lt('started_at', `${options.endDate}T23:59:59Z`);
  } else if (options.date) {
    const nextDay = new Date(options.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    query = query
      .gte('started_at', `${options.date}T00:00:00Z`)
      .lt('started_at', `${nextDayStr}T00:00:00Z`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getSessionsAdmin] Error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] || null : row.profile,
    project: Array.isArray(row.project) ? row.project[0] || null : row.project,
  })) as WorkSession[];
}

/**
 * Get the current user's own work sessions (last 30 days).
 * Any authenticated user can call this.
 */
export async function getMySessions(
  workspaceId: string,
  options: { limit?: number } = {}
): Promise<WorkSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('work_sessions')
    .select(
      `id, workspace_id, profile_id, project_id, started_at, ended_at, duration_minutes, summary, clock_in_note, created_at,
      project:projects!work_sessions_project_id_fkey (id, name)`
    )
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .gte('started_at', thirtyDaysAgo.toISOString())
    .order('started_at', { ascending: false })
    .limit(options.limit || 100);

  if (error) {
    console.error('[getMySessions] Error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    project: Array.isArray(row.project) ? row.project[0] || null : row.project,
  })) as WorkSession[];
}

/**
 * Get live status for all employees in the workspace.
 * Returns each employee as online (clocked in) or offline (last session time).
 * Admin only. Results are sorted: online first, then offline; alphabetically within each group.
 */
export async function getTeamStatus(workspaceId: string): Promise<TeamMemberStatus[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const allowed = await isUserManagerOrAbove(user.id);
  if (!allowed) {
    return [];
  }

  // Query 1 + 2 in parallel: workspace members AND open sessions
  const [{ data: members, error: membersError }, { data: openSessions, error: openError }] =
    await Promise.all([
      supabase
        .from('workspace_members')
        .select(
          'profile:profiles!workspace_members_profile_id_fkey(id, full_name, avatar_url, role)'
        )
        .eq('workspace_id', workspaceId),
      supabase
        .from('work_sessions')
        .select(
          'profile_id, started_at, clock_in_note, project:projects!work_sessions_project_id_fkey (id, name)'
        )
        .eq('workspace_id', workspaceId)
        .is('ended_at', null),
    ]);

  if (membersError) {
    console.error('[getTeamStatus] Profiles error:', membersError);
    return [];
  }

  // Team status shows only admins + employees — never clients.
  const profiles = (members || [])
    .map((m) => (Array.isArray(m.profile) ? m.profile[0] : m.profile))
    .filter(
      (
        p
      ): p is {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: string | null;
      } => !!p && (p.role === 'admin' || p.role === 'employee')
    );

  if (profiles.length === 0) return [];

  if (openError) {
    console.error('[getTeamStatus] Open sessions error:', openError);
    return [];
  }

  // Build a map of profileId -> open session
  // Treat sessions older than 14 hours as stale (person forgot to clock out)
  const STALE_THRESHOLD_MS = 14 * 60 * 60 * 1000;
  const now = Date.now();
  const openSessionMap = new Map<
    string,
    { started_at: string; projectName: string | null; clockInNote: string | null }
  >();
  const staleSessionIds: string[] = [];
  for (const session of openSessions || []) {
    const sessionAge = now - new Date(session.started_at).getTime();
    if (sessionAge > STALE_THRESHOLD_MS) {
      // Mark as stale — will auto-close below
      staleSessionIds.push(session.profile_id);
      continue;
    }
    const project = Array.isArray(session.project) ? session.project[0] || null : session.project;
    openSessionMap.set(session.profile_id, {
      started_at: session.started_at,
      projectName: (project as { name: string } | null)?.name ?? null,
      clockInNote: session.clock_in_note ?? null,
    });
  }

  // Auto-close stale sessions in the background (fire-and-forget).
  // We don't await this — the team status response is returned immediately —
  // but we DO log failures so silent RLS/permission breakage doesn't hide.
  if (staleSessionIds.length > 0) {
    void supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .is('ended_at', null)
      .in('profile_id', staleSessionIds)
      .eq('workspace_id', workspaceId)
      .then(({ error }) => {
        if (error) {
          console.error('[work-sessions] stale session auto-close failed:', error);
        }
      });
  }

  // Query 3: Most recent closed session per profile (for offline last-seen time)
  const offlineProfileIds = profiles.map((p) => p.id).filter((id) => !openSessionMap.has(id));

  const lastSessionMap = new Map<string, string | null>();
  if (offlineProfileIds.length > 0) {
    // PH-H3: Safety cap on unbounded query — 5x offline profiles to account for
    // multiple sessions per person. JS de-dup below picks one per profile.
    // TODO: Long-term fix is an RPC with DISTINCT ON (profile_id) for O(1) per profile.
    const { data: recentSessions, error: recentError } = await supabase
      .from('work_sessions')
      .select('profile_id, ended_at')
      .eq('workspace_id', workspaceId)
      .in('profile_id', offlineProfileIds)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(offlineProfileIds.length * 5);

    if (recentError) {
      console.error('[getTeamStatus] Recent sessions error:', recentError);
    } else {
      // Take first result per profile_id (most recent)
      for (const session of recentSessions || []) {
        if (!lastSessionMap.has(session.profile_id)) {
          lastSessionMap.set(session.profile_id, session.ended_at);
        }
      }
    }
  }

  // Map profiles to TeamMemberStatus
  const statuses: TeamMemberStatus[] = profiles.map((profile) => {
    const openSession = openSessionMap.get(profile.id);
    if (openSession) {
      return {
        profileId: profile.id,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        status: 'online',
        projectName: openSession.projectName,
        clockInNote: openSession.clockInNote,
        sessionStartedAt: openSession.started_at,
        lastSessionEndedAt: null,
      };
    } else {
      return {
        profileId: profile.id,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        status: 'offline',
        projectName: null,
        clockInNote: null,
        sessionStartedAt: null,
        lastSessionEndedAt: lastSessionMap.get(profile.id) ?? null,
      };
    }
  });

  // Sort: online first, then offline; alphabetically by fullName within each group
  statuses.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'online' ? -1 : 1;
    }
    return (a.fullName ?? '').localeCompare(b.fullName ?? '');
  });

  return statuses;
}

// ============ PLANNED LOGOUT TIME ============

/**
 * Get the current user's planned logout time from their profile.
 * Returns a TIME string (e.g. "16:00:00") or null if not set.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPlannedLogoutTime(_workspaceId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Filter by user ID only (profiles has no workspace_id column)
  const { data, error } = await supabase
    .from('profiles')
    .select('planned_logout_time')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getPlannedLogoutTime] Error:', error);
    return null;
  }

  return data?.planned_logout_time ?? null;
}

/**
 * Update the current user's planned logout time.
 * Accepts "HH:MM" or "HH:MM:SS" format, or null/empty to clear.
 */
export async function updatePlannedLogoutTime(
  workspaceId: string,
  time: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate format: HH:MM or HH:MM:SS, or null/empty to clear
  let normalizedTime: string | null = null;
  if (time && time.trim() !== '') {
    const trimmed = time.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
    if (!timeRegex.test(trimmed)) {
      return { success: false, error: 'Invalid time format. Use HH:MM (e.g. 16:00).' };
    }
    normalizedTime = trimmed;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ planned_logout_time: normalizedTime })
    .eq('id', user.id);

  if (error) {
    console.error('[updatePlannedLogoutTime] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check whether a structured /qualia-report was posted for the given work session.
 *
 * /qualia-report does two POSTs: a file upload (sets work_sessions.report_url)
 * and a structured JSON payload (inserts into session_reports). Either can
 * succeed while the other fails. The clock-out modal was only watching the
 * file path, so a successful structured POST with a failed upload showed up
 * as "no report attached." This action complements the file check by detecting
 * a matching session_reports row within the session's active window.
 *
 * Match criterion: project_name + submitted_at within [session.started_at,
 * session.ended_at ?? now]. session_reports has no FK to work_sessions, so
 * time+project is the closest available correlation.
 *
 * Uses admin client because session_reports RLS is service_role-only.
 */
export async function hasStructuredReportForSession(
  sessionId: string,
  options?: { includeDryRun?: boolean }
): Promise<{ attached: boolean; report_id?: string; submitted_at?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { attached: false };
  }

  const { data: session } = await supabase
    .from('work_sessions')
    .select('started_at, ended_at, profile_id, project:projects(name)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.profile_id !== user.id) {
    return { attached: false };
  }

  const projectRow = Array.isArray(session.project) ? session.project[0] : session.project;
  const projectName = (projectRow as { name?: string } | null | undefined)?.name;
  if (!projectName) {
    return { attached: false };
  }

  const windowEnd = session.ended_at ?? new Date().toISOString();

  const admin = createAdminClient();
  // Case-insensitive match: framework uses slug-style lowercase ("sakani"),
  // projects.name is human-cased ("Sakani"). Exact-match drops the link.
  let reportQuery = admin
    .from('session_reports')
    .select('id, submitted_at')
    .ilike('project_name', projectName)
    .gte('submitted_at', session.started_at)
    .lte('submitted_at', windowEnd)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    reportQuery = reportQuery.neq('dry_run', true);
  }

  const { data: report } = await reportQuery.maybeSingle();

  if (!report) return { attached: false };
  return {
    attached: true,
    report_id: report.id,
    submitted_at: report.submitted_at ?? undefined,
  };
}

// ============ SESSION REPORTS (read side) ============

export interface ProjectSessionReport {
  id: string;
  client_report_id: string | null;
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
  notes: string | null;
  commits: string[] | null;
}

/**
 * Fetch recent session_reports rows for a project by its human-readable name
 * (matches session_reports.project_name emitted by /qualia-report).
 *
 * Uses admin client because session_reports RLS is service_role-only. Authz is
 * enforced before the read: caller must be authenticated and be admin or have
 * an active assignment on a project whose name matches.
 */
export async function getSessionReportsForProject(
  projectName: string,
  limit = 20,
  options?: { includeDryRun?: boolean }
): Promise<ProjectSessionReport[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !projectName) return [];

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role;

  // Clients must never access session reports — block by design, not by coincidence
  if (role === 'client') return [];

  if (role !== 'admin') {
    const { data: assignment } = await admin
      .from('project_assignments')
      .select('id, projects!inner(name)')
      .eq('employee_id', user.id)
      .is('removed_at', null)
      .eq('projects.name', projectName)
      .limit(1)
      .maybeSingle();
    if (!assignment) return [];
  }

  let reportsQuery = admin
    .from('session_reports')
    .select(
      'id, client_report_id, submitted_at, submitted_by, milestone, milestone_name, phase, phase_name, total_phases, status, verification, tasks_done, tasks_total, deployed_url, build_count, deploy_count, notes, commits'
    )
    .ilike('project_name', projectName)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!options?.includeDryRun) {
    // Filter dry_run=true synthetic pings (qualia-framework erp-ping) out of production views
    reportsQuery = reportsQuery.neq('dry_run', true);
  }

  const { data, error } = await reportsQuery;

  if (error) {
    console.error('[getSessionReportsForProject] Error:', error);
    return [];
  }
  return (data ?? []) as ProjectSessionReport[];
}
