import { Suspense } from 'react';
import { connection } from 'next/server';
import { getClients } from '@/app/actions';
import { ClientList, type Client } from '@/components/client-list';
import { NewClientModal } from '@/components/new-client-modal';
import { Building2 } from 'lucide-react';

async function ClientListLoader() {
  await connection();
  const data = await getClients();

  // Only show clients (active_client, inactive_client, dead_lead), not leads
  const clients = (data as Client[]).filter(
    (c) =>
      c.lead_status === 'active_client' ||
      c.lead_status === 'inactive_client' ||
      c.lead_status === 'dead_lead'
  );

  return <ClientList clients={clients} />;
}

function ClientListSkeleton() {
  const CardSkeleton = () => (
    <div className="surface flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 space-y-1">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />

      {/* Columns skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
        {/* Inactive column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <Building2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Clients</h1>
            <p className="text-xs text-muted-foreground">Manage your clients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NewClientModal />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<ClientListSkeleton />}>
          <ClientListLoader />
        </Suspense>
      </div>
    </div>
  );
}
