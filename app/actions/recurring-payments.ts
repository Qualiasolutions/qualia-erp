'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import type { ActionResult } from './shared';
import { getCurrentWorkspaceId } from './workspace';

export type RecurringPaymentRow = {
  id: string;
  workspace_id: string;
  type: 'incoming' | 'outgoing';
  frequency: 'monthly' | 'yearly' | 'one_off';
  amount: number;
  currency: string;
  description: string;
  category: string | null;
  client_id: string | null;
  client_name: string | null;
  project_id: string | null;
  day_of_month: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const createSchema = z.object({
  type: z.enum(['incoming', 'outgoing']).default('incoming'),
  frequency: z.enum(['monthly', 'yearly', 'one_off']).default('monthly'),
  amount: z.number().nonnegative(),
  currency: z.string().min(2).max(8).default('EUR'),
  description: z.string().min(1).max(200),
  category: z.string().max(64).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  day_of_month: z.number().int().min(1).max(28).default(1),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
});

const updateSchema = createSchema.partial();

async function requireAdminWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };
  const admin = await isUserAdmin(user.id);
  if (!admin) return { ok: false as const, error: 'Admin access required' };
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { ok: false as const, error: 'No workspace' };
  return { ok: true as const, supabase, workspaceId, userId: user.id };
}

export async function getRecurringPayments(): Promise<RecurringPaymentRow[]> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return [];
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('recurring_payments')
    .select(
      `
      id, workspace_id, type, frequency, amount, currency, description, category,
      client_id, project_id, day_of_month, start_date, end_date, is_active, notes,
      created_at, updated_at,
      client:clients(id, display_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('is_active', { ascending: false })
    .order('amount', { ascending: false });

  if (error) {
    console.error('[getRecurringPayments]', error);
    return [];
  }

  return (data ?? []).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      type: row.type,
      frequency: row.frequency,
      amount: Number(row.amount),
      currency: row.currency,
      description: row.description,
      category: row.category,
      client_id: row.client_id,
      client_name: (client as { display_name?: string } | null)?.display_name ?? null,
      project_id: row.project_id,
      day_of_month: row.day_of_month,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

export async function createRecurringPayment(
  input: z.input<typeof createSchema>
): Promise<ActionResult> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId, userId } = ctx;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
    };
  }

  const { error } = await supabase.from('recurring_payments').insert({
    workspace_id: workspaceId,
    created_by: userId,
    ...parsed.data,
    client_id: parsed.data.client_id || null,
    project_id: parsed.data.project_id || null,
    start_date: parsed.data.start_date || null,
    end_date: parsed.data.end_date || null,
    notes: parsed.data.notes || null,
    category: parsed.data.category || null,
  });

  if (error) {
    console.error('[createRecurringPayment]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function updateRecurringPayment(
  id: string,
  input: z.input<typeof updateSchema>
): Promise<ActionResult> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'Invalid id' };
  }
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
    };
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  // Coerce empty string back to null on optional fields.
  for (const key of ['client_id', 'project_id', 'start_date', 'end_date', 'notes', 'category']) {
    if (updates[key] === '') updates[key] = null;
  }

  const { error } = await supabase
    .from('recurring_payments')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[updateRecurringPayment]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function deleteRecurringPayment(id: string): Promise<ActionResult> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'Invalid id' };
  }

  const { error } = await supabase
    .from('recurring_payments')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[deleteRecurringPayment]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

/**
 * MRR snapshot — sum of active incoming recurring payments, normalized to monthly.
 * Yearly entries divide by 12. One-offs are excluded.
 */
export async function getMrrSnapshot(): Promise<{
  mrrCurrent: number;
  mrrNextMonth: number;
  expectedThisMonth: number;
  oneOffsThisMonth: number;
  rows: RecurringPaymentRow[];
}> {
  const rows = await getRecurringPayments();
  const incoming = rows.filter((r) => r.is_active && r.type === 'incoming');

  const today = new Date();
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const startOfMonthAfterNext = new Date(today.getFullYear(), today.getMonth() + 2, 1);

  function isActiveOnMonth(r: RecurringPaymentRow, monthStart: Date, monthEnd: Date): boolean {
    if (r.frequency === 'one_off') {
      if (!r.start_date) return false;
      const d = new Date(r.start_date);
      return d >= monthStart && d < monthEnd;
    }
    const start = r.start_date ? new Date(r.start_date) : null;
    const end = r.end_date ? new Date(r.end_date) : null;
    // Active during the month if the window overlaps with [monthStart, monthEnd)
    if (start && start >= monthEnd) return false;
    if (end && end < monthStart) return false;
    return true;
  }

  function monthlyContribution(r: RecurringPaymentRow): number {
    if (r.frequency === 'monthly') return r.amount;
    if (r.frequency === 'yearly') return r.amount / 12;
    return 0;
  }

  let mrrCurrent = 0;
  let mrrNextMonth = 0;
  let oneOffsThisMonth = 0;
  for (const r of incoming) {
    if (isActiveOnMonth(r, startOfThisMonth, startOfNextMonth)) {
      mrrCurrent += monthlyContribution(r);
      if (r.frequency === 'one_off') oneOffsThisMonth += r.amount;
    }
    if (isActiveOnMonth(r, startOfNextMonth, startOfMonthAfterNext)) {
      mrrNextMonth += monthlyContribution(r);
    }
  }
  const expectedThisMonth = mrrCurrent + oneOffsThisMonth;

  return { mrrCurrent, mrrNextMonth, expectedThisMonth, oneOffsThisMonth, rows };
}
