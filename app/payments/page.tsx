import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayments, getPaymentsSummary } from '@/app/actions/payments';
import { PaymentsClient } from './payments-client';
import { Wallet } from 'lucide-react';

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

  const [payments, summary] = await Promise.all([getPayments(), getPaymentsSummary()]);

  return <PaymentsClient payments={payments} summary={summary} />;
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
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 sm:h-9 sm:w-9">
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Payments
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Track income and expenses
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<PaymentsSkeleton />}>
          <PaymentsLoader />
        </Suspense>
      </div>
    </div>
  );
}
