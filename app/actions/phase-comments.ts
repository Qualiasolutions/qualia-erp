'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import { isUserAdmin } from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
import { createActivityLogEntry } from './activity-feed';

interface CreatePhaseCommentInput {
  projectId: string;
  phaseName: string;
  commentText: string;
  isInternal?: boolean;
}

interface PhaseCommentWithProfile {
  id: string;
  project_id: string;
  phase_name: string;
  task_key: string | null;
  commented_by: string;
  comment_text: string;
  is_internal: boolean | null;
  created_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

/**
 * Create a new phase comment
 */
export async function createPhaseComment(
  data: CreatePhaseCommentInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { projectId, phaseName, commentText, isInternal } = data;

  // Validation
  if (!commentText || commentText.trim().length === 0) {
    return { success: false, error: 'Comment text is required' };
  }

  if (commentText.length > 2000) {
    return { success: false, error: 'Comment text must not exceed 2000 characters' };
  }

  if (!phaseName || phaseName.trim().length === 0) {
    return { success: false, error: 'Phase name is required' };
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If user is client (not admin or employee), force is_internal = false
  const isClient = profile?.role !== 'admin' && profile?.role !== 'employee';
  const finalIsInternal = isClient ? false : (isInternal ?? false);

  // Insert comment
  const { data: comment, error } = await supabase
    .from('phase_comments')
    .insert({
      project_id: projectId,
      phase_name: phaseName,
      commented_by: user.id,
      comment_text: commentText.trim(),
      is_internal: finalIsInternal,
    })
    .select()
    .single();

  if (error) {
    console.error('[createPhaseComment] Error:', error);
    return { success: false, error: error.message };
  }

  // Log activity (only if comment insert succeeds)
  await createActivityLogEntry({
    projectId,
    actionType: 'comment_added',
    actionData: {
      phase_name: phaseName,
      comment_preview: commentText.trim().substring(0, 100),
    },
    isClientVisible: !finalIsInternal,
  });

  // Revalidate portal and roadmap paths
  revalidatePath(`/portal/${projectId}`);
  revalidatePath(`/projects/${projectId}/roadmap`);
  revalidatePath(`/projects/${projectId}`);

  return { success: true, data: comment };
}

/**
 * Get all comments for a phase
 */
export async function getPhaseComments(
  projectId: string,
  phaseName: string,
  includeInternal = false
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Build query
  let query = supabase
    .from('phase_comments')
    .select(
      `
      id,
      project_id,
      phase_name,
      task_key,
      commented_by,
      comment_text,
      is_internal,
      created_at,
      profile:profiles!phase_comments_commented_by_fkey(id, full_name, avatar_url, email)
    `
    )
    .eq('project_id', projectId)
    .eq('phase_name', phaseName)
    .order('created_at', { ascending: true });

  // Filter by is_internal if not including internal comments
  if (!includeInternal) {
    query = query.or('is_internal.is.null,is_internal.eq.false');
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getPhaseComments] Error:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK response
  const normalized = (data || []).map((comment) => ({
    ...comment,
    profile: normalizeFKResponse(comment.profile),
  }));

  return { success: true, data: normalized };
}

/**
 * Delete a phase comment
 * Only admin or comment author can delete
 */
export async function deletePhaseComment(
  commentId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Get comment to check author
  const { data: comment } = await supabase
    .from('phase_comments')
    .select('commented_by')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { success: false, error: 'Comment not found' };
  }

  // Check permission: admin or author
  const isAdmin = await isUserAdmin(user.id);
  const isAuthor = comment.commented_by === user.id;

  if (!isAdmin && !isAuthor) {
    return { success: false, error: 'Not authorized to delete this comment' };
  }

  // Delete comment
  const { error } = await supabase.from('phase_comments').delete().eq('id', commentId);

  if (error) {
    console.error('[deletePhaseComment] Error:', error);
    return { success: false, error: error.message };
  }

  // Revalidate paths
  revalidatePath(`/portal/${projectId}`);
  revalidatePath(`/projects/${projectId}/roadmap`);
  revalidatePath(`/projects/${projectId}`);

  return { success: true };
}

/**
 * Get total comment count for a project
 */
export async function getProjectCommentsCount(
  projectId: string,
  clientVisibleOnly = false
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Build query
  let query = supabase
    .from('phase_comments')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  // Filter by visibility if needed
  if (clientVisibleOnly) {
    query = query.or('is_internal.is.null,is_internal.eq.false');
  }

  const { count, error } = await query;

  if (error) {
    console.error('[getProjectCommentsCount] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}
