'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

// ============ TYPES ============

export type UpdatePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface OwnerUpdate {
  id: string;
  workspace_id: string;
  author_id: string;
  title: string;
  body: string;
  priority: UpdatePriority;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  // Enriched from left join on owner_update_reads
  is_read?: boolean;
  read_at?: string | null;
}

// ============ ACTIONS ============

/**
 * Create a new owner update. Admin only.
 */
export async function createOwnerUpdate(
  workspaceId: string,
  title: string,
  body: string,
  options: {
    priority?: UpdatePriority;
    pinned?: boolean;
    targetUserId?: string; // reserved for future targeted updates — not yet used at DB level
  } = {}
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can create owner updates' };
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle) {
    return { success: false, error: 'Title is required' };
  }
  if (!trimmedBody) {
    return { success: false, error: 'Body is required' };
  }

  const { data, error } = await supabase
    .from('owner_updates')
    .insert({
      workspace_id: workspaceId,
      author_id: user.id,
      title: trimmedTitle,
      body: trimmedBody,
      priority: options.priority || 'normal',
      pinned: options.pinned ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('[createOwnerUpdate] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

/**
 * Get owner updates for the current user's workspace.
 * Left joins owner_update_reads to attach read status for the current user.
 */
export async function getOwnerUpdates(
  workspaceId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
  } = {}
): Promise<OwnerUpdate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch updates with author info
  let query = supabase
    .from('owner_updates')
    .select(
      `
      *,
      author:profiles!owner_updates_author_id_fkey (id, full_name, avatar_url),
      reads:owner_update_reads!owner_update_reads_update_id_fkey (profile_id, read_at)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getOwnerUpdates] Error:', error);
    return [];
  }

  const updates = (data || []).map((row) => {
    const author = Array.isArray(row.author) ? row.author[0] || null : row.author;
    const reads = Array.isArray(row.reads) ? row.reads : row.reads ? [row.reads] : [];
    const myRead = reads.find(
      (r: { profile_id: string; read_at: string }) => r.profile_id === user.id
    );

    return {
      ...row,
      author,
      reads: undefined, // strip raw reads from response
      is_read: !!myRead,
      read_at: myRead?.read_at || null,
    } as OwnerUpdate;
  });

  if (options.unreadOnly) {
    return updates.filter((u) => !u.is_read);
  }

  return updates;
}

/**
 * Mark an owner update as read for the current user.
 * Upserts into owner_update_reads — idempotent.
 */
export async function acknowledgeOwnerUpdate(updateId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase.from('owner_update_reads').upsert(
    {
      update_id: updateId,
      profile_id: user.id,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'update_id,profile_id' }
  );

  if (error) {
    console.error('[acknowledgeOwnerUpdate] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update an owner update (title, body, priority, pinned). Admin only.
 */
export async function updateOwnerUpdate(
  updateId: string,
  patch: {
    title?: string;
    body?: string;
    priority?: UpdatePriority;
    pinned?: boolean;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can edit owner updates' };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.title !== undefined) updateData.title = patch.title.trim();
  if (patch.body !== undefined) updateData.body = patch.body.trim();
  if (patch.priority !== undefined) updateData.priority = patch.priority;
  if (patch.pinned !== undefined) updateData.pinned = patch.pinned;

  const { error } = await supabase.from('owner_updates').update(updateData).eq('id', updateId);

  if (error) {
    console.error('[updateOwnerUpdate] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Delete an owner update. Admin only.
 */
export async function deleteOwnerUpdate(updateId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return { success: false, error: 'Only admins can delete owner updates' };
  }

  const { error } = await supabase.from('owner_updates').delete().eq('id', updateId);

  if (error) {
    console.error('[deleteOwnerUpdate] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
