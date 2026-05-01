'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';
import {
  generateInvoiceCore,
  generateInvoiceCoverEmailCore,
  type CoreResult,
  type GeneratedInvoice,
  type LineItemInput,
} from '@/lib/invoice-generation-core';
import { INVOICE_TEMPLATES, type VatTreatment } from '@/lib/invoice-templates';

/**
 * Server-action wrappers around lib/invoice-generation-core.
 *
 * These add session-based admin auth. The MCP route uses the same core but
 * with token-derived auth (see app/api/mcp/[transport]/route.ts).
 */

// ============ AUTH HELPER ============

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
  return { ok: true as const, supabase, workspaceId };
}

// ============ SCHEMAS ============

const lineItemInputSchema = z.object({
  item_id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  rate: z.number().nonnegative(),
  quantity: z.number().positive().default(1),
  vat: z.boolean().default(true),
});

const generateInvoiceSchema = z.object({
  template_key: z.string().min(1),
  client_id: z.string().uuid(),
  line_items: z.array(lineItemInputSchema).default([]),
  reference_number: z.string().max(64).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  invoice_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  terms_key: z.enum(['generic', 'sakani_pda']).default('generic'),
  notes: z.string().max(2000).optional(),
});

const generateEmailSchema = z.object({
  template_key: z.string().min(1),
  client_id: z.string().uuid(),
  invoice_number: z.string().max(64),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference_number: z.string().max(64).optional(),
  to: z.string().email(),
  cc: z.array(z.string().email()).default([]),
});

// ============ READS ============

export type BillableClient = {
  id: string;
  display_name: string;
  zoho_contact_id: string;
  zoho_company_name: string | null;
  default_vat_treatment: VatTreatment | null;
};

export async function getBillableClients(): Promise<BillableClient[]> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return [];
  const { supabase, workspaceId } = ctx;

  const { data, error } = await supabase
    .from('clients')
    .select('id, display_name, name, zoho_contact_id, zoho_company_name, default_vat_treatment')
    .eq('workspace_id', workspaceId)
    .not('zoho_contact_id', 'is', null)
    .order('display_name', { ascending: true });

  if (error) {
    console.error('[getBillableClients]', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    display_name: row.display_name ?? row.name,
    zoho_contact_id: row.zoho_contact_id as string,
    zoho_company_name: row.zoho_company_name,
    default_vat_treatment: row.default_vat_treatment as VatTreatment | null,
  }));
}

// ============ PUBLIC ACTIONS ============

export async function generateInvoiceFromTemplate(
  input: z.input<typeof generateInvoiceSchema>
): Promise<CoreResult<GeneratedInvoice>> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const parsed = generateInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') };
  }

  const result = await generateInvoiceCore(ctx.supabase, ctx.workspaceId, parsed.data);
  if (result.success) revalidatePath('/admin');
  return result;
}

export async function generateInvoiceCoverEmail(
  input: z.input<typeof generateEmailSchema>
): Promise<CoreResult<{ messageId: string }>> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const parsed = generateEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') };
  }

  return generateInvoiceCoverEmailCore(ctx.supabase, ctx.workspaceId, parsed.data);
}

/**
 * Bulk: iterate active monthly recurring payments and generate a draft for each
 * that has a template_key.
 */
export async function generateMonthlyRetainerInvoices(input: { invoice_date?: string }): Promise<
  CoreResult<{
    created: GeneratedInvoice[];
    skipped: { recurring_id: string; reason: string }[];
  }>
> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  const { data: rows, error } = await supabase
    .from('recurring_payments')
    .select('id, client_id, template_key, amount, zoho_line_items, frequency, type, is_active')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('type', 'incoming')
    .eq('frequency', 'monthly');

  if (error) return { success: false, error: error.message };

  const created: GeneratedInvoice[] = [];
  const skipped: { recurring_id: string; reason: string }[] = [];

  for (const row of rows ?? []) {
    if (!row.client_id) {
      skipped.push({ recurring_id: row.id, reason: 'no client_id' });
      continue;
    }
    if (!row.template_key) {
      skipped.push({ recurring_id: row.id, reason: 'no template_key' });
      continue;
    }
    const template = INVOICE_TEMPLATES[row.template_key];
    if (!template) {
      skipped.push({ recurring_id: row.id, reason: `unknown template_key ${row.template_key}` });
      continue;
    }

    const overrideLines = (row.zoho_line_items ?? null) as LineItemInput[] | null;
    const lineItems: LineItemInput[] =
      overrideLines && overrideLines.length > 0
        ? overrideLines
        : template.line_items.map((l, idx) => ({
            item_id: l.item_id,
            name: l.name,
            description: l.description,
            rate: idx === 0 ? Number(row.amount) : l.default_rate,
            quantity: 1,
            vat: l.vat,
          }));

    const result = await generateInvoiceCore(supabase, workspaceId, {
      template_key: row.template_key,
      client_id: row.client_id,
      line_items: lineItems,
      invoice_date: input.invoice_date,
      terms_key: 'generic',
    });

    if (result.success) {
      created.push(result.data);
    } else {
      skipped.push({ recurring_id: row.id, reason: result.error });
    }
  }

  revalidatePath('/admin');

  return { success: true, data: { created, skipped } };
}
