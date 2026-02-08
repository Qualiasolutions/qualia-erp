'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/app/actions';
import { z } from 'zod';
import { RESEARCH_CATEGORIES } from '@/lib/research-constants';

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

export type ResearchFinding = {
  id: string;
  workspace_id: string;
  created_by: string;
  topic: string;
  topic_category: string;
  summary: string | null;
  key_findings: string[];
  action_items: string[];
  source_links: string[];
  research_date: string;
  gemini_used: boolean;
  notebooklm_used: boolean;
  time_spent_minutes: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string | null;
  } | null;
};

export type ResearchTask = {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

const createResearchSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  topic_category: z.enum(RESEARCH_CATEGORIES),
  summary: z.string().max(10000).optional().nullable(),
  key_findings: z.array(z.string()).optional().default([]),
  action_items: z.array(z.string()).optional().default([]),
  source_links: z.array(z.string()).optional().default([]),
  research_date: z.string().optional(),
  gemini_used: z.boolean().optional().default(true),
  notebooklm_used: z.boolean().optional().default(true),
  time_spent_minutes: z.number().int().positive().optional().nullable(),
});

const updateResearchSchema = z.object({
  id: z.string().uuid('Invalid finding ID'),
  topic: z.string().min(1).max(500).optional(),
  topic_category: z.enum(RESEARCH_CATEGORIES).optional(),
  summary: z.string().max(10000).optional().nullable(),
  key_findings: z.array(z.string()).optional(),
  action_items: z.array(z.string()).optional(),
  source_links: z.array(z.string()).optional(),
  research_date: z.string().optional(),
  gemini_used: z.boolean().optional(),
  notebooklm_used: z.boolean().optional(),
  time_spent_minutes: z.number().int().positive().optional().nullable(),
});

/**
 * Get all research findings for the workspace
 */
export async function getResearchFindings(workspaceId?: string | null): Promise<ResearchFinding[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    console.error('[getResearchFindings] No workspace ID available');
    return [];
  }

  const { data, error } = await supabase
    .from('research_findings')
    .select(
      `
      id,
      workspace_id,
      created_by,
      topic,
      topic_category,
      summary,
      key_findings,
      action_items,
      source_links,
      research_date,
      gemini_used,
      notebooklm_used,
      time_spent_minutes,
      created_at,
      updated_at,
      creator:profiles!created_by (id, full_name)
    `
    )
    .eq('workspace_id', wsId)
    .order('research_date', { ascending: false });

  if (error) {
    console.error('[getResearchFindings] Error:', error);
    return [];
  }

  return (data || []).map((finding) => {
    const f = finding as unknown as {
      creator: ResearchFinding['creator'] | ResearchFinding['creator'][];
    };
    return {
      ...finding,
      creator: Array.isArray(f.creator) ? f.creator[0] || null : f.creator,
    } as ResearchFinding;
  });
}

/**
 * Get research-related tasks (auto-generated daily tasks)
 */
export async function getResearchTasks(workspaceId?: string | null): Promise<ResearchTask[]> {
  const supabase = await createClient();

  let wsId = workspaceId;
  if (!wsId) {
    wsId = await getCurrentWorkspaceId();
  }

  if (!wsId) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      status,
      due_date,
      completed_at,
      created_at
    `
    )
    .eq('workspace_id', wsId)
    .ilike('title', '%Daily Research%')
    .order('due_date', { ascending: false });

  if (error) {
    console.error('[getResearchTasks] Error:', error);
    return [];
  }

  return (data || []) as ResearchTask[];
}

/**
 * Create a new research finding
 */
export async function createResearchFinding(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return { success: false, error: 'No workspace found' };
  }

  const rawData = {
    topic: formData.get('topic') as string,
    topic_category: formData.get('topic_category') as string,
    summary: (formData.get('summary') as string) || null,
    key_findings: parseJsonArray(formData.get('key_findings') as string),
    action_items: parseJsonArray(formData.get('action_items') as string),
    source_links: parseJsonArray(formData.get('source_links') as string),
    research_date: (formData.get('research_date') as string) || undefined,
    gemini_used: formData.get('gemini_used') === 'true',
    notebooklm_used: formData.get('notebooklm_used') === 'true',
    time_spent_minutes: formData.get('time_spent_minutes')
      ? parseInt(formData.get('time_spent_minutes') as string, 10)
      : null,
  };

  const parsed = createResearchSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { data, error } = await supabase
    .from('research_findings')
    .insert({
      ...parsed.data,
      workspace_id: workspaceId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[createResearchFinding] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/research');
  return { success: true, data };
}

/**
 * Update a research finding
 */
export async function updateResearchFinding(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const rawData = {
    id: formData.get('id') as string,
    topic: (formData.get('topic') as string) || undefined,
    topic_category: (formData.get('topic_category') as string) || undefined,
    summary: (formData.get('summary') as string) || null,
    key_findings: formData.has('key_findings')
      ? parseJsonArray(formData.get('key_findings') as string)
      : undefined,
    action_items: formData.has('action_items')
      ? parseJsonArray(formData.get('action_items') as string)
      : undefined,
    source_links: formData.has('source_links')
      ? parseJsonArray(formData.get('source_links') as string)
      : undefined,
    research_date: (formData.get('research_date') as string) || undefined,
    gemini_used: formData.has('gemini_used') ? formData.get('gemini_used') === 'true' : undefined,
    notebooklm_used: formData.has('notebooklm_used')
      ? formData.get('notebooklm_used') === 'true'
      : undefined,
    time_spent_minutes: formData.get('time_spent_minutes')
      ? parseInt(formData.get('time_spent_minutes') as string, 10)
      : null,
  };

  const parsed = updateResearchSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from('research_findings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateResearchFinding] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/research');
  return { success: true, data };
}

/**
 * Delete a research finding
 */
export async function deleteResearchFinding(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.from('research_findings').delete().eq('id', id);

  if (error) {
    console.error('[deleteResearchFinding] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/research');
  return { success: true };
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((s: unknown) => typeof s === 'string' && s.trim())
      : [];
  } catch {
    return [];
  }
}
