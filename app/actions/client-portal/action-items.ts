'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from '../shared';

/**
 * Get pending action items for a client (incomplete only, ordered by due date).
 * Accessible by the client themselves or any admin/manager.
 */
export async function getClientActionItems(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Auth check: must be the client or an admin/manager
    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('client_action_items')
      .select(
        `id, title, description, action_type, due_date, completed_at,
         project:projects(id, name)`
      )
      .eq('client_id', clientId)
      .is('completed_at', null)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Normalize project FK arrays
    const items = (data || []).map((item) => ({
      ...item,
      project: Array.isArray(item.project) ? item.project[0] || null : item.project,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('[getClientActionItems] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get action items',
    };
  }
}

/**
 * Create a new action item for a client. Admin/manager only.
 */
export async function createClientActionItem(data: {
  projectId: string;
  clientId: string;
  title: string;
  description?: string;
  actionType: string;
  dueDate?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can create action items' };
    }

    // Validate inputs
    const { z } = await import('zod');
    const schema = z.object({
      projectId: z.string().uuid(),
      clientId: z.string().uuid(),
      title: z.string().min(2, 'Title must be at least 2 characters'),
      description: z.string().optional(),
      actionType: z.enum(['approval', 'upload', 'feedback', 'payment', 'general']),
      dueDate: z.string().optional(),
    });

    const validated = schema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || 'Invalid data' };
    }

    const { projectId, clientId, title, description, actionType, dueDate } = validated.data;

    const { data: inserted, error } = await supabase
      .from('client_action_items')
      .insert({
        project_id: projectId,
        client_id: clientId,
        title,
        description: description || null,
        action_type: actionType,
        due_date: dueDate || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify client of new action item (fire-and-forget)
    import('@/lib/email').then(({ notifyClientOfActionItem }) => {
      notifyClientOfActionItem(clientId, projectId, {
        title,
        actionType,
        dueDate: dueDate || null,
      }).catch((err) => console.error('[createClientActionItem] Notification error:', err));
    });

    return { success: true, data: inserted };
  } catch (error) {
    console.error('[createClientActionItem] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create action item',
    };
  }
}

/**
 * Mark an action item as complete. Admin/manager only — clients cannot self-complete.
 */
export async function completeClientActionItem(itemId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Only admins and managers can complete action items' };
    }

    // Get item details before updating (for notification)
    const { data: existing } = await supabase
      .from('client_action_items')
      .select('title, client_id, project_id')
      .eq('id', itemId)
      .single();

    const { data: updated, error } = await supabase
      .from('client_action_items')
      .update({
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    // Notify client of completion (fire-and-forget)
    if (existing) {
      import('@/lib/email').then(({ notifyClientOfActionItemCompleted }) => {
        notifyClientOfActionItemCompleted(
          existing.client_id,
          existing.project_id,
          existing.title
        ).catch((err) => console.error('[completeClientActionItem] Notification error:', err));
      });
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('[completeClientActionItem] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete action item',
    };
  }
}
