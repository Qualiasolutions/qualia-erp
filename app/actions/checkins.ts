'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

// ============ TYPES ============

export type CheckinType = 'morning' | 'evening';

export interface DailyCheckin {
  id: string;
  workspace_id: string;
  profile_id: string;
  checkin_date: string;
  checkin_type: CheckinType;
  // Morning fields
  planned_tasks: string[];
  energy_level: number | null;
  blockers: string | null;
  // Evening fields
  completed_tasks: string[];
  wins: string | null;
  tomorrow_plan: string | null;
  mood: number | null;
  // Clock tracking
  clock_in_time: string | null;
  planned_clock_out_time: string | null;
  actual_clock_out_time: string | null;
  // Metadata
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateCheckinInput {
  checkin_type: CheckinType;
  // Morning
  planned_tasks?: string[];
  energy_level?: number | null;
  blockers?: string | null;
  planned_clock_out_time?: string | null;
  // Evening
  completed_tasks?: string[];
  wins?: string | null;
  tomorrow_plan?: string | null;
  mood?: number | null;
}

// ============ ACTIONS ============

/**
 * Create or update today's check-in (upsert on profile_id + checkin_date + checkin_type).
 * Each user can have one morning and one evening check-in per day.
 */
export async function createDailyCheckin(
  workspaceId: string,
  input: CreateCheckinInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const today = new Date().toISOString().split('T')[0];

  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    profile_id: user.id,
    checkin_date: today,
    checkin_type: input.checkin_type,
    updated_at: new Date().toISOString(),
  };

  if (input.checkin_type === 'morning') {
    if (input.planned_tasks !== undefined) payload.planned_tasks = input.planned_tasks;
    if (input.energy_level !== undefined) payload.energy_level = input.energy_level;
    if (input.blockers !== undefined) payload.blockers = input.blockers?.trim() || null;
    // Auto-capture clock-in time
    payload.clock_in_time = new Date().toISOString();
    if (input.planned_clock_out_time) payload.planned_clock_out_time = input.planned_clock_out_time;
  } else {
    if (input.completed_tasks !== undefined) payload.completed_tasks = input.completed_tasks;
    if (input.wins !== undefined) payload.wins = input.wins?.trim() || null;
    if (input.tomorrow_plan !== undefined)
      payload.tomorrow_plan = input.tomorrow_plan?.trim() || null;
    if (input.mood !== undefined) payload.mood = input.mood;
    // Auto-capture actual clock-out time
    payload.actual_clock_out_time = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(payload, { onConflict: 'profile_id,checkin_date,checkin_type' })
    .select()
    .single();

  if (error) {
    console.error('[createDailyCheckin] Error:', error);
    return { success: false, error: error.message };
  }

  // Notify admins about the check-in (fire-and-forget)
  notifyAdminsOfCheckin(supabase, user.id, workspaceId, input.checkin_type).catch(() => {});

  revalidatePath('/');
  return { success: true, data };
}

async function notifyAdminsOfCheckin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string,
  checkinType: CheckinType
) {
  try {
    // Get user's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const name = profile?.full_name || 'An employee';
    const label = checkinType === 'morning' ? 'morning check-in' : 'end-of-day check-out';

    // Get all admins in workspace
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'admin')
      .neq('id', userId);

    if (!admins?.length) return;

    const { createNotification } = await import('./notifications');
    await Promise.all(
      admins.map((admin) =>
        createNotification(
          admin.id,
          workspaceId,
          'system',
          `${name} submitted their ${label}`,
          undefined,
          '/'
        )
      )
    );
  } catch (err) {
    console.error('[notifyAdminsOfCheckin] Error:', err);
  }
}

/**
 * Get the current user's check-in(s) for today.
 * Returns both morning and evening if they exist.
 */
export async function getTodaysCheckin(workspaceId: string): Promise<DailyCheckin[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', user.id)
    .eq('checkin_date', today)
    .order('checkin_type', { ascending: true });

  if (error) {
    console.error('[getTodaysCheckin] Error:', error);
    return [];
  }

  return (data || []) as DailyCheckin[];
}

/**
 * Get check-ins for admin view. Admin only.
 * Supports filtering by profileId, date, or limit.
 */
export async function getCheckins(
  workspaceId: string,
  options: {
    profileId?: string;
    date?: string;
    checkinType?: CheckinType;
    limit?: number;
  } = {}
): Promise<DailyCheckin[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    console.warn('[getCheckins] Non-admin attempted to access all check-ins');
    return [];
  }

  let query = supabase
    .from('daily_checkins')
    .select(
      `
      *,
      profile:profiles!daily_checkins_profile_id_fkey (id, full_name, avatar_url)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('checkin_date', { ascending: false })
    .order('checkin_type', { ascending: true });

  if (options.profileId) {
    query = query.eq('profile_id', options.profileId);
  }
  if (options.date) {
    query = query.eq('checkin_date', options.date);
  }
  if (options.checkinType) {
    query = query.eq('checkin_type', options.checkinType);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getCheckins] Error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] || null : row.profile,
  })) as DailyCheckin[];
}

/**
 * Get attendance logs for admin view — paired morning/evening entries per employee per day.
 */
export async function getAttendanceLogs(
  workspaceId: string,
  options: { limit?: number; profileId?: string } = {}
): Promise<
  {
    date: string;
    profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
    clock_in_time: string | null;
    planned_clock_out_time: string | null;
    actual_clock_out_time: string | null;
    completed_tasks: string[] | null;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = await isUserAdmin(user.id);
  if (!admin) return [];

  // Get morning check-ins (clock_in data)
  let morningQuery = supabase
    .from('daily_checkins')
    .select(
      'checkin_date, profile_id, clock_in_time, planned_clock_out_time, profile:profiles!daily_checkins_profile_id_fkey (id, full_name, avatar_url)'
    )
    .eq('workspace_id', workspaceId)
    .eq('checkin_type', 'morning')
    .order('checkin_date', { ascending: false });

  if (options.profileId) morningQuery = morningQuery.eq('profile_id', options.profileId);
  if (options.limit) morningQuery = morningQuery.limit(options.limit);

  // Get evening check-ins (clock_out data)
  let eveningQuery = supabase
    .from('daily_checkins')
    .select('checkin_date, profile_id, actual_clock_out_time, completed_tasks')
    .eq('workspace_id', workspaceId)
    .eq('checkin_type', 'evening');

  if (options.profileId) eveningQuery = eveningQuery.eq('profile_id', options.profileId);

  const [{ data: mornings }, { data: evenings }] = await Promise.all([morningQuery, eveningQuery]);

  if (!mornings) return [];

  const eveningMap = new Map<
    string,
    { actual_clock_out_time: string | null; completed_tasks: string[] | null }
  >();
  for (const e of evenings || []) {
    eveningMap.set(`${e.profile_id}_${e.checkin_date}`, {
      actual_clock_out_time: e.actual_clock_out_time,
      completed_tasks: e.completed_tasks,
    });
  }

  return mornings.map((m) => {
    const evening = eveningMap.get(`${m.profile_id}_${m.checkin_date}`);
    return {
      date: m.checkin_date,
      profile: Array.isArray(m.profile) ? m.profile[0] || null : m.profile,
      clock_in_time: m.clock_in_time,
      planned_clock_out_time: m.planned_clock_out_time,
      actual_clock_out_time: evening?.actual_clock_out_time || null,
      completed_tasks: evening?.completed_tasks || null,
    };
  });
}
