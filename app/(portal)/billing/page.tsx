import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientInvoices } from '@/app/actions/client-portal';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { PortalInvoiceList } from '@/components/portal/portal-invoice-list';
import { PortalBillingSummary } from '@/components/portal/portal-billing-summary';

export default async function PortalBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Billing is only accessible to admin, manager, and client roles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'employee') {
    redirect('/');
  }

  // App Library guard: block clients if the "billing" app is disabled
  if (profile?.role === 'client') {
    const workspaceId = await getCurrentWorkspaceId();
    const allowed = await assertAppEnabledForClient(user.id, workspaceId, 'billing', profile.role);
    if (!allowed) redirect('/');
  }

  const result = await getClientInvoices();
  const invoiceLoadError = !result.success ? result.error || 'Failed to load invoices' : null;
  const invoices = (result.success ? result.data : []) as Array<{
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
  }>;

  return (
    <div className="animate-fade-in-up space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and track your invoices and payment history
        </p>
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
