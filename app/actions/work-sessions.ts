'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { validateData } from '@/lib/validation';

import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

// ============ ZOD SCHEMAS ============

const clockInSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  projectIds: z
    .array(z.string().uuid('Invalid project ID'))
    .min(1, 'At least one project required'),
  clockInNote: z.string().max(2000).optional(),
  plannedDurationMinutes: z.number().int().positive().max(1440).optional(),
  clockInReason: z.string().max(500).optional(),
  clockInActivities: z.array(z.string().max(64)).max(10).optional(),
});

const clockOutSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  summary: z.string().min(1, 'Summary is required').max(5000),
  reportUrl: z.string().url().max(2000).optional(),
});

const autoClockOutSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  reason: z.string().min(1).max(2000),
});

const adminOverrideSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  sessionId: z.string().uuid('Invalid session ID'),
  reason: z.string().min(1, 'Override reason is required').max(2000),
});

const workspaceIdSchema = z.string().uuid('Invalid workspace ID');
const sessionIdSchema = z.string().uuid('Invalid session ID');
const plannedLogoutTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Invalid time format. Use HH:MM')
  .nullable();

// ============ TYPES ============

export interface TeamMemberStatus {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: 'online' | 'offline';
  // When online:
  sessionId: string | null;
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

// Sessions older than this without being clocked out are treated as "forgot
// to clock out" — auto-closed with an 8h cap on the next clock-in. 16h covers
// legitimate overnight shifts (crossing UTC midnight for eastern timezones)
// without keeping orphaned sessions alive forever.
const STALE_SESSION_MS = 16 * 60 * 60 * 1000;
const STALE_CAP_MS = 8 * 60 * 60 * 1000;

/**
 * Clock in: create a new work session.
 *
 * Multi-project: pass at least one project id. The first one is stored on
 * `work_sessions.project_id` as the "primary" for legacy display sites
 * ("Working on X" badges, attendance views), and ALL chosen projects are
 * mirrored into the `work_session_projects` join table — that's what the
 * clock-out check loops over to require one /qualia-report per project.
 *
 * Rejects if the user already has an open session (any age under
 * STALE_SESSION_MS). Sessions older than STALE_SESSION_MS are auto-closed
 * with an 8h cap first.
 */
export async function clockIn(
  workspaceId: string,
  projectIds: string[],
  clockInNote?: string,
  plannedDurationMinutes?: number,
  clockInReason?: string,
  clockInActivities?: string[]
): Promise<ActionResult> {
  const parsed = validateData(clockInSchema, {
    workspaceId,
    projectIds,
    clockInNote,
    plannedDurationMinutes,
    clockInReason,
    clockInActivities,
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Deduplicate validated project IDs
  const cleanedProjectIds = Array.from(new Set(parsed.data.projectIds));

  // Date-agnostic: previously used UTC midnight as the stale boundary, which
  // misfired for users whose evening shifts crossed 00:00 UTC.
  const { data: openSessions } = await supabase
    .from('work_sessions')
    .select('id, started_at')
    .eq('profile_id', user.id)
    .eq('workspace_id', parsed.data.workspaceId)
    .is('ended_at', null);

  const now = Date.now();
  const stale = (openSessions ?? []).filter(
    (s) => now - new Date(s.started_at).getTime() > STALE_SESSION_MS
  );
  const live = (openSessions ?? []).filter(
    (s) => now - new Date(s.started_at).getTime() <= STALE_SESSION_MS
  );

  if (stale.length > 0) {
    await Promise.all(
      stale.map((s) => {
        const cappedEnd = new Date(new Date(s.started_at).getTime() + STALE_CAP_MS).toISOString();
        return supabase
          .from('work_sessions')
          .update({ ended_at: cappedEnd, summary: '[Auto-closed: forgot to clock out]' })
          .eq('id', s.id)
          .eq('profile_id', user.id)
          .select();
      })
    );
  }

  if (live.length > 0) {
    return { success: false, error: 'You already have an active session. Clock out first.' };
  }

  if (!parsed.data.clockInNote?.trim()) {
    return { success: false, error: 'Tell the team what you plan to work on this session.' };
  }

  if (!parsed.data.plannedDurationMinutes) {
    return { success: false, error: 'Please select how long you plan to work.' };
  }

  // Verify every chosen project actually exists in this workspace before
  // inserting — bad ids would slip past the clock-in modal otherwise.
  const { data: validProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', parsed.data.workspaceId)
    .in('id', cleanedProjectIds);
  const validIds = new Set((validProjects ?? []).map((p) => p.id));
  if (validIds.size !== cleanedProjectIds.length) {
    return { success: false, error: 'One or more selected projects are invalid.' };
  }

  // Normalize activities: already validated by Zod schema.
  const activities = parsed.data.clockInActivities
    ? Array.from(
        new Set(parsed.data.clockInActivities.map((a) => a.trim()).filter((a) => a.length > 0))
      ).slice(0, 10)
    : [];

  // First-picked id is the "primary" — drives legacy display sites.
  const primaryProjectId = cleanedProjectIds[0];

  const { data, error } = await supabase
    .from('work_sessions')
    .insert({
      workspace_id: parsed.data.workspaceId,
      profile_id: user.id,
      project_id: primaryProjectId,
      started_at: new Date().toISOString(),
      clock_in_note: parsed.data.clockInNote?.trim() || null,
      planned_duration_minutes: parsed.data.plannedDurationMinutes || null,
      clock_in_reason: parsed.data.clockInReason?.trim() || null,
      clock_in_activities: activities.length > 0 ? activities : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[clockIn] Error:', error);
    return { success: false, error: error.message };
  }

  // Insert one row per chosen project. If this fails the session is left
  // partially wired — undo by deleting the parent row so the user can retry.
  const links = cleanedProjectIds.map((projectId) => ({
    session_id: data.id,
    project_id: projectId,
  }));
  const { error: linkError } = await supabase.from('work_session_projects').insert(links);
  if (linkError) {
    console.error('[clockIn] Link insert error:', linkError);
    await supabase.from('work_sessions').delete().eq('id', data.id).select();
    return { success: false, error: linkError.message };
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
  const parsed = validateData(clockOutSchema, { workspaceId, sessionId, summary, reportUrl });
  if (!parsed.success) return { success: false, error: parsed.error };

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
    .select('id, started_at, project_id, report_url')
    .eq('id', parsed.data.sessionId)
    .eq('profile_id', user.id)
    .eq('workspace_id', parsed.data.workspaceId)
    .is('ended_at', null)
    .maybeSingle();

  if (fetchError) {
    console.error('[clockOut] Fetch error:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!session) {
    return { success: false, error: 'No active session found.' };
  }

  // Block clock-out until EVERY chosen project has a session report attached.
  // Either an uploaded file (work_sessions.report_url) OR a structured row in
  // session_reports counts as the attached report — the structured per-project
  // check below loops over every project linked to this session and lets
  // through only if all of them have one.
  const status = await getSessionProjectsStatus(parsed.data.sessionId);
  if (status.projects.length === 0) {
    return {
      success: false,
      error: 'No projects on this session — contact an admin.',
    };
  }
  const missing = status.projects.filter((p) => !p.hasReport);
  if (missing.length > 0) {
    const names = missing.map((p) => p.name).join(', ');
    return {
      success: false,
      error:
        missing.length === 1
          ? `Run /qualia-report in the ${names} repo before clocking out.`
          : `Run /qualia-report in each repo before clocking out — still missing: ${names}.`,
    };
  }

  const updatePayload: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
    summary: parsed.data.summary.trim(),
  };
  if (parsed.data.reportUrl) {
    updatePayload.report_url = parsed.data.reportUrl;
  }

  const { data, error } = await supabase
    .from('work_sessions')
    .update(updatePayload)
    .eq('id', parsed.data.sessionId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[clockOut] Update error:', error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: 'Session update blocked by RLS' };
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
  const parsed = validateData(autoClockOutSchema, { workspaceId, sessionId, reason });
  if (!parsed.success) return { success: false, error: parsed.error };

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
    .eq('id', parsed.data.sessionId)
    .eq('profile_id', user.id)
    .eq('workspace_id', parsed.data.workspaceId)
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
      summary: parsed.data.reason,
    })
    .eq('id', parsed.data.sessionId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[autoClockOut] Update error:', error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: 'Session update blocked by RLS' };
  }

  return { success: true, data };
}

/**
 * Admin override: force-close a stuck session belonging to ANY profile.
 *
 * Background (2026-04-28 ops diagnosis): if /qualia-report fails for an
 * employee, the standard clockOut path blocks them at the modal. This is
 * the audited escape hatch — admin presses a button, supplies a reason,
 * the session is closed and the override is logged.
 *
 * Audit trail:
 *   - work_sessions.summary is overwritten with `[Admin override by <name>]`
 *     so the row is self-explanatory in the dashboard.
 *   - For project sessions, an activity_log row is also inserted with
 *     action_type='session_admin_overrode' so the override surfaces in the
 *     project's activity feed.
 */
export async function adminOverrideClockOut(
  workspaceId: string,
  sessionId: string,
  reason: string
): Promise<ActionResult> {
  const parsed = validateData(adminOverrideSchema, { workspaceId, sessionId, reason });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Admin only.' };
  }

  const trimmedReason = parsed.data.reason.trim();

  const { data: session, error: fetchError } = await supabase
    .from('work_sessions')
    .select('id, started_at, profile_id, project_id, summary')
    .eq('id', parsed.data.sessionId)
    .eq('workspace_id', parsed.data.workspaceId)
    .is('ended_at', null)
    .maybeSingle();

  if (fetchError) {
    console.error('[adminOverrideClockOut] Fetch error:', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!session) {
    return { success: false, error: 'No active session found.' };
  }

  const overrideStamp = `[Admin override · ${new Date().toISOString()}] ${trimmedReason}`;

  // Use the admin client so workspace-scoped RLS doesn't block updating a row
  // owned by another profile.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('work_sessions')
    .update({
      ended_at: new Date().toISOString(),
      summary: session.summary ? `${session.summary}\n\n${overrideStamp}` : overrideStamp,
    })
    .eq('id', parsed.data.sessionId)
    .select()
    .single();

  if (error) {
    console.error('[adminOverrideClockOut] Update error:', error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: 'Session update blocked by RLS' };
  }

  // Best-effort audit: only project sessions get an activity_log entry
  // (the table requires a non-null project_id).
  if (session.project_id) {
    const { error: logError } = await admin.from('activity_log').insert({
      project_id: session.project_id,
      actor_id: user.id,
      action_type: 'session_admin_overrode',
      action_data: {
        session_id: parsed.data.sessionId,
        target_profile_id: session.profile_id,
        reason: trimmedReason,
        started_at: session.started_at,
      },
      is_client_visible: false,
    });
    if (logError) {
      // Don't fail the override on a log-write failure; just surface it.
      console.error('[adminOverrideClockOut] Audit log write failed:', logError);
    }
  }

  revalidatePath('/');
  revalidatePath('/tasks');

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

  // Date-agnostic: overnight shifts crossing UTC midnight must still appear
  // as the active session for the user.
  const { data, error } = await supabase
    .from('work_sessions')
    .select(
      'id, workspace_id, profile_id, project_id, started_at, ended_at, clock_in_note, summary, duration_minutes, created_at, project:projects!work_sessions_project_id_fkey (id, name)'
    )
    .eq('profile_id', user.id)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
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
      'id, workspace_id, profile_id, project_id, started_at, ended_at, clock_in_note, summary, duration_minutes, created_at, project:projects!work_sessions_project_id_fkey (id, name)'
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

  const allowed = await isUserAdmin(user.id);
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
          'id, profile_id, started_at, clock_in_note, project:projects!work_sessions_project_id_fkey (id, name)'
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
    { id: string; started_at: string; projectName: string | null; clockInNote: string | null }
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
      id: session.id,
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
      .select()
      .then(({ data: closedRows, error }) => {
        if (error) {
          console.error('[work-sessions] stale session auto-close failed:', error);
        } else if (!closedRows || closedRows.length === 0) {
          console.warn('[work-sessions] stale session auto-close: 0 rows updated (RLS?)');
        }
      });
  }

  // Query 3: Most recent closed session per profile (for offline last-seen time)
  const offlineProfileIds = profiles.map((p) => p.id).filter((id) => !openSessionMap.has(id));

  const lastSessionMap = new Map<string, string | null>();
  if (offlineProfileIds.length > 0) {
    const { data: recentSessions, error: recentError } = await supabase.rpc(
      'get_latest_session_per_profile',
      { p_workspace_id: workspaceId, p_profile_ids: offlineProfileIds }
    );

    if (recentError) {
      console.error('[getTeamStatus] Recent sessions error:', recentError);
    } else {
      for (const session of (recentSessions || []) as { profile_id: string; ended_at: string }[]) {
        lastSessionMap.set(session.profile_id, session.ended_at);
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
        sessionId: openSession.id,
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
        sessionId: null,
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
  // Normalize empty string to null before validation
  const normalizedInput = time && time.trim() !== '' ? time.trim() : null;
  const parsed = validateData(plannedLogoutTimeSchema, normalizedInput);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ planned_logout_time: parsed.data })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[updatePlannedLogoutTime] Error:', error);
    return { success: false, error: error.message };
  }
  if (!updated) {
    return { success: false, error: 'Profile update blocked by RLS' };
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
 * Uses admin client because session_reports has server-only RLS.
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
    .select('started_at, ended_at, profile_id, project_id, project:projects(name)')
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
  if (session.project_id) {
    let canonicalQuery = admin
      .from('session_reports')
      .select('id, submitted_at')
      .eq('erp_project_id', session.project_id)
      .gte('submitted_at', session.started_at)
      .lte('submitted_at', windowEnd)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (!options?.includeDryRun) {
      canonicalQuery = canonicalQuery.neq('dry_run', true);
    }

    const { data: canonicalReport } = await canonicalQuery.maybeSingle();
    if (canonicalReport) {
      return {
        attached: true,
        report_id: canonicalReport.id,
        submitted_at: canonicalReport.submitted_at ?? undefined,
      };
    }
  }

  // Substring match (case-insensitive). The framework's tracking.json often
  // carries a longer descriptive project_name in the report ("Qualia
  // Solutions — qualiasolutions.net Rebuild"), while the ERP's projects.name
  // is the canonical short name ("Qualia Solutions"). Exact / prefix-only
  // matching dropped the link and blocked clock-out for legitimate reports.
  // The time-window filter (started_at..ended_at) keeps cross-project
  // collisions astronomically unlikely.
  // Escape postgres LIKE meta-characters to avoid accidental wildcard match
  // for short project names that contain '%' or '_'.
  const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
  let reportQuery = admin
    .from('session_reports')
    .select('id, submitted_at')
    .ilike('project_name', `%${escapeLike(projectName)}%`)
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

export interface SessionProjectStatus {
  projectId: string;
  name: string;
  hasReport: boolean;
  reportId?: string;
  reportSubmittedAt?: string;
}

/**
 * Per-project report status for a multi-project work session.
 *
 * For each project linked to the session via work_session_projects, returns
 * whether a /qualia-report has landed (either a canonical session_reports row
 * keyed by erp_project_id, or an ilike match on project_name within the
 * session's active window). The clock-out modal renders this as a checklist
 * and the clockOut action gates submit on every entry being green.
 *
 * The legacy work_sessions.report_url file-upload path counts ONLY when the
 * session has exactly one project — there's a single URL field, so it can't
 * unambiguously satisfy multi-project sessions.
 */
export async function getSessionProjectsStatus(
  sessionId: string,
  options?: { includeDryRun?: boolean }
): Promise<{ projects: SessionProjectStatus[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { projects: [] };

  const { data: session } = await supabase
    .from('work_sessions')
    .select('started_at, ended_at, profile_id, report_url')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.profile_id !== user.id) {
    return { projects: [] };
  }

  const { data: linkRows } = await supabase
    .from('work_session_projects')
    .select('project_id, project:projects!work_session_projects_project_id_fkey(id, name)')
    .eq('session_id', sessionId);

  const linked = (linkRows ?? [])
    .map((row) => {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      return project ? { id: project.id, name: project.name } : null;
    })
    .filter((p): p is { id: string; name: string } => !!p);

  if (linked.length === 0) return { projects: [] };

  const windowEnd = session.ended_at ?? new Date().toISOString();
  const admin = createAdminClient();
  const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

  const statuses = await Promise.all(
    linked.map(async (project): Promise<SessionProjectStatus> => {
      let canonicalQuery = admin
        .from('session_reports')
        .select('id, submitted_at')
        .eq('erp_project_id', project.id)
        .gte('submitted_at', session.started_at)
        .lte('submitted_at', windowEnd)
        .order('submitted_at', { ascending: false })
        .limit(1);
      if (!options?.includeDryRun) {
        canonicalQuery = canonicalQuery.neq('dry_run', true);
      }
      const { data: canonical } = await canonicalQuery.maybeSingle();
      if (canonical) {
        return {
          projectId: project.id,
          name: project.name,
          hasReport: true,
          reportId: canonical.id,
          reportSubmittedAt: canonical.submitted_at ?? undefined,
        };
      }

      let nameQuery = admin
        .from('session_reports')
        .select('id, submitted_at')
        .ilike('project_name', `%${escapeLike(project.name)}%`)
        .gte('submitted_at', session.started_at)
        .lte('submitted_at', windowEnd)
        .order('submitted_at', { ascending: false })
        .limit(1);
      if (!options?.includeDryRun) {
        nameQuery = nameQuery.neq('dry_run', true);
      }
      const { data: byName } = await nameQuery.maybeSingle();
      if (byName) {
        return {
          projectId: project.id,
          name: project.name,
          hasReport: true,
          reportId: byName.id,
          reportSubmittedAt: byName.submitted_at ?? undefined,
        };
      }

      // Legacy file-upload path: only valid when there's exactly one project.
      if (linked.length === 1 && session.report_url) {
        return { projectId: project.id, name: project.name, hasReport: true };
      }

      return { projectId: project.id, name: project.name, hasReport: false };
    })
  );

  return { projects: statuses };
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
 * Uses admin client because session_reports has server-only RLS. Authz is
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
