'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';
import { isUserAdmin } from './shared';
import { isStaffOnProject } from '@/lib/auth/is-staff-on-project';
import { normalizeFKResponse } from '@/lib/server-utils';
import { uuidParam, requestCommentSchema } from '@/lib/validation';
import {
  notifyEmployeesOfClientComment,
  notifyAdminAndAssignedOfClientActivity,
} from '@/lib/email';

interface RequestCommentAccess {
  request: {
    client_id: string;
    project_id: string | null;
    title: string | null;
  };
  profileRole: string | null;
}

async function assertRequestCommentAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
  userId: string
): Promise<{ ok: true; data: RequestCommentAccess } | { ok: false; error: string }> {
  const readClient = createAdminClient();

  const { data: request } = await readClient
    .from('client_feature_requests')
    .select('client_id, project_id, title')
    .eq('id', requestId)
    .single();

  if (!request) return { ok: false, error: 'Request not found or access denied' };

  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    return { ok: true, data: { request, profileRole: 'admin' } };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'employee') {
    const allowed = request.project_id ? await isStaffOnProject(userId, request.project_id) : false;
    if (!allowed) return { ok: false, error: 'Request not found or access denied' };
    return { ok: true, data: { request, profileRole: profile.role } };
  }

  if (request.client_id !== userId) {
    return { ok: false, error: 'Request not found or access denied' };
  }

  return { ok: true, data: { request, profileRole: profile?.role ?? null } };
}

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

  const access = await assertRequestCommentAccess(supabase, requestId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const readClient = createAdminClient();
  const { data, error } = await readClient
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

  const access = await assertRequestCommentAccess(supabase, requestId, user.id);
  if (!access.ok) return { success: false, error: access.error };
  const { request, profileRole } = access.data;

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

  // Notify admin + assigned employees when a client posts a comment
  if (profileRole === 'client' && request.project_id) {
    const authorName = normalized.author?.full_name || 'A client';
    notifyEmployeesOfClientComment(request.project_id, authorName, content.trim()).catch((err) =>
      console.error('[request-comment notify employees]', err)
    );
    notifyAdminAndAssignedOfClientActivity({
      projectId: request.project_id,
      clientName: authorName,
      activityType: 'commented on request',
      activityDetails: `"${request.title}" — ${content.trim()}`,
      includeAdmin: true,
      includeAssigned: false, // employees already notified above by notifyEmployeesOfClientComment
    }).catch((err) => console.error('[request-comment notify admin]', err));
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

  // Check permission: admin can delete any; others only their own
  const isAdmin = await isUserAdmin(user.id);
  const isAuthor = comment.author_id === user.id;

  if (!isAdmin && !isAuthor) {
    return { success: false, error: 'Not authorized to delete this comment' };
  }

  const { data, error } = await supabase
    .from('request_comments')
    .delete()
    .eq('id', commentId)
    .select('id')
    .single();

  if (error) {
    console.error('[deleteRequestComment] Error:', error);
    return { success: false, error: error.message };
  }
  if (!data) return { success: false, error: 'Not found or permission denied' };

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
