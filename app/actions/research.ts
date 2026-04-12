'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './shared';

export interface ResearchEntry {
  id: string;
  workspace_id: string;
  author_id: string;
  title: string;
  topic: string;
  category: string;
  summary: string | null;
  key_findings: string | null;
  action_items: string | null;
  sources: string | null;
  raw_content: string | null;
  research_date: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CreateResearchInput {
  title: string;
  topic: string;
  category: string;
  summary?: string;
  key_findings?: string;
  action_items?: string;
  sources?: string;
  raw_content?: string;
  research_date?: string;
}

export interface UpdateResearchInput extends Partial<CreateResearchInput> {
  id: string;
}

/**
 * Get all research entries for the current workspace
 */
export async function getResearchEntries(options?: {
  category?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActionResult & { data?: ResearchEntry[] }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's default workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      return { success: false, error: 'No workspace found' };
    }

    let query = supabase
      .from('research_entries')
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `
      )
      .eq('workspace_id', membership.workspace_id)
      .order('research_date', { ascending: false });

    if (options?.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }

    if (options?.authorId) {
      query = query.eq('author_id', options.authorId);
    }

    if (options?.startDate) {
      query = query.gte('research_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('research_date', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getResearchEntries] Error:', error);
      return { success: false, error: error.message };
    }

    // Normalize FK response
    const normalized = (data || []).map((entry) => ({
      ...entry,
      author: Array.isArray(entry.author) ? entry.author[0] || null : entry.author,
    }));

    return { success: true, data: normalized as ResearchEntry[] };
  } catch (err) {
    console.error('[getResearchEntries] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get a single research entry by ID
 */
export async function getResearchEntry(
  id: string
): Promise<ActionResult & { data?: ResearchEntry }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('research_entries')
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('[getResearchEntry] Error:', error);
      return { success: false, error: error.message };
    }

    // Normalize FK response
    const normalized = {
      ...data,
      author: Array.isArray(data.author) ? data.author[0] || null : data.author,
    };

    return { success: true, data: normalized as ResearchEntry };
  } catch (err) {
    console.error('[getResearchEntry] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Create a new research entry
 */
export async function createResearchEntry(
  input: CreateResearchInput
): Promise<ActionResult & { data?: ResearchEntry }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user's default workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', user.id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      return { success: false, error: 'No workspace found' };
    }

    const { data, error } = await supabase
      .from('research_entries')
      .insert({
        workspace_id: membership.workspace_id,
        author_id: user.id,
        title: input.title,
        topic: input.topic,
        category: input.category || 'general',
        summary: input.summary || null,
        key_findings: input.key_findings || null,
        action_items: input.action_items || null,
        sources: input.sources || null,
        raw_content: input.raw_content || null,
        research_date: input.research_date || new Date().toISOString().split('T')[0],
      })
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('[createResearchEntry] Error:', error);
      return { success: false, error: error.message };
    }

    // Normalize FK response
    const normalized = {
      ...data,
      author: Array.isArray(data.author) ? data.author[0] || null : data.author,
    };

    revalidatePath('/portal/research');
    return { success: true, data: normalized as ResearchEntry };
  } catch (err) {
    console.error('[createResearchEntry] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Update an existing research entry
 */
export async function updateResearchEntry(input: UpdateResearchInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('research_entries')
      .select('author_id')
      .eq('id', input.id)
      .single();

    if (!existing) {
      return { success: false, error: 'Research entry not found' };
    }

    if (existing.author_id !== user.id) {
      return { success: false, error: 'Not authorized to update this entry' };
    }

    const { id, ...updates } = input;
    const { error } = await supabase.from('research_entries').update(updates).eq('id', id);

    if (error) {
      console.error('[updateResearchEntry] Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/portal/research');
    revalidatePath(`/portal/research/${id}`);
    return { success: true };
  } catch (err) {
    console.error('[updateResearchEntry] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Delete a research entry
 */
export async function deleteResearchEntry(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('research_entries')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Research entry not found' };
    }

    if (existing.author_id !== user.id) {
      return { success: false, error: 'Not authorized to delete this entry' };
    }

    const { error } = await supabase.from('research_entries').delete().eq('id', id);

    if (error) {
      console.error('[deleteResearchEntry] Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/portal/research');
    return { success: true };
  } catch (err) {
    console.error('[deleteResearchEntry] Unexpected error:', err);
    return { success: false, error: String(err) };
  }
}
