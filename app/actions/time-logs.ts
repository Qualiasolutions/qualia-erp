'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

// ============ TYPES ============

export interface TaskTimeLog {
  id: string;
  workspace_id: string;
  profile_id: string;
  task_id: string | null;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null; // GENERATED column — computed by DB
  notes: string | null;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ============ ACTIONS ============

/**
 * Start a timer for a task.
 * Upserts a time log with started_at = now, clears ended_at.
 * If a log already exists for this user+task session (same day), it resets the timer.
 */
export async function startTaskTimer(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch the task to get workspace_id and project_id
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('workspace_id, project_id')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { success: false, error: 'Task not found' };
  }

  // Check if there's already an active (not ended) log for this task+user
  const { data: existing } = await supabase
    .from('task_time_logs')
    .select('id')
    .eq('task_id', taskId)
    .eq('profile_id', user.id)
    .is('ended_at', null)
    .maybeSingle();

  if (existing) {
    // Timer already running — return success without creating duplicate
    return { success: true, data: { already_running: true } };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('task_time_logs')
    .insert({
      workspace_id: task.workspace_id,
      profile_id: user.id,
      task_id: taskId,
      project_id: task.project_id || null,
      started_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[startTaskTimer] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Stop the active timer for a task.
 * Sets ended_at = now. The DB computes duration_minutes automatically.
 * Returns the computed time_spent_minutes.
 */
export async function stopTaskTimer(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Find the active log
  const { data: activeLog, error: findError } = await supabase
    .from('task_time_logs')
    .select('id, started_at')
    .eq('task_id', taskId)
    .eq('profile_id', user.id)
    .is('ended_at', null)
    .maybeSingle();

  if (findError) {
    console.error('[stopTaskTimer] Error finding log:', findError);
    return { success: false, error: findError.message };
  }

  if (!activeLog) {
    return { success: false, error: 'No active timer found for this task' };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('task_time_logs')
    .update({ ended_at: now })
    .eq('id', activeLog.id)
    .select('id, started_at, ended_at, duration_minutes')
    .single();

  if (error) {
    console.error('[stopTaskTimer] Error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      ...data,
      time_spent_minutes: data.duration_minutes,
    },
  };
}

/**
 * Get the current user's most recent time log for a task.
 * Returns the active log if running, or the last completed one.
 */
export async function getTaskTimeLog(taskId: string): Promise<TaskTimeLog | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('task_time_logs')
    .select('*')
    .eq('task_id', taskId)
    .eq('profile_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getTaskTimeLog] Error:', error);
    return null;
  }

  return data as TaskTimeLog | null;
}

/**
 * Bulk fetch time logs for multiple tasks. Admin only.
 * Includes profile join for team view.
 */
export async function getTaskTimeLogs(taskIds: string[]): Promise<TaskTimeLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    console.warn('[getTaskTimeLogs] Non-admin attempted bulk time log access');
    return [];
  }

  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from('task_time_logs')
    .select(
      `
      *,
      profile:profiles!task_time_logs_profile_id_fkey (id, full_name, avatar_url)
    `
    )
    .in('task_id', taskIds)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[getTaskTimeLogs] Error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] || null : row.profile,
  })) as TaskTimeLog[];
}
