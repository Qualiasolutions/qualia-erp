import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFinancialSummary } from '@/app/actions/financials';
import { FinancialDashboard } from './financial-dashboard';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

const ADMIN_EMAIL = 'info@qualiasolutions.net';

async function DashboardLoader() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== ADMIN_EMAIL) {
    redirect('/');
  }

  const summary = await getFinancialSummary();

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Unable to load financial data.</p>
      </div>
    );
  }

  return <FinancialDashboard summary={summary} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-10 animate-pulse rounded bg-muted" />
              ))}
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
        title="Financials"
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardLoader />
        </Suspense>
      </div>
    </div>
  );
}
