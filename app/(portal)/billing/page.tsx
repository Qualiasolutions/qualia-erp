import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientInvoices } from '@/app/actions/client-portal';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalInvoiceList } from '@/components/portal/portal-invoice-list';
import { PortalInvoiceFormDialog } from '@/components/portal/portal-invoice-form-dialog';
import { PortalBillingSummary } from '@/components/portal/portal-billing-summary';
import { CreditCard } from 'lucide-react';

export const metadata: Metadata = { title: 'Billing' };

export default async function PortalBillingPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Billing is only accessible to admin, manager, and client roles
  const profile = await getPortalProfile(user.id);

  if (profile?.role === 'employee') {
    redirect('/');
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  // App Library guard: block clients if the "billing" app is disabled
  if (profile?.role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'billing', profile.role);
    if (!allowed) redirect('/');
  }

  const supabase = await createClient();
  const [invoiceResult, clientList] = await Promise.all([
    getClientInvoices(),
    isAdmin
      ? supabase
          .from('clients')
          .select('id, name')
          .order('name', { ascending: true })
          .then(({ data }) => (data || []) as { id: string; name: string }[])
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const invoiceLoadError = !invoiceResult.success
    ? invoiceResult.error || 'Failed to load invoices'
    : null;
  const invoices = (invoiceResult.success ? invoiceResult.data : []) as Array<{
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
  }>;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
            <p className="text-sm text-muted-foreground">
              View and track your invoices and payment history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <PortalInvoiceFormDialog clients={clientList} />}
        </div>
      </div>

      {invoiceLoadError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {invoiceLoadError}
        </div>
      )}

      {invoices.length > 0 && <PortalBillingSummary invoices={invoices} />}

      <PortalInvoiceList invoices={invoices} />
    </div>
  );
}
