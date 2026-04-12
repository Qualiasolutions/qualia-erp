'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';
import { guides as defaultGuides, type Guide } from '@/lib/guides-data';

// ============ SCHEMAS ============

const guideStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  commands: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  warning: z.string().optional(),
  isMilestone: z.boolean().optional(),
  example: z.string().optional(),
  exampleTitle: z.string().optional(),
});

const guideChecklistSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.string()),
});

const updateGuideSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(200),
  subtitle: z.string().min(1).max(500),
  category: z.enum(['foundations', 'lifecycle', 'operations', 'reference', 'checklist']),
  projectType: z.string().min(1),
  steps: z.array(guideStepSchema),
  checklist: guideChecklistSchema,
});

// ============ READ ============

export async function getKnowledgeGuides(): Promise<Guide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('knowledge_guides')
    .select('*')
    .order('sort_order', { ascending: true });

  // If table is empty or error, return defaults
  if (error || !data || data.length === 0) {
    return defaultGuides;
  }

  return data.map((row) => ({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category as Guide['category'],
    projectType: row.project_type as Guide['projectType'],
    steps: row.steps as Guide['steps'],
    checklist: row.checklist as Guide['checklist'],
  }));
}

// ============ SEED ============

export async function seedKnowledgeGuides(
  options: { force?: boolean } = {}
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const admin = await isUserAdmin(user.id);
  if (!admin) return { success: false, error: 'Admin access required' };

  // Check if already seeded
  const { count } = await supabase
    .from('knowledge_guides')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0 && !options.force) {
    return { success: true, data: { message: 'Already seeded', count } };
  }

  // Force mode: wipe existing rows before re-seeding from the latest
  // guides-data.ts. Safe because this action is admin-gated and the
  // source of truth lives in the file anyway.
  if (options.force && count && count > 0) {
    const { error: deleteError } = await supabase
      .from('knowledge_guides')
      .delete()
      .neq('slug', '__impossible_value__'); // match-all filter (slug is NOT NULL UNIQUE)
    if (deleteError) {
      return { success: false, error: `Wipe failed: ${deleteError.message}` };
    }
  }

  const rows = defaultGuides.map((guide, index) => ({
    slug: guide.slug,
    title: guide.title,
    subtitle: guide.subtitle,
    category: guide.category,
    project_type: guide.projectType,
    steps: guide.steps,
    checklist: guide.checklist,
    sort_order: index,
    updated_by: user.id,
  }));

  const { error } = await supabase.from('knowledge_guides').insert(rows);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/portal/knowledge');
  return {
    success: true,
    data: { message: options.force ? 'Re-seeded' : 'Seeded', count: rows.length },
  };
}

// ============ UPDATE ============

export async function updateKnowledgeGuide(
  input: z.infer<typeof updateGuideSchema>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const admin = await isUserAdmin(user.id);
  if (!admin) return { success: false, error: 'Admin access required' };

  const parsed = updateGuideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { slug, title, subtitle, category, projectType, steps, checklist } = parsed.data;

  const { error } = await supabase
    .from('knowledge_guides')
    .update({
      title,
      subtitle,
      category,
      project_type: projectType,
      steps,
      checklist,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('slug', slug);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/portal/knowledge');
  return { success: true };
}
