'use server';

import { createClient } from '@/lib/supabase/server';

// =====================================================
// Types
// =====================================================

export type MemoryCategory = 'preference' | 'skill' | 'project' | 'fact' | 'habit';
export type MemorySource = 'conversation' | 'observation' | 'admin';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  source: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  content: string;
  due_at: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
}

export interface TraineeProgressEntry {
  id: string;
  project_id: string | null;
  project_name?: string;
  phase_name: string;
  status: string;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface MemoryContext {
  memories: UserMemory[];
  reminders: Reminder[];
  traineeProgress: TraineeProgressEntry[];
  skillLevel: SkillLevel;
  interactionCount: number;
}

// =====================================================
// Memory Loading
// =====================================================

/**
 * Load all user memories grouped by category
 * Returns max 30 memories sorted by confidence and recency
 */
export async function loadUserMemory(userId: string, workspaceId: string): Promise<UserMemory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_user_memory')
    .select('id, category, content, confidence, source, created_at')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('confidence', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[Memory] Failed to load memories:', error.message);
    return [];
  }

  return (data || []) as UserMemory[];
}

/**
 * Store a memory fact about a user
 * Uses upsert to avoid duplicates (unique on user_id, workspace_id, category, content)
 */
export async function storeMemory(
  userId: string,
  workspaceId: string,
  category: MemoryCategory,
  content: string,
  source: MemorySource = 'conversation',
  confidence: number = 0.8,
  expiresAt?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('ai_user_memory').upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      category,
      content: content.trim(),
      confidence,
      source,
      expires_at: expiresAt || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,workspace_id,category,content' }
  );

  if (error) {
    console.error('[Memory] Failed to store memory:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(
  memoryId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_user_memory')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// Reminders
// =====================================================

/**
 * Load pending reminders for a user (due now or overdue)
 */
export async function loadPendingReminders(
  userId: string,
  workspaceId: string
): Promise<Reminder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_reminders')
    .select('id, content, due_at, is_recurring, recurrence_rule')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('is_delivered', false)
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[Memory] Failed to load reminders:', error.message);
    return [];
  }

  return (data || []) as Reminder[];
}

/**
 * Create a new reminder
 */
export async function createReminder(
  userId: string,
  workspaceId: string,
  content: string,
  dueAt: string,
  isRecurring: boolean = false,
  recurrenceRule?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_reminders')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      content: content.trim(),
      due_at: dueAt,
      is_recurring: isRecurring,
      recurrence_rule: recurrenceRule || null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

/**
 * Mark a reminder as delivered
 * For recurring reminders, create the next occurrence instead of marking delivered
 */
export async function markReminderDelivered(reminderId: string): Promise<void> {
  const supabase = await createClient();

  // Get the reminder first to check if recurring
  const { data: reminder } = await supabase
    .from('ai_reminders')
    .select('user_id, workspace_id, content, due_at, is_recurring, recurrence_rule')
    .eq('id', reminderId)
    .single();

  if (!reminder) return;

  // Mark current as delivered
  await supabase.from('ai_reminders').update({ is_delivered: true }).eq('id', reminderId);

  // If recurring, create next occurrence
  if (reminder.is_recurring && reminder.recurrence_rule) {
    const nextDue = calculateNextOccurrence(new Date(reminder.due_at), reminder.recurrence_rule);

    if (nextDue) {
      await supabase.from('ai_reminders').insert({
        user_id: reminder.user_id,
        workspace_id: reminder.workspace_id,
        content: reminder.content,
        due_at: nextDue.toISOString(),
        is_recurring: true,
        recurrence_rule: reminder.recurrence_rule,
      });
    }
  }
}

/**
 * Calculate the next occurrence of a recurring reminder
 */
function calculateNextOccurrence(currentDue: Date, rule: string): Date | null {
  const next = new Date(currentDue);

  switch (rule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekdays': {
      next.setDate(next.getDate() + 1);
      // Skip weekends
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }

  return next;
}

// =====================================================
// Trainee Progress
// =====================================================

/**
 * Load trainee progress for a specific user
 */
export async function loadTraineeProgress(
  userId: string,
  workspaceId: string,
  projectId?: string
): Promise<TraineeProgressEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('trainee_progress')
    .select(
      'id, project_id, phase_name, status, notes, started_at, completed_at, project:projects(name)'
    )
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Memory] Failed to load trainee progress:', error.message);
    return [];
  }

  return (data || []).map((entry) => ({
    id: entry.id,
    project_id: entry.project_id,
    project_name: Array.isArray(entry.project)
      ? entry.project[0]?.name
      : (entry.project as { name: string } | null)?.name,
    phase_name: entry.phase_name,
    status: entry.status,
    notes: entry.notes,
    started_at: entry.started_at,
    completed_at: entry.completed_at,
  })) as TraineeProgressEntry[];
}

// =====================================================
// Skill Detection
// =====================================================

/**
 * Detect skill level from profile, context signals, and interaction count
 */
export async function detectSkillLevel(userId: string, workspaceId: string): Promise<SkillLevel> {
  const supabase = await createClient();

  // 1. Check explicit profile setting
  const { data: profile } = await supabase
    .from('profiles')
    .select('skill_level, projects_completed')
    .eq('id', userId)
    .single();

  if (profile?.skill_level && profile.skill_level !== 'beginner') {
    return profile.skill_level as SkillLevel;
  }

  // 2. Check interaction count and skill signals
  const { data: context } = await supabase
    .from('ai_user_context')
    .select('interaction_count, skill_signals')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  const interactionCount = context?.interaction_count || 0;
  const projectsCompleted = profile?.projects_completed || 0;

  // Heuristic: more interactions + completed projects = higher skill
  if (projectsCompleted >= 3 || interactionCount > 200) {
    return 'advanced';
  }
  if (projectsCompleted >= 1 || interactionCount > 50) {
    return 'intermediate';
  }

  return 'beginner';
}

// =====================================================
// Interaction Tracking
// =====================================================

/**
 * Increment the interaction count for a user
 */
export async function updateInteractionCount(userId: string, workspaceId: string): Promise<void> {
  const supabase = await createClient();

  // Try to increment existing
  const { data: existing } = await supabase
    .from('ai_user_context')
    .select('interaction_count')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (existing) {
    await supabase
      .from('ai_user_context')
      .update({
        interaction_count: (existing.interaction_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);
  }
  // If no context exists, it will be created by getOrCreateUserAIContext
}

// =====================================================
// Full Memory Context Loader
// =====================================================

/**
 * Load complete memory context for a user (used at conversation start)
 */
export async function loadFullMemoryContext(
  userId: string,
  workspaceId: string
): Promise<MemoryContext> {
  const [memories, reminders, traineeProgress, skillLevel, interactionData] = await Promise.all([
    loadUserMemory(userId, workspaceId),
    loadPendingReminders(userId, workspaceId),
    loadTraineeProgress(userId, workspaceId),
    detectSkillLevel(userId, workspaceId),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('ai_user_context')
        .select('interaction_count')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .single();
      return data?.interaction_count || 0;
    })(),
  ]);

  return {
    memories,
    reminders,
    traineeProgress,
    skillLevel,
    interactionCount: interactionData,
  };
}
