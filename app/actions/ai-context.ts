'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateData } from '@/lib/validation';
import type { ActionResult } from './shared';

// ============ ZOD SCHEMAS ============

const userIdSchema = z.string().uuid('Invalid user ID');
const adminNoteSchema = z.object({
  targetUserId: z.string().uuid('Invalid target user ID'),
  note: z.string().min(1, 'Note cannot be empty').max(5000, 'Note too long'),
});

export type AdminNote = {
  content: string;
  from_name: string;
  created_at: string;
  delivered: boolean;
};

export type AIUserContext = {
  id: string;
  user_id: string;
  workspace_id: string;
  admin_notes: AdminNote[];
  recent_summaries: string[];
  updated_at: string;
};

/**
 * Get AI context for a specific user (admin) or current user
 */
export async function getUserAIContext(targetUserId?: string): Promise<AIUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const userId = targetUserId || user.id;

  // If fetching another user's context, verify admin role
  if (targetUserId && targetUserId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') return null;
  }

  const { data } = await supabase
    .from('ai_user_context')
    .select('id, user_id, workspace_id, admin_notes, recent_summaries, updated_at')
    .eq('user_id', userId)
    .single();

  if (!data) return null;

  return {
    ...data,
    admin_notes: (data.admin_notes as AdminNote[]) || [],
    recent_summaries: (data.recent_summaries as string[]) || [],
  } as AIUserContext;
}

/**
 * Get or create AI context for a user (used internally by API route)
 */
export async function getOrCreateUserAIContext(
  userId: string,
  workspaceId: string
): Promise<AIUserContext | null> {
  const supabase = await createClient();

  // Try to fetch existing
  const { data: existing } = await supabase
    .from('ai_user_context')
    .select('id, user_id, workspace_id, admin_notes, recent_summaries, updated_at')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (existing) {
    return {
      ...existing,
      admin_notes: (existing.admin_notes as AdminNote[]) || [],
      recent_summaries: (existing.recent_summaries as string[]) || [],
    } as AIUserContext;
  }

  // Create new context
  const { data: created } = await supabase
    .from('ai_user_context')
    .insert({ user_id: userId, workspace_id: workspaceId })
    .select()
    .single();

  if (!created) return null;

  return {
    ...created,
    admin_notes: [],
    recent_summaries: [],
  } as AIUserContext;
}

/**
 * Admin: Add a note for a user
 */
export async function setAdminNote(targetUserId: string, note: string): Promise<ActionResult> {
  const parsed = validateData(adminNoteSchema, { targetUserId, note });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required' };

  // Get workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  if (!membership) return { success: false, error: 'No workspace found' };

  // Get or create context
  const context = await getOrCreateUserAIContext(parsed.data.targetUserId, membership.workspace_id);
  if (!context) return { success: false, error: 'Failed to get user context' };

  const newNote: AdminNote = {
    content: parsed.data.note.trim(),
    from_name: profile.full_name || 'Admin',
    created_at: new Date().toISOString(),
    delivered: false,
  };

  const updatedNotes = [...context.admin_notes, newNote];

  const { data: updated, error } = await supabase
    .from('ai_user_context')
    .update({
      admin_notes: updatedNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!updated) return { success: false, error: 'Context update blocked by RLS' };

  return { success: true, data: newNote };
}

/**
 * Admin: Clear all notes for a user
 */
export async function clearAdminNotes(targetUserId: string): Promise<ActionResult> {
  const parsed = validateData(userIdSchema, targetUserId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required' };

  const { data: updated, error } = await supabase
    .from('ai_user_context')
    .update({
      admin_notes: [],
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', parsed.data)
    .select();

  if (error) return { success: false, error: error.message };
  // 0 updated rows could mean the user has no context row — not necessarily an error.

  return { success: true };
}

/**
 * Mark specific admin notes as delivered
 */
export async function markNotesDelivered(
  userId: string,
  workspaceId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: context } = await supabase
    .from('ai_user_context')
    .select('id, admin_notes')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!context) return { success: false, error: 'No context found' };

  const notes = (context.admin_notes as AdminNote[]) || [];
  const updated = notes.map((n) => ({ ...n, delivered: true }));

  const { data: result, error } = await supabase
    .from('ai_user_context')
    .update({
      admin_notes: updated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!result) return { success: false, error: 'Context update blocked by RLS' };

  return { success: true };
}

/**
 * Update conversation summaries (keep last 3)
 */
export async function updateConversationSummaries(
  userId: string,
  workspaceId: string,
  newSummary: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const context = await getOrCreateUserAIContext(userId, workspaceId);
  if (!context) return { success: false, error: 'Failed to get context' };

  const summaries = [...context.recent_summaries, newSummary].slice(-3);

  const { data: result, error } = await supabase
    .from('ai_user_context')
    .update({
      recent_summaries: summaries,
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!result) return { success: false, error: 'Context update blocked by RLS' };

  return { success: true };
}
