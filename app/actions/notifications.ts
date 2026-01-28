'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './shared';

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
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    workspace_id: workspaceId,
    type,
    title,
    message: message || null,
    link: link || null,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(workspaceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_read', false);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
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

  const notifications = assigneeIds.map((userId) => ({
    user_id: userId,
    workspace_id: workspaceId,
    type: 'task_assigned' as NotificationType,
    title: 'Task assigned to you',
    message: `${assignedByName} assigned you to "${issueTitle}"`,
    link: `/issues/${issueId}`,
    metadata: { issue_id: issueId },
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
}
