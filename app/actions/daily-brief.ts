'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cyprusToday, generateDailyBrief, TIMEZONE } from '@/lib/daily-brief-generator';
import type { Database } from '@/types/database';
import type { ActionResult } from './shared';

export type BriefItem = Database['public']['Tables']['daily_brief_items']['Row'];

const SOURCE_HEADINGS: Record<string, string> = {
  meeting_today: 'Today',
  overdue_task: 'Overdue',
  project_deadline: 'Team deadlines',
  meeting_upcoming: 'This week',
  framework_gap: 'Framework gaps',
  overdue_invoice: 'Money owed',
  stale_project: 'Quiet projects',
  framework_stale: 'No recent reports',
  manual: 'Captured',
  qualia_memory: 'From the brain',
};

export type BriefSection = {
  heading: string;
  items: BriefItem[];
};

export interface DailyBriefResponse {
  forDate: string;
  timezone: string;
  generatedAt: string | null;
  sections: BriefSection[];
  totals: { active: number; dismissed: number };
}

async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, userId: user.id };
}

export async function getDailyBrief(forDate?: string): Promise<DailyBriefResponse> {
  const date = forDate ?? cyprusToday();
  const { supabase, userId } = await requireSession();

  // Auto-generate today's brief if no rows exist yet (first load of the day,
  // before the cron runs). Cheap because count(head=true) avoids returning
  // any data, and the generator is idempotent.
  if (!forDate) {
    const { count } = await supabase
      .from('daily_brief_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('for_date', date);
    if ((count ?? 0) === 0) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('profile_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      if (membership?.workspace_id) {
        try {
          const admin = createAdminClient();
          await generateDailyBrief(admin, userId, membership.workspace_id, date);
        } catch (err) {
          console.error('[getDailyBrief] auto-generate failed:', err);
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('daily_brief_items')
    .select('*')
    .eq('owner_id', userId)
    .eq('for_date', date)
    .is('dismissed_at', null)
    .order('priority', { ascending: false })
    .order('generated_at', { ascending: true });

  if (error) {
    console.error('[getDailyBrief]', error.message);
    return {
      forDate: date,
      timezone: TIMEZONE,
      generatedAt: null,
      sections: [],
      totals: { active: 0, dismissed: 0 },
    };
  }

  const { count: dismissedCount } = await supabase
    .from('daily_brief_items')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('for_date', date)
    .not('dismissed_at', 'is', null);

  const grouped = new Map<string, BriefItem[]>();
  for (const item of data ?? []) {
    const heading = SOURCE_HEADINGS[item.source_type] ?? item.source_type;
    if (!grouped.has(heading)) grouped.set(heading, []);
    grouped.get(heading)!.push(item);
  }
  const ordering = Object.values(SOURCE_HEADINGS);
  const sections = Array.from(grouped.entries())
    .sort((a, b) => ordering.indexOf(a[0]) - ordering.indexOf(b[0]))
    .map(([heading, items]) => ({ heading, items }));

  const generatedAt = data?.[0]?.generated_at ?? null;

  return {
    forDate: date,
    timezone: TIMEZONE,
    generatedAt,
    sections,
    totals: {
      active: data?.length ?? 0,
      dismissed: dismissedCount ?? 0,
    },
  };
}

export async function getDailyBriefHistory(daysBack = 14): Promise<BriefItem[]> {
  const { supabase, userId } = await requireSession();
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('daily_brief_items')
    .select('*')
    .eq('owner_id', userId)
    .not('dismissed_at', 'is', null)
    .gte('dismissed_at', since)
    .order('dismissed_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[getDailyBriefHistory]', error.message);
    return [];
  }
  return data ?? [];
}

export async function dismissBriefItem(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireSession();
  const { error } = await supabase
    .from('daily_brief_items')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: userId })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function undismissBriefItem(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireSession();
  const { error } = await supabase
    .from('daily_brief_items')
    .update({ dismissed_at: null, dismissed_by: null })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function snoozeBriefItem(id: string, untilIso: string): Promise<ActionResult> {
  const { supabase, userId } = await requireSession();
  const { error } = await supabase
    .from('daily_brief_items')
    .update({ snoozed_until: untilIso })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function createManualBriefItem(input: {
  body: string;
  lead?: string;
  tag?: string;
  forDate?: string;
  priority?: number;
}): Promise<ActionResult> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) return { success: false, error: 'Body is required.' };

  const { supabase, userId } = await requireSession();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  const date = input.forDate ?? cyprusToday();
  const { error } = await supabase.from('daily_brief_items').insert({
    owner_id: userId,
    workspace_id: membership?.workspace_id ?? null,
    for_date: date,
    source_type: 'manual',
    source_id: null,
    tag: input.tag ?? 'ME',
    lead: input.lead?.trim() || null,
    body: trimmedBody.startsWith(' ') ? trimmedBody : ` ${trimmedBody}`,
    priority: input.priority ?? 50,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function regenerateMyDailyBrief(): Promise<ActionResult> {
  const { supabase: userClient, userId } = await requireSession();
  const { data: membership, error: membershipErr } = await userClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (membershipErr || !membership?.workspace_id) {
    return { success: false, error: 'No workspace for current user.' };
  }

  try {
    const admin = createAdminClient();
    const result = await generateDailyBrief(admin, userId, membership.workspace_id);
    revalidatePath('/');
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return { success: false, error: message };
  }
}
