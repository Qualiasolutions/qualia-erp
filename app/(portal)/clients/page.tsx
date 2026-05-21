import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCachedUserRole } from '@/app/actions/shared';
import { getClients } from '@/app/actions';
import { getClientAccessDrift } from '@/app/actions/clients';
import { QualiaClientsView } from '@/components/portal/qualia-clients-view';
import { ClientAccessDriftBanner } from '@/components/clients/client-access-drift-banner';
import { type Client } from '@/lib/client-utils';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Clients' };

async function ClientListLoader() {
  const [data, drift] = await Promise.all([getClients(), getClientAccessDrift()]);
  // Only show clients (active_client, inactive_client, dead_lead), not leads
  const clients = (data as Client[]).filter(
    (c) =>
      c.lead_status === 'active_client' ||
      c.lead_status === 'inactive_client' ||
      c.lead_status === 'dead_lead'
  );
  return (
    <>
      {drift.authorized && drift.rows.length > 0 && (
        <div className="px-6 pt-6 lg:px-8">
          <ClientAccessDriftBanner rows={drift.rows} />
        </div>
      )}
      <QualiaClientsView clients={clients} />
    </>
  );
}

function ClientTableSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      <header className="rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_hsl(var(--border)/0.45)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex min-w-[160px] items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg bg-muted/50" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20 bg-muted/50" />
              <Skeleton className="h-3 w-24 bg-muted/40" />
            </div>
          </div>
          <Skeleton className="h-9 min-w-[220px] flex-1 rounded-lg bg-muted/45" />
          <Skeleton className="h-9 w-32 rounded-lg bg-muted/45" />
          <Skeleton className="h-9 w-36 rounded-lg bg-muted/45" />
          <Skeleton className="ml-auto h-9 w-28 rounded-lg bg-muted/50" />
        </div>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
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

  const role = await getCachedUserRole(user.id);
  if (role !== 'admin') redirect('/dashboard');

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<ClientTableSkeleton />}>
        <ClientListLoader />
      </Suspense>
    </div>
  );
}
