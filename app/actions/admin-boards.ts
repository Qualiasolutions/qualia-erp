'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';

/**
 * Admin-only freeform canvas boards (tldraw snapshots).
 *
 * Each row holds an entire tldraw store snapshot in `snapshot` (jsonb).
 * Assets (images dropped onto the canvas) are uploaded to the `project-files`
 * bucket under `admin-boards/<boardId>/<uuid>.<ext>` and referenced by public URL.
 */

async function requireAdmin(): Promise<
  { ok: true; actorId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getClaims();
  const actorId = userData?.claims?.sub;
  if (!actorId) return { ok: false, error: 'Unauthenticated' };
  if (!(await isUserAdmin(actorId))) return { ok: false, error: 'Admin only' };
  return { ok: true, actorId };
}

export async function listBoards(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_boards')
    .select('id, name, updated_at, created_at')
    .order('updated_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getBoardById(boardId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(boardId).success) {
    return { success: false, error: 'Invalid boardId' };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_boards')
    .select('id, name, snapshot, updated_at')
    .eq('id', boardId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Board not found' };
  return { success: true, data };
}

/**
 * Get-or-create the default scratchpad board. Returns at minimum {id, name, snapshot}.
 */
export async function getOrCreateDefaultBoard(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('admin_boards')
    .select('id, name, snapshot, updated_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return { success: true, data: existing };

  const { data: created, error } = await admin
    .from('admin_boards')
    .insert({
      name: 'Scratchpad',
      snapshot: null,
      created_by: auth.actorId,
      updated_by: auth.actorId,
    })
    .select('id, name, snapshot, updated_at')
    .single();

  if (error || !created) return { success: false, error: error?.message ?? 'Insert failed' };
  return { success: true, data: created };
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function createBoard(input: z.infer<typeof createSchema>): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_boards')
    .insert({
      name: parsed.data.name,
      created_by: auth.actorId,
      updated_by: auth.actorId,
    })
    .select('id, name')
    .single();

  if (error || !data) return { success: false, error: error?.message ?? 'Insert failed' };
  revalidatePath('/admin/board');
  return { success: true, data };
}

const saveSchema = z.object({
  boardId: z.string().uuid(),
  snapshot: z.unknown(),
});

export async function saveBoardSnapshot(input: z.infer<typeof saveSchema>): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('admin_boards')
    .update({
      snapshot: parsed.data.snapshot as never,
      updated_by: auth.actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.boardId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

const renameSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(120),
});

export async function renameBoard(input: z.infer<typeof renameSchema>): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('admin_boards')
    .update({ name: parsed.data.name, updated_by: auth.actorId })
    .eq('id', parsed.data.boardId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/board');
  return { success: true };
}

export async function deleteBoard(boardId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(boardId).success) {
    return { success: false, error: 'Invalid boardId' };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from('admin_boards').delete().eq('id', boardId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/board');
  return { success: true };
}

/**
 * Upload an asset (image dropped onto the canvas) to Supabase Storage.
 * Returns a public URL that gets embedded in the tldraw snapshot.
 */
export async function uploadBoardAsset(boardId: string, formData: FormData): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(boardId).success) {
    return { success: false, error: 'Invalid boardId' };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const file = formData.get('file');
  if (!(file instanceof File)) return { success: false, error: 'No file provided' };
  if (file.size > 20 * 1024 * 1024) return { success: false, error: 'Max 20MB per asset' };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'bin';
  const assetId = crypto.randomUUID();
  const storagePath = `admin-boards/${boardId}/${assetId}.${safeExt}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('project-files')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = admin.storage.from('project-files').getPublicUrl(storagePath);

  return { success: true, data: { url: publicUrl, storagePath } };
}
