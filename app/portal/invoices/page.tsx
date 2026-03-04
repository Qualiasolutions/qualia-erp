import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientInvoices } from '@/app/actions/client-portal';
import { PortalInvoiceList } from '@/components/portal/portal-invoice-list';
import { fadeInClasses } from '@/lib/transitions';

export default async function PortalInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const result = await getClientInvoices();
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
    <div className={`space-y-6 ${fadeInClasses}`}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and track your invoices and payment history
        </p>
      </div>

      <PortalInvoiceList invoices={invoices} />
    </div>
  );
}
