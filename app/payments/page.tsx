import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions';
import { FinancialDashboard } from './financial-dashboard';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default async function PaymentsPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isUserAdmin(user.id))) {
    redirect('/');
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader
        icon={<Wallet className="h-3.5 w-3.5 text-emerald-500" />}
        iconBg="bg-emerald-500/10"
        title="Financials"
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <FinancialDashboard />
      </div>
    </div>
  );
}
