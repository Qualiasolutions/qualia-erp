import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientInvoices } from '@/app/actions/client-portal';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { PortalInvoiceList } from '@/components/portal/portal-invoice-list';
import { PortalInvoiceFormDialog } from '@/components/portal/portal-invoice-form-dialog';
import { PortalBillingSummary } from '@/components/portal/portal-billing-summary';

export const metadata: Metadata = { title: 'Billing' };

export default async function PortalBillingPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Billing is only accessible to admin, manager, and client roles
  const profile = await getPortalProfile(user.id);

  if (profile?.role === 'employee') {
    redirect('/dashboard');
  }

  const isAdmin = profile?.role === 'admin';

  // App Library guard: block clients if the "billing" app is disabled
  if (profile?.role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'billing', profile.role);
    if (!allowed) redirect('/dashboard');
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
    <div className="animate-fade-in-up px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(2rem,4vw,3rem)] pt-16 md:pt-[clamp(2.5rem,4vw,3.5rem)]">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
            <span>Finance</span>
          </div>
          <h1 className="mt-3 text-[clamp(1.5rem,1rem+1.6vw,2rem)] font-semibold leading-tight tracking-tight text-foreground">
            Billing
          </h1>
          <p className="mt-1.5 max-w-[480px] text-sm text-muted-foreground">
            Invoices, payments, and the running ledger of work delivered.
          </p>
        </div>
        {isAdmin && <PortalInvoiceFormDialog clients={clientList} />}
      </header>

      {invoiceLoadError && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {invoiceLoadError}
        </div>
      )}

      {invoices.length > 0 && (
        <div className="mb-8">
          <PortalBillingSummary invoices={invoices} />
        </div>
      )}

      <PortalInvoiceList invoices={invoices} />
    </div>
  );
}
