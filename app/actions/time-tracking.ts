'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  type CreateTimeEntryInput,
  type UpdateTimeEntryInput,
} from '@/lib/validation';

// ============ TIME ENTRY CRUD ============

/**
 * Start a timer for the current user
 * Creates a time entry with is_running=true
 */
export async function startTimer(
  projectId?: string,
  taskId?: string,
  description?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const workspaceId = await getCurrentWorkspaceId();

    // Check if user already has a running timer
    const { data: existingTimer } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_running', true)
      .single();

    if (existingTimer) {
      return {
        success: false,
        error: 'You already have a running timer. Stop it before starting a new one.',
      };
    }

    const now = new Date();
    const entryDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        project_id: projectId || null,
        task_id: taskId || null,
        description: description || null,
        start_time: now.toISOString(),
        entry_date: entryDate,
        is_running: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/time-tracking');
    return { success: true, data: entry };
  } catch (error) {
    console.error('Error in startTimer:', error);
    return { success: false, error: 'Failed to start timer' };
  }
}

/**
 * Stop a running timer
 * Calculates duration and sets is_running=false
 */
export async function stopTimer(entryId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the entry to verify ownership and calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .eq('is_running', true)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Timer not found or already stopped' };
    }

    const endTime = new Date();
    const startTime = new Date(entry.start_time);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        is_running: false,
        updated_at: endTime.toISOString(),
      })
      .eq('id', entryId);

    if (updateError) {
      console.error('Error stopping timer:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/time-tracking');
    return { success: true, data: { duration_seconds: durationSeconds } };
  } catch (error) {
    console.error('Error in stopTimer:', error);
    return { success: false, error: 'Failed to stop timer' };
  }
}

/**
 * Create a manual time entry (not from timer)
 */
export async function createTimeEntry(input: CreateTimeEntryInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    const validation = createTimeEntrySchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' };
    }

    const data = validation.data;
    const workspaceId = await getCurrentWorkspaceId();

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: data.user_id || user.id,
        workspace_id: workspaceId,
        project_id: data.project_id || null,
        task_id: data.task_id || null,
        description: data.description || null,
        start_time: data.start_time,
        end_time: data.end_time || null,
        duration_seconds: data.duration_seconds || null,
        entry_date: data.entry_date,
        is_running: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/time-tracking');
    return { success: true, data: entry };
  } catch (error) {
    console.error('Error in createTimeEntry:', error);
    return { success: false, error: 'Failed to create time entry' };
  }
}

/**
 * Update an existing time entry
 */
export async function updateTimeEntry(input: UpdateTimeEntryInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    const validation = updateTimeEntrySchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' };
    }

    const { id, ...updates } = validation.data;

    // Verify ownership (only admins can update others' entries)
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      const { data: entry } = await supabase
        .from('time_entries')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!entry || entry.user_id !== user.id) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating time entry:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/time-tracking');
    return { success: true };
  } catch (error) {
    console.error('Error in updateTimeEntry:', error);
    return { success: false, error: 'Failed to update time entry' };
  }
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership (only admins can delete others' entries)
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      const { data: entry } = await supabase
        .from('time_entries')
        .select('user_id')
        .eq('id', entryId)
        .single();

      if (!entry || entry.user_id !== user.id) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const { error } = await supabase.from('time_entries').delete().eq('id', entryId);

    if (error) {
      console.error('Error deleting time entry:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/time-tracking');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTimeEntry:', error);
    return { success: false, error: 'Failed to delete time entry' };
  }
}

// ============ QUERY ACTIONS ============

/**
 * Get time entries for a specific date
 * Admin sees all entries, users see only their own
 */
export async function getDailyTimeEntries(date: string, userId?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const isAdmin = await isUserAdmin(user.id);
    const targetUserId = userId || user.id;

    // Non-admins can only see their own entries
    if (!isAdmin && targetUserId !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('time_entries')
      .select(
        `
        *,
        project:projects(id, name),
        task:tasks(id, title),
        user:profiles(id, full_name, email)
      `
      )
      .eq('entry_date', date)
      .order('start_time', { ascending: false });

    // Filter by user if not admin viewing all
    if (!isAdmin || userId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily time entries:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getDailyTimeEntries:', error);
    return { success: false, error: 'Failed to fetch time entries' };
  }
}

/**
 * Get weekly summary of time entries
 */
export async function getWeeklySummary(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const isAdmin = await isUserAdmin(user.id);
    const targetUserId = userId || user.id;

    // Non-admins can only see their own entries
    if (!isAdmin && targetUserId !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('time_entries')
      .select(
        `
        *,
        project:projects(id, name),
        user:profiles(id, full_name, email)
      `
      )
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .eq('is_running', false); // Only completed entries

    if (!isAdmin || userId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weekly summary:', error);
      return { success: false, error: error.message };
    }

    // Aggregate data by project and date
    const summary = {
      totalSeconds: 0,
      byProject: {} as Record<string, { name: string; seconds: number }>,
      byDate: {} as Record<string, number>,
      entries: data || [],
    };

    data?.forEach((entry) => {
      const seconds = entry.duration_seconds || 0;
      summary.totalSeconds += seconds;

      // By date
      if (!summary.byDate[entry.entry_date]) {
        summary.byDate[entry.entry_date] = 0;
      }
      summary.byDate[entry.entry_date] += seconds;

      // By project
      if (entry.project_id) {
        const project = Array.isArray(entry.project) ? entry.project[0] : entry.project;
        const projectName = project?.name || 'Unknown Project';
        if (!summary.byProject[entry.project_id]) {
          summary.byProject[entry.project_id] = { name: projectName, seconds: 0 };
        }
        summary.byProject[entry.project_id].seconds += seconds;
      }
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error in getWeeklySummary:', error);
    return { success: false, error: 'Failed to fetch weekly summary' };
  }
}

/**
 * Get the current running timer for a user
 */
export async function getRunningTimer(userId?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const targetUserId = userId || user.id;

    // Users can only get their own running timer
    if (targetUserId !== user.id && !(await isUserAdmin(user.id))) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('time_entries')
      .select(
        `
        *,
        project:projects(id, name),
        task:tasks(id, title)
      `
      )
      .eq('user_id', targetUserId)
      .eq('is_running', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's OK
      console.error('Error fetching running timer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || null };
  } catch (error) {
    console.error('Error in getRunningTimer:', error);
    return { success: false, error: 'Failed to fetch running timer' };
  }
}
