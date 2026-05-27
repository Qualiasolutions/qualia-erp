import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';

import {
  getPortalClientManagement,
  type MergedPortalClient,
} from '@/app/actions/client-portal/admin';
import { AdminPortalClientsView } from '@/components/portal/admin-portal-clients-view';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Portal Clients | Admin',
};

async function PortalClientsLoader() {
  await connection();
  const result = await getPortalClientManagement();

  if (!result.success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
          <p className="text-sm font-medium text-destructive">Could not load portal clients</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  const payload = result.data as {
    clients: MergedPortalClient[];
    totalActive: number;
    totalInactive: number;
  };

  return (
    <AdminPortalClientsView
      clients={payload.clients}
      totalActive={payload.totalActive}
      totalInactive={payload.totalInactive}
    />
  );
}

function PortalClientsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-[420px] max-w-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-[440px]">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid gap-3 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AdminPortalClientsPage() {
  return (
    <Suspense fallback={<PortalClientsSkeleton />}>
      <PortalClientsLoader />
    </Suspense>
  );
}
