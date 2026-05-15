'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validateData } from '@/lib/validation';

import type { ActionResult } from './shared';

// ============ ZOD SCHEMAS ============

const createNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  type: z.enum([
    'task_assigned',
    'task_completed',
    'task_updated',
    'comment_added',
    'mention',
    'system',
  ] as const),
  title: z.string().min(1, 'Title is required').max(500),
  message: z.string().max(5000).optional(),
  link: z.string().max(1000).optional(),
});

const notificationIdSchema = z.string().uuid('Invalid notification ID');
const workspaceIdSchema = z.string().uuid('Invalid workspace ID');

// ============ NOTIFICATION TYPES ============

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'comment_added'
  | 'mention'
  | 'system';

// ============ NOTIFICATION ACTIONS ============

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  workspaceId: string,
  type: NotificationType,
  title: string,
  message?: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult> {
  const parsed = validateData(createNotificationSchema, {
    userId,
    workspaceId,
    type,
    title,
    message,
    link,
  });
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();

  // Auth check — only authenticated users can create notifications
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('notifications').insert({
    user_id: parsed.data.userId,
    workspace_id: parsed.data.workspaceId,
    type: parsed.data.type,
    title: parsed.data.title,
    message: parsed.data.message || null,
    link: parsed.data.link || null,
    metadata: metadata || {},
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(workspaceId: string, limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, title, message, is_read, read_at, created_at, workspace_id, user_id, link, metadata'
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting notifications:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<ActionResult> {
  const parsed = validateData(notificationIdSchema, notificationId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: updated, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
  if (!updated) {
    return { success: false, error: 'Notification not found or access denied' };
  }

  return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(workspaceId: string): Promise<ActionResult> {
  const parsed = validateData(workspaceIdSchema, workspaceId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Multi-row update — .select() to detect silent RLS (0 rows is OK if none unread)
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('workspace_id', parsed.data)
    .eq('user_id', user.id)
    .eq('is_read', false)
    .select();

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<ActionResult> {
  const parsed = validateData(notificationIdSchema, notificationId);
  if (!parsed.success) return { success: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: deleted, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', parsed.data)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
  }
  if (!deleted) {
    return { success: false, error: 'Notification not found or access denied' };
  }

  return { success: true };
}

/**
 * Notify assignees when a task is assigned
 */
export async function notifyTaskAssigned(
  issueId: string,
  issueTitle: string,
  assigneeIds: string[],
  workspaceId: string,
  assignedByName: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const notifications = assigneeIds.map((userId) => ({
    user_id: userId,
    workspace_id: workspaceId,
    type: 'task_assigned' as NotificationType,
    title: 'Task assigned to you',
    message: `${assignedByName} assigned you to "${issueTitle}"`,
    link: `/tasks`,
    metadata: { issue_id: issueId },
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
}
