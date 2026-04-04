'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isUserManagerOrAbove, type ActionResult } from './shared';

export type DashboardNote = {
  id: string;
  content: string;
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

  return data.map((note) => ({
    ...note,
    author: Array.isArray(note.author) ? note.author[0] || null : note.author,
  }));
}

export async function createDashboardNote(content: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserManagerOrAbove(user.id))) {
    return { success: false, error: 'Only admins and managers can create notes' };
  }

  const { error } = await supabase.from('dashboard_notes').insert({
    content: content.trim(),
    author_id: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function updateDashboardNote(noteId: string, content: string): Promise<ActionResult> {
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

  if (note.author_id !== user.id && !(await isUserManagerOrAbove(user.id))) {
    return { success: false, error: 'You can only edit your own notes' };
  }

  const { error } = await supabase
    .from('dashboard_notes')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', noteId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function deleteDashboardNote(noteId: string): Promise<ActionResult> {
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

  if (note.author_id !== user.id && !(await isUserManagerOrAbove(user.id))) {
    return { success: false, error: 'You can only delete your own notes' };
  }

  const { error } = await supabase.from('dashboard_notes').delete().eq('id', noteId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function togglePinNote(noteId: string, pinned: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!(await isUserManagerOrAbove(user.id))) {
    return { success: false, error: 'Only admins and managers can pin notes' };
  }

  const { error } = await supabase.from('dashboard_notes').update({ pinned }).eq('id', noteId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  return { success: true };
}
