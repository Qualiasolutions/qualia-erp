import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/portal-utils';
import { getClients } from '@/app/actions';
import { QualiaClientsView } from '@/components/portal/qualia-clients-view';
import { type Client } from '@/lib/client-utils';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Clients' };

async function ClientListLoader() {
  const data = await getClients();
  // Only show clients (active_client, inactive_client, dead_lead), not leads
  const clients = (data as Client[]).filter(
    (c) =>
      c.lead_status === 'active_client' ||
      c.lead_status === 'inactive_client' ||
      c.lead_status === 'dead_lead'
  );
  return <QualiaClientsView clients={clients} />;
}

function ClientTableSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-6 lg:p-8">
      <div className="flex items-center gap-2">
        {[64, 80, 80].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" style={{ width: `${w}px` }} />
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-11 w-full sm:max-w-sm sm:flex-1" />
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-36" />
      </div>
      <div className="elevation-1 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center border-b border-border/40 bg-muted/30 px-4 py-3">
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
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
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
  if (role !== 'admin') redirect('/');

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<ClientTableSkeleton />}>
        <ClientListLoader />
      </Suspense>
    </div>
  );
}
