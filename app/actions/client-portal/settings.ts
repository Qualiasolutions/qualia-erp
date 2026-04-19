'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult } from '../shared';
import { getCurrentWorkspaceId } from '../workspace';
import { ClientProfileUpdateSchema } from '@/lib/validation';

/**
 * Update client profile (name, company)
 */
export async function updateClientProfile(updates: {
  full_name?: string;
  company?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const parsed = ClientProfileUpdateSchema.safeParse(updates);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
    }
    const safeUpdates = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (safeUpdates.full_name !== undefined) updateData.full_name = safeUpdates.full_name.trim();
    if (safeUpdates.company !== undefined) updateData.company = safeUpdates.company?.trim() || null;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[updateClientProfile] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      // Clients don't have workspaces — return default preferences instead of error
      return {
        success: true,
        data: {
          task_assigned: true,
          task_due_soon: true,
          project_update: true,
          meeting_reminder: true,
          client_activity: true,
        },
      };
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
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
          delivery_method: 'both',
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
 */
export async function updateNotificationPreferences(preferences: {
  task_assigned?: boolean;
  task_due_soon?: boolean;
  project_update?: boolean;
  meeting_reminder?: boolean;
  client_activity?: boolean;
  delivery_method?: 'email' | 'in_app' | 'both';
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    let workspaceId = await getCurrentWorkspaceId();

    // Fallback: find any workspace the user belongs to (handles client users)
    if (!workspaceId) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();
      workspaceId = membership?.workspace_id ?? null;
    }

    if (!workspaceId) return { success: false, error: 'No workspace found' };

    // Upsert preferences (create if doesn't exist, update if it does)
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          workspace_id: workspaceId,
          ...preferences,
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
