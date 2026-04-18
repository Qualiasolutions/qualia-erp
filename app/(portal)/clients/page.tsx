import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { getClients } from '@/app/actions';
import { ClientTableView } from '@/components/client-table-view';
import { NewClientModal } from '@/components/new-client-modal';
import { Building2 } from 'lucide-react';
import { type Client } from '@/lib/client-utils';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Clients' };

async function ClientListLoader() {
  const data = await getClients();

  // Only show clients (active_client, inactive_client, dead_lead), not leads
  let clients = (data as Client[]).filter(
    (c) =>
      c.lead_status === 'active_client' ||
      c.lead_status === 'inactive_client' ||
      c.lead_status === 'dead_lead'
  );

  // Sort: active clients first, then by name
  clients = clients.sort((a, b) => {
    if (a.lead_status === 'active_client' && b.lead_status !== 'active_client') return -1;
    if (a.lead_status !== 'active_client' && b.lead_status === 'active_client') return 1;
    const aName = a.display_name || '';
    const bName = b.display_name || '';
    return aName.localeCompare(bName);
  });

  return <ClientTableView clients={clients} />;
}

function ClientTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-2">
        {[64, 80, 80].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Skeleton className="h-9 w-full sm:max-w-xs sm:flex-1" />
        <Skeleton className="h-9 w-[130px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center border-b border-border/40 bg-muted/50 px-4 py-3">
          <Skeleton className="mr-4 h-3 w-6" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function PortalClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = await getUserRole(user.id);
  // Only admin can access clients
  if (role !== 'admin') redirect('/');

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={<Building2 className="h-3.5 w-3.5 text-emerald-500" />}
        iconBg="bg-emerald-500/10"
        title="Clients"
      >
        <NewClientModal />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <Suspense fallback={<ClientTableSkeleton />}>
          <ClientListLoader />
        </Suspense>
      </div>
    </div>
  );
}
