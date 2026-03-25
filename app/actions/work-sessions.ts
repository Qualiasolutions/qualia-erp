'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

// ============ TYPES ============

export interface WorkSession {
  id: string;
  workspace_id: string;
  profile_id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  summary: string | null;
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
export async function clockIn(workspaceId: string, projectId: string): Promise<ActionResult> {
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
    for (const stale of staleSessions) {
      const cappedEnd = new Date(
        new Date(stale.started_at).getTime() + 8 * 60 * 60 * 1000
      ).toISOString();
      await supabase
        .from('work_sessions')
        .update({ ended_at: cappedEnd, summary: '[Auto-closed: forgot to clock out]' })
        .eq('id', stale.id)
        .eq('profile_id', user.id);
    }
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

  const { data, error } = await supabase
    .from('work_sessions')
    .insert({
      workspace_id: workspaceId,
      profile_id: user.id,
      project_id: projectId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[clockIn] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

/**
 * Clock out: close the active session with a summary and computed duration.
 * Validates that the session belongs to the current user.
 */
export async function clockOut(
  workspaceId: string,
  sessionId: string,
  summary: string
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

  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      ended_at: new Date().toISOString(),
      summary: summary.trim(),
    })
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[clockOut] Update error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
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

  const { data, error } = await supabase
    .from('work_sessions')
    .select('*, project:projects!work_sessions_project_id_fkey (id, name)')
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

  const { data, error } = await supabase
    .from('work_sessions')
    .select('*, project:projects!work_sessions_project_id_fkey (id, name)')
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
  options: { profileId?: string; date?: string; limit?: number } = {}
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
      *,
      profile:profiles!work_sessions_profile_id_fkey (id, full_name, avatar_url),
      project:projects!work_sessions_project_id_fkey (id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false });

  if (options.profileId) {
    query = query.eq('profile_id', options.profileId);
  }

  if (options.date) {
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
