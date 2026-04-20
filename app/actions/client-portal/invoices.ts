'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from '../shared';

/**
 * Get invoices for the current client user.
 * Reads from `financial_invoices` (Zoho-synced) and maps fields to the portal shape.
 */
export async function getClientInvoices(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAdmin = await isUserManagerOrAbove(user.id);

    let query = supabase
      .from('financial_invoices')
      .select(
        'zoho_id, invoice_number, total, currency_code, status, date, due_date, last_payment_date, client_id, is_hidden, source, pdf_url'
      )
      .eq('is_hidden', false)
      .order('date', { ascending: false });

    if (!isAdmin) {
      // Scope invoices to the portal user's linked projects.
      // financial_invoices has no project_id column, so we resolve the CRM
      // client_ids indirectly: portal user -> client_projects -> projects.client_id.
      // Single JOIN replaces the previous 3-query chain.
      const { data: links } = await supabase
        .from('client_projects')
        .select('project:projects!inner(client_id)')
        .eq('client_id', user.id);

      const crmClientIds = [
        ...new Set(
          (links || [])
            .map((l: { project: unknown }) => {
              const proj = Array.isArray(l.project) ? l.project[0] : l.project;
              return (proj as { client_id: string | null } | null)?.client_id;
            })
            .filter(Boolean)
        ),
      ];

      if (crmClientIds.length === 0) return { success: true, data: [] };

      query = query.in('client_id', crmClientIds as string[]);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map financial_invoices fields to the portal invoice shape.
    // `has_pdf` lets the UI render a Download button without leaking the
    // storage path; the signed URL is fetched on click via
    // getInvoicePdfSignedUrl.
    const mapped = (data || []).map((inv) => ({
      id: inv.zoho_id,
      invoice_number: inv.invoice_number,
      amount: inv.total,
      currency: inv.currency_code || 'EUR',
      status: inv.status,
      issued_date: inv.date,
      due_date: inv.due_date,
      paid_date: inv.last_payment_date,
      description: null,
      file_url: null,
      project: null,
      source: (inv as { source?: string }).source ?? 'zoho',
      has_pdf: Boolean((inv as { pdf_url?: string | null }).pdf_url),
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error('[getClientInvoices] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoices',
    };
  }
}
