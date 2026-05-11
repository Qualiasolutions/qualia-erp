'use server';

import { createClient } from '@/lib/supabase/server';
import { getClientInvoices } from '@/app/actions/client-portal';

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  description: string | null;
  file_url: string | null;
  project: { id: string; name: string } | null;
  source?: string;
  has_pdf?: boolean;
}

export type BillingPayload = {
  invoices: BillingInvoice[];
  invoiceLoadError: string | null;
  clientList: { id: string; name: string }[];
};

/**
 * Load data for the Billing tab inside /admin hub.
 * Mirrors the admin branch of `app/(portal)/billing/page.tsx`.
 */
export async function loadBillingTab(): Promise<BillingPayload> {
  const supabase = await createClient();

  const [invoiceResult, clientListRes] = await Promise.all([
    getClientInvoices(),
    supabase
      .from('clients')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => (data || []) as { id: string; name: string }[]),
  ]);

  const invoiceLoadError = !invoiceResult.success
    ? invoiceResult.error || 'Failed to load invoices'
    : null;

  const invoices = (invoiceResult.success ? invoiceResult.data : []) as BillingInvoice[];

  return {
    invoices,
    invoiceLoadError,
    clientList: clientListRes,
  };
}
