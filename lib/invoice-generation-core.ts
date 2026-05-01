/**
 * Workspace-scoped core for invoice generation.
 *
 * The server-action wrapper (app/actions/invoice-generation.ts) provides
 * session auth and calls these. The MCP route (app/api/mcp/[transport])
 * calls these with its own token-derived workspace context.
 *
 * No 'use server' here — this is a plain library so it can be imported
 * from both server actions and route handlers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

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

export type CoreResult<T> = { success: true; data: T } | { success: false; error: string };

export type LineItemInput = {
  item_id?: string;
  name: string;
  description?: string;
  rate: number;
  quantity?: number;
  vat: boolean;
};

export type GenerateInvoiceInput = {
  template_key: string;
  client_id: string;
  line_items?: LineItemInput[];
  reference_number?: string;
  invoice_date?: string;
  due_date?: string;
  terms_key?: TermsTemplateKey;
  notes?: string;
};

export type GeneratedInvoice = {
  invoice_id: string;
  invoice_number: string;
  invoice_url?: string;
  total: number;
  status: string;
};

export type GenerateEmailInput = {
  template_key: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  reference_number?: string;
  to: string;
  cc?: string[];
};

export type ClientLookup = {
  id: string;
  display_name: string | null;
  zoho_contact_id: string | null;
  zoho_company_name: string | null;
  default_vat_treatment: VatTreatment | null;
};

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

/** When client is non-EU or EU-reverse, we always strip VAT regardless of template. */
function effectiveTaxId(vatLine: boolean, treatment: VatTreatment | null): string | undefined {
  if (!vatLine) return ''; // template explicitly says no tax
  if (treatment === 'non_eu_zero' || treatment === 'eu_reverse') return '';
  return ZOHO_VAT_19_TAX_ID;
}

export async function loadClientForInvoicing(
  supabase: SupabaseClient,
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

export async function generateInvoiceCore(
  supabase: SupabaseClient,
  workspaceId: string,
  input: GenerateInvoiceInput
): Promise<CoreResult<GeneratedInvoice>> {
  const template = INVOICE_TEMPLATES[input.template_key];
  if (!template) {
    return { success: false, error: `Unknown template: ${input.template_key}` };
  }
  if (template.requires_reference && !input.reference_number) {
    return { success: false, error: `Template "${template.label}" requires a reference number` };
  }

  const client = await loadClientForInvoicing(supabase, input.client_id);
  if (!client) return { success: false, error: 'Client not found' };
  if (!client.zoho_contact_id) {
    return {
      success: false,
      error: `Client "${client.display_name ?? input.client_id}" has no zoho_contact_id`,
    };
  }
  // Confirm client is in this workspace (defence-in-depth).
  // We re-query rather than trusting the loaded row to avoid leaking between workspaces.
  const { data: ws } = await supabase
    .from('clients')
    .select('workspace_id')
    .eq('id', input.client_id)
    .maybeSingle();
  if (ws?.workspace_id !== workspaceId) {
    return { success: false, error: 'Client belongs to a different workspace' };
  }

  const placeholders = placeholdersFor({
    invoice_date: input.invoice_date,
    reference_number: input.reference_number,
  });

  const sourceLines: LineItemInput[] =
    input.line_items && input.line_items.length > 0
      ? input.line_items
      : template.line_items.map((l) => ({
          item_id: l.item_id,
          name: l.name,
          description: l.description,
          rate: l.default_rate,
          quantity: 1,
          vat: l.vat,
        }));

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

  const termsKey: TermsTemplateKey = input.terms_key ?? 'generic';
  const result = await createZohoInvoice(workspaceId, {
    customer_id: client.zoho_contact_id,
    customer_name: client.zoho_company_name ?? undefined,
    items,
    date: input.invoice_date,
    due_date: input.due_date,
    notes: input.notes,
    terms: TERMS_TEMPLATES[termsKey],
    reference_number: input.reference_number,
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

export async function generateInvoiceCoverEmailCore(
  supabase: SupabaseClient,
  workspaceId: string,
  input: GenerateEmailInput
): Promise<CoreResult<{ messageId: string }>> {
  const template = INVOICE_TEMPLATES[input.template_key];
  if (!template) return { success: false, error: `Unknown template: ${input.template_key}` };

  const client = await loadClientForInvoicing(supabase, input.client_id);
  if (!client) return { success: false, error: 'Client not found' };

  // Workspace check
  const { data: ws } = await supabase
    .from('clients')
    .select('workspace_id')
    .eq('id', input.client_id)
    .maybeSingle();
  if (ws?.workspace_id !== workspaceId) {
    return { success: false, error: 'Client belongs to a different workspace' };
  }

  const firstName = (client.display_name ?? 'there').split(/\s+/)[0];

  const placeholders = placeholdersFor({
    invoice_number: input.invoice_number,
    invoice_date: input.invoice_date,
    reference_number: input.reference_number,
    client_first_name: firstName,
  });

  const result = await createZohoMailDraft(workspaceId, {
    to: input.to,
    cc: input.cc && input.cc.length > 0 ? input.cc.join(',') : undefined,
    subject: resolvePlaceholders(template.email_subject, placeholders),
    body: resolvePlaceholders(template.email_body_html, placeholders),
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Zoho Mail draft failed' };
  }

  return { success: true, data: result.data as { messageId: string } };
}
