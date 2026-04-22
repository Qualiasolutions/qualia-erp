'use server';

import { createClient } from '@/lib/supabase/server';
import { notificationPreferencesSchema, type NotificationPreferencesInput } from '@/lib/validation';
import { ActionResult } from './shared';

/**
 * Get notification preferences for the current user
 * Returns defaults if no preferences exist yet
 */
export async function getNotificationPreferences(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Get user's current workspace
    const { data: workspaceData } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .limit(1)
      .single();

    const workspaceId = workspaceData?.workspace_id;
    if (!workspaceId) return { success: false, error: 'No workspace found' };

    const { data, error } = await supabase
      .from('notification_preferences')
      .select(
        'id, user_id, workspace_id, task_assigned, task_due_soon, project_update, meeting_reminder, client_activity, delivery_method'
      )
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no preferences exist, return defaults
    if (!data) {
      return {
        success: true,
        data: {
          task_assigned: true,
          task_due_soon: true,
          project_update: true,
          meeting_reminder: true,
          client_activity: true,
          delivery_method: 'both' as const,
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getNotificationPreferences] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification preferences',
    };
  }
}

/**
 * Update notification preferences for the current user
 * Creates preferences if they don't exist (upsert)
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferencesInput
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = notificationPreferencesSchema.parse(preferences);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Get user's current workspace
    const { data: workspaceData } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .limit(1)
      .single();

    const workspaceId = workspaceData?.workspace_id;
    if (!workspaceId) return { success: false, error: 'No workspace found' };

    // Upsert preferences (create if doesn't exist, update if it does)
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          ...validated,
        },
        {
          onConflict: 'user_id,workspace_id',
        }
      )
      .select()
      .single();

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[updateNotificationPreferences] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update notification preferences',
    };
  }
}

/**
 * Create default notification preferences for a new user
 * Called during user registration or first workspace join
 */
export async function createDefaultPreferences(
  userId: string,
  workspaceId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check if preferences already exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (existing) {
      return { success: true, data: { message: 'Preferences already exist' } };
    }

    // Create default preferences
    const { error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        task_assigned: true,
        task_due_soon: true,
        project_update: true,
        meeting_reminder: true,
        client_activity: true,
        delivery_method: 'both',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: { message: 'Default preferences created' } };
  } catch (error) {
    console.error('[createDefaultPreferences] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create default preferences',
    };
  }
}

/**
 * Helper to check if email notifications should be sent for a user
 * Used by notification system to determine delivery method
 */
export async function shouldSendEmail(
  userId: string,
  workspaceId: string,
  notificationType:
    | 'task_assigned'
    | 'task_due_soon'
    | 'project_update'
    | 'meeting_reminder'
    | 'client_activity'
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Item 16: Select only the specific notification column + delivery_method
    // Whitelist check prevents SQL injection via dynamic column name
    const allowedColumns = [
      'task_assigned',
      'task_due_soon',
      'project_update',
      'meeting_reminder',
      'client_activity',
    ] as const;
    if (!allowedColumns.includes(notificationType)) {
      return true; // Unknown type — default to sending
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select(`${notificationType}, delivery_method`)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[shouldSendEmail] Error:', error);
      return true; // Default to sending emails on error
    }

    // If no preferences exist, default to sending
    if (!data) return true;

    // Check if notification type is enabled
    // Cast needed: Supabase generates a union type from the dynamic column select
    const typeEnabled = (data as Record<string, unknown>)[notificationType] as boolean;
    if (!typeEnabled) return false;

    // Check delivery method
    const deliveryMethod = (data as Record<string, unknown>).delivery_method as
      | 'email'
      | 'in_app'
      | 'both';
    return deliveryMethod === 'email' || deliveryMethod === 'both';
  } catch (error) {
    console.error('[shouldSendEmail] Error:', error);
    return true; // Default to sending on error
  }
}
