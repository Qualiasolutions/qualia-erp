'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';
import {
  createZohoInvoice,
  createZohoMailDraft,
  type CreateInvoiceParams,
} from '@/lib/integrations/zoho';
import {
  INVOICE_TEMPLATES,
  TERMS_TEMPLATES,
  ZOHO_VAT_19_TAX_ID,
  resolvePlaceholders,
  type TermsTemplateKey,
  type VatTreatment,
} from '@/lib/invoice-templates';

/** Local generic ActionResult — the shared one is `data?: unknown`. */
type Result<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Server-actions for the "generate invoice from template" workflow.
 *
 * - generateInvoiceFromTemplate(): pushes a draft invoice to Zoho Books
 * - generateInvoiceCoverEmail(): saves a cover-email draft in Zoho Mail
 * - generateMonthlyRetainerInvoices(): bulk version for end-of-month
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
  /** Final, user-resolved line items. Empty array = use template defaults as-is. */
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

// ============ TYPES ============

type ClientLookup = {
  id: string;
  display_name: string | null;
  zoho_contact_id: string | null;
  zoho_company_name: string | null;
  default_vat_treatment: VatTreatment | null;
};

type GenerateInvoiceResult = {
  invoice_id: string;
  invoice_number: string;
  invoice_url?: string;
  total: number;
  status: string;
};

// ============ HELPERS ============

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function placeholdersFor(args: {
  invoice_number?: string;
  invoice_date?: string;
  reference_number?: string;
  client_first_name?: string;
}): Record<string, string> {
  const date = args.invoice_date ? new Date(args.invoice_date) : new Date();
  return {
    month: MONTH_NAMES[date.getMonth()],
    year: String(date.getFullYear()),
    invoice_number: args.invoice_number ?? '',
    invoice_date: args.invoice_date ?? new Date().toISOString().slice(0, 10),
    reference_number: args.reference_number ?? '',
    client_first_name: args.client_first_name ?? 'Client',
  };
}

async function loadClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<ClientLookup | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, display_name, zoho_contact_id, zoho_company_name, default_vat_treatment')
    .eq('id', clientId)
    .single();
  if (error || !data) return null;
  return data as ClientLookup;
}

/** When client is non-EU or EU-reverse, we always strip VAT regardless of template. */
function effectiveTaxId(vatLine: boolean, treatment: VatTreatment | null): string | undefined {
  if (!vatLine) return ''; // template explicitly says no tax
  if (treatment === 'non_eu_zero' || treatment === 'eu_reverse') return '';
  return ZOHO_VAT_19_TAX_ID; // default cyprus_vat or null treatment
}

// ============ READS ============

export type BillableClient = {
  id: string;
  display_name: string;
  zoho_contact_id: string;
  zoho_company_name: string | null;
  default_vat_treatment: VatTreatment | null;
};

/**
 * Clients linked to a Zoho Books contact — these are the only ones we can
 * generate invoices for via the template system.
 */
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

/**
 * Push a draft invoice to Zoho Books from a template.
 *
 * Flow:
 *  1. Resolve template + client (must have zoho_contact_id)
 *  2. Use user-provided line_items (already resolved via UI), else template defaults
 *  3. Apply VAT according to client's default_vat_treatment
 *  4. Resolve `{month}/{year}/etc` placeholders in line names + descriptions
 *  5. POST to Zoho Books with send=false (draft)
 */
export async function generateInvoiceFromTemplate(
  input: z.input<typeof generateInvoiceSchema>
): Promise<Result<GenerateInvoiceResult>> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  const parsed = generateInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') };
  }
  const data = parsed.data;

  const template = INVOICE_TEMPLATES[data.template_key];
  if (!template) {
    return { success: false, error: `Unknown template: ${data.template_key}` };
  }
  if (template.requires_reference && !data.reference_number) {
    return { success: false, error: `Template "${template.label}" requires a reference number` };
  }

  const client = await loadClient(supabase, data.client_id);
  if (!client) return { success: false, error: 'Client not found' };
  if (!client.zoho_contact_id) {
    return {
      success: false,
      error: `Client "${client.display_name ?? data.client_id}" has no zoho_contact_id. Link it on the client record first.`,
    };
  }

  const placeholders = placeholdersFor({
    invoice_date: data.invoice_date,
    reference_number: data.reference_number,
  });

  // If the user resolved line items in the UI, use them; otherwise fall back to template defaults.
  const sourceLines =
    data.line_items.length > 0
      ? data.line_items
      : template.line_items.map((l) => ({
          item_id: l.item_id,
          name: l.name,
          description: l.description,
          rate: l.default_rate,
          quantity: 1,
          vat: l.vat,
        }));

  // Drop zero-rate lines so we don't push useless €0 entries.
  const lines = sourceLines.filter((l) => l.rate > 0);
  if (lines.length === 0) {
    return { success: false, error: 'Invoice must have at least one line with a non-zero rate' };
  }

  const items: CreateInvoiceParams['items'] = lines.map((l) => ({
    item_id: l.item_id,
    name: resolvePlaceholders(l.name, placeholders),
    description: resolvePlaceholders(l.description ?? '', placeholders),
    rate: l.rate,
    quantity: l.quantity ?? 1,
    tax_id: effectiveTaxId(l.vat, client.default_vat_treatment),
  }));

  const termsKey: TermsTemplateKey = data.terms_key;
  const result = await createZohoInvoice(workspaceId, {
    customer_id: client.zoho_contact_id,
    customer_name: client.zoho_company_name ?? undefined,
    items,
    date: data.invoice_date,
    due_date: data.due_date,
    notes: data.notes,
    terms: TERMS_TEMPLATES[termsKey],
    reference_number: data.reference_number,
    draft: true,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Zoho invoice creation failed' };
  }

  const inv = result.data as
    | {
        invoice_id?: string;
        invoice_number?: string;
        invoice_url?: string;
        total?: number;
        status?: string;
      }
    | undefined;

  if (!inv?.invoice_id || !inv.invoice_number) {
    return { success: false, error: 'Zoho returned an unexpected response shape' };
  }

  revalidatePath('/admin');

  return {
    success: true,
    data: {
      invoice_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      invoice_url: inv.invoice_url,
      total: Number(inv.total ?? 0),
      status: inv.status ?? 'draft',
    },
  };
}

/**
 * Save a cover-email draft in Zoho Mail for an invoice that was just generated.
 */
export async function generateInvoiceCoverEmail(
  input: z.input<typeof generateEmailSchema>
): Promise<Result<{ messageId: string }>> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  const parsed = generateEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(', ') };
  }
  const data = parsed.data;

  const template = INVOICE_TEMPLATES[data.template_key];
  if (!template) return { success: false, error: `Unknown template: ${data.template_key}` };

  const client = await loadClient(supabase, data.client_id);
  if (!client) return { success: false, error: 'Client not found' };

  // First-name guess from display_name's first token.
  const firstName = (client.display_name ?? 'there').split(/\s+/)[0];

  const placeholders = placeholdersFor({
    invoice_number: data.invoice_number,
    invoice_date: data.invoice_date,
    reference_number: data.reference_number,
    client_first_name: firstName,
  });

  const result = await createZohoMailDraft(workspaceId, {
    to: data.to,
    cc: data.cc.length > 0 ? data.cc.join(',') : undefined,
    subject: resolvePlaceholders(template.email_subject, placeholders),
    body: resolvePlaceholders(template.email_body_html, placeholders),
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Zoho Mail draft failed' };
  }

  return { success: true, data: result.data as { messageId: string } };
}

/**
 * One-click bulk: generate draft invoices for every active monthly recurring payment.
 *
 * Reads `recurring_payments` where is_active=true, type='incoming', frequency='monthly'.
 * For each row with a `template_key`, generate the invoice. Skips rows with no
 * template_key or no client_id.
 */
export async function generateMonthlyRetainerInvoices(input: {
  /** YYYY-MM-DD — the invoice date. Defaults to today. */
  invoice_date?: string;
}): Promise<
  Result<{
    created: GenerateInvoiceResult[];
    skipped: { recurring_id: string; reason: string }[];
  }>
> {
  const ctx = await requireAdminWorkspace();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const { supabase, workspaceId } = ctx;

  const { data: rows, error } = await supabase
    .from('recurring_payments')
    .select(
      'id, client_id, template_key, amount, description, zoho_line_items, frequency, type, is_active'
    )
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('type', 'incoming')
    .eq('frequency', 'monthly');

  if (error) return { success: false, error: error.message };

  const created: GenerateInvoiceResult[] = [];
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

    // Use stored override line items if present, else use the template defaults
    // with the recurring payment's amount applied to the FIRST line.
    const overrideLines = (row.zoho_line_items ?? null) as
      | z.input<typeof lineItemInputSchema>[]
      | null;

    const lineItems: z.input<typeof lineItemInputSchema>[] =
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

    const result = await generateInvoiceFromTemplate({
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
