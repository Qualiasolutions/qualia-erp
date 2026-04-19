'use server';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';
import { isUserManagerOrAbove } from './shared';
import { normalizeFKResponse } from '@/lib/server-utils';
import { uuidParam, requestCommentSchema } from '@/lib/validation';
import { notifyEmployeesOfClientComment } from '@/lib/email';

/**
 * Get all comments for a feature request
 */
export async function getRequestComments(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate requestId
  const idResult = uuidParam.safeParse(requestId);
  if (!idResult.success) {
    return { success: false, error: 'Invalid request ID' };
  }

  // Verify user can access this request:
  // Staff can see any, clients can only see their own requests
  const isStaff = await isUserManagerOrAbove(user.id);
  if (!isStaff) {
    const { data: request } = await supabase
      .from('client_feature_requests')
      .select('client_id')
      .eq('id', requestId)
      .single();

    if (!request || request.client_id !== user.id) {
      return { success: false, error: 'Request not found or access denied' };
    }
  }

  const { data, error } = await supabase
    .from('request_comments')
    .select(
      `
      id,
      request_id,
      author_id,
      content,
      created_at,
      author:profiles!request_comments_author_id_fkey(id, full_name, avatar_url, email, role)
    `
    )
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getRequestComments] Error:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK arrays on author field
  const normalized = (data || []).map((comment) => ({
    ...comment,
    author: normalizeFKResponse(comment.author),
  }));

  return { success: true, data: normalized };
}

/**
 * Create a new comment on a feature request
 */
export async function createRequestComment(
  requestId: string,
  content: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate input
  const parsed = requestCommentSchema.safeParse({ requestId, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'employee';

  // Verify user can access this request
  if (!isStaff) {
    // Client: check that the request belongs to them
    const { data: request } = await supabase
      .from('client_feature_requests')
      .select('client_id')
      .eq('id', requestId)
      .single();

    if (!request || request.client_id !== user.id) {
      return { success: false, error: 'Request not found or access denied' };
    }
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from('request_comments')
    .insert({
      request_id: requestId,
      author_id: user.id,
      content: content.trim(),
    })
    .select(
      `
      id,
      request_id,
      author_id,
      content,
      created_at,
      author:profiles!request_comments_author_id_fkey(id, full_name, avatar_url, email, role)
    `
    )
    .single();

  if (error) {
    console.error('[createRequestComment] Error:', error);
    return { success: false, error: error.message };
  }

  // Normalize FK
  const normalized = {
    ...comment,
    author: normalizeFKResponse(comment.author),
  };

  // Notify assigned employees when a client posts a comment
  if (profile?.role === 'client') {
    const { data: request } = await supabase
      .from('client_feature_requests')
      .select('project_id, title')
      .eq('id', requestId)
      .single();

    if (request?.project_id) {
      const authorName = normalized.author?.full_name || 'A client';
      notifyEmployeesOfClientComment(request.project_id, authorName, content.trim()).catch((err) =>
        console.error('[request-comment notify]', err)
      );
    }
  }

  return { success: true, data: normalized };
}

/**
 * Delete a comment on a feature request
 * Admin/manager can delete any; others only their own
 */
export async function deleteRequestComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Validate
  const idResult = uuidParam.safeParse(commentId);
  if (!idResult.success) {
    return { success: false, error: 'Invalid comment ID' };
  }

  // Fetch comment to verify ownership
  const { data: comment } = await supabase
    .from('request_comments')
    .select('author_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { success: false, error: 'Comment not found' };
  }

  // Check permission: admin/manager can delete any; others only their own
  const isStaff = await isUserManagerOrAbove(user.id);
  const isAuthor = comment.author_id === user.id;

  if (!isStaff && !isAuthor) {
    return { success: false, error: 'Not authorized to delete this comment' };
  }

  const { error } = await supabase.from('request_comments').delete().eq('id', commentId);

  if (error) {
    console.error('[deleteRequestComment] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get comment count for a feature request
 */
export async function getRequestCommentCount(requestId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('request_comments')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', requestId);

    if (error) {
      console.error('[getRequestCommentCount] Error:', error);
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get comment counts for multiple requests in one query (avoids N+1)
 */
export async function getRequestCommentCounts(
  requestIds: string[]
): Promise<Record<string, number>> {
  try {
    if (requestIds.length === 0) return {};

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('request_comments')
      .select('request_id')
      .in('request_id', requestIds);

    if (error) {
      console.error('[getRequestCommentCounts] Error:', error);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.request_id] = (counts[row.request_id] || 0) + 1;
    }

    return counts;
  } catch {
    return {};
  }
}
