import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import {
  getPayments,
  getPaymentsSummary,
  getRecurringPayments,
  getRecurringSummary,
  getClientBalances,
} from '@/app/actions/payments';
import { PaymentsClient } from './payments-client';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

const ADMIN_EMAIL = 'info@qualiasolutions.net';

async function PaymentsLoader() {
  await connection();

  // Check if user is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== ADMIN_EMAIL) {
    redirect('/');
  }

  const workspaceId = await getCurrentWorkspaceId();

  // Fetch clients and projects for dropdowns
  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, display_name')
      .eq('workspace_id', workspaceId)
      .order('name'),
    supabase.from('projects').select('id, name').eq('workspace_id', workspaceId).order('name'),
  ]);

  const [payments, summary, recurringPayments, recurringSummary, clientBalances] =
    await Promise.all([
      getPayments(),
      getPaymentsSummary(),
      getRecurringPayments(),
      getRecurringSummary(),
      getClientBalances(),
    ]);

  return (
    <PaymentsClient
      payments={payments}
      summary={summary}
      recurringPayments={recurringPayments}
      recurringSummary={recurringSummary}
      clients={clients || []}
      clientBalances={clientBalances}
      projects={projects || []}
    />
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader
        icon={<Wallet className="h-3.5 w-3.5 text-emerald-500" />}
        iconBg="bg-emerald-500/10"
        title="Payments"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<PaymentsSkeleton />}>
          <PaymentsLoader />
        </Suspense>
      </div>
    </div>
  );
}
