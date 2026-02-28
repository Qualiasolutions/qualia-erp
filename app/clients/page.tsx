import { Suspense } from 'react';
import { getClients } from '@/app/actions';
import { ClientTableView } from '@/components/client-table-view';
import { NewClientModal } from '@/components/new-client-modal';
import { Building2 } from 'lucide-react';
import { type Client } from '@/lib/client-utils';

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
      {/* Stats skeleton */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-8 animate-pulse rounded bg-muted" />
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Filter skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border bg-secondary/50 px-4 py-3">
          <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
          >
            <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 bg-card/80 px-5 py-3.5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
            <Building2 className="h-3 w-3 text-emerald-500" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Clients</h1>
        </div>
        <div className="flex items-center gap-2">
          <NewClientModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <Suspense fallback={<ClientTableSkeleton />}>
          <ClientListLoader />
        </Suspense>
      </div>
    </div>
  );
}
