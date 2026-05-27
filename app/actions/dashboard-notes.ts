'use server';

import { createClient } from '@/lib/supabase/server';
import { uuidParam, dashboardNotePayloadSchema, type DashboardNotePayload } from '@/lib/validation';
import { isUserAdmin, type ActionResult } from './shared';

export type DashboardNoteKind = 'manual' | 'automatic';

export type DashboardNote = {
  id: string;
  title: string;
  content: string;
  status: string;
  kind: DashboardNoteKind;
  author_id: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
};

const DASHBOARD_NOTICE_PREFIX = '__dashboard_notice_v1__:';

function parseDashboardNotice(
  content: string
): Pick<DashboardNote, 'title' | 'content' | 'status' | 'kind'> {
  if (content.startsWith(DASHBOARD_NOTICE_PREFIX)) {
    try {
      const parsed = JSON.parse(content.slice(DASHBOARD_NOTICE_PREFIX.length)) as Partial<{
        title: string;
        content: string;
        status: string;
        kind: DashboardNoteKind;
      }>;
      return {
        title: parsed.title?.trim() || 'Untitled notice',
        content: parsed.content?.trim() || '',
        status: parsed.status?.trim() || 'Notice',
        kind: parsed.kind === 'automatic' ? 'automatic' : 'manual',
      };
    } catch {
      // Fall through to legacy text handling.
    }
  }

  const title = content
    .split('\n')
    .find((line) => line.trim())
    ?.trim()
    .slice(0, 120);
  return {
    title: title || 'Manual note',
    content,
    status: 'Notice',
    kind: 'manual',
  };
}

function serializeDashboardNotice(payload: DashboardNotePayload): string {
  return `${DASHBOARD_NOTICE_PREFIX}${JSON.stringify({
    title: payload.title.trim(),
    content: payload.content.trim(),
    status: payload.status.trim(),
    kind: payload.kind,
  })}`;
}

export async function getDashboardNotes(): Promise<DashboardNote[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('dashboard_notes')
    .select('*, author:profiles!author_id(id, full_name, avatar_url, role)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((note) => {
    const parsed = parseDashboardNotice(note.content);
    return {
      ...note,
      ...parsed,
      author: Array.isArray(note.author) ? note.author[0] || null : note.author,
    };
  });
}

export async function createDashboardNote(input: DashboardNotePayload): Promise<ActionResult> {
  const check = dashboardNotePayloadSchema.safeParse(input);
  if (!check.success) return { success: false, error: check.error.issues[0].message };
  const payload = check.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins and managers can create notes' };
  }

  const { error } = await supabase.from('dashboard_notes').insert({
    content: serializeDashboardNotice(payload),
    author_id: user.id,
  });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function updateDashboardNote(
  noteId: string,
  input: DashboardNotePayload
): Promise<ActionResult> {
  const idCheck = uuidParam.safeParse(noteId);
  const payloadCheck = dashboardNotePayloadSchema.safeParse(input);
  if (!idCheck.success) return { success: false, error: 'Invalid note ID' };
  if (!payloadCheck.success) return { success: false, error: payloadCheck.error.issues[0].message };
  const payload = payloadCheck.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Ownership check: only author or admin/manager can update
  const { data: note } = await supabase
    .from('dashboard_notes')
    .select('author_id')
    .eq('id', noteId)
    .single();

  if (!note) return { success: false, error: 'Note not found' };

  if (note.author_id !== user.id && !(await isUserAdmin(user.id))) {
    return { success: false, error: 'You can only edit your own notes' };
  }

  const { data, error } = await supabase
    .from('dashboard_notes')
    .update({
      content: serializeDashboardNotice(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Not found or permission denied' };

  return { success: true };
}

export async function deleteDashboardNote(noteId: string): Promise<ActionResult> {
  const idCheck = uuidParam.safeParse(noteId);
  if (!idCheck.success) return { success: false, error: 'Invalid note ID' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Ownership check: only author or admin/manager can delete
  const { data: note } = await supabase
    .from('dashboard_notes')
    .select('author_id')
    .eq('id', noteId)
    .single();

  if (!note) return { success: false, error: 'Note not found' };

  if (note.author_id !== user.id && !(await isUserAdmin(user.id))) {
    return { success: false, error: 'You can only delete your own notes' };
  }

  const { data, error } = await supabase
    .from('dashboard_notes')
    .delete()
    .eq('id', noteId)
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Not found or permission denied' };

  return { success: true };
}

export async function togglePinNote(noteId: string, pinned: boolean): Promise<ActionResult> {
  const idCheck = uuidParam.safeParse(noteId);
  if (!idCheck.success) return { success: false, error: 'Invalid note ID' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserAdmin(user.id))) {
    return { success: false, error: 'Only admins and managers can pin notes' };
  }

  const { data, error } = await supabase
    .from('dashboard_notes')
    .update({ pinned })
    .eq('id', noteId)
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Not found or permission denied' };

  return { success: true };
}
