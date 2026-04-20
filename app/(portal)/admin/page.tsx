import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import {
  loadOverviewTab,
  loadClientsTab,
  loadTeamTab,
  loadFinanceTab,
  loadSystemTab,
  resolveControlTab,
  type ControlTab,
  type OverviewPayload,
  type ClientsPayload,
  type TeamPayload,
  type FinancePayload,
  type SystemPayload,
} from '@/app/actions/admin-control';
import { QualiaControl, type QualiaControlData } from '@/components/portal/qualia-control';

export const metadata: Metadata = {
  title: 'Control | Qualia',
  description: 'Admin console — pulse, clients, team, finance, system',
};

function ControlSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-muted/30 px-6 pt-8 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-9 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-6 flex gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="h-1" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function ControlLoader({ tab }: { tab: ControlTab }) {
  await connection();
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (!profile || !(await isUserAdmin(user.id))) redirect('/');

  const data: QualiaControlData = {};
  switch (tab) {
    case 'overview': {
      const overview: OverviewPayload = await loadOverviewTab();
      data.overview = overview;
      break;
    }
    case 'clients': {
      const clients: ClientsPayload = await loadClientsTab();
      data.clients = clients;
      break;
    }
    case 'team': {
      const team: TeamPayload = await loadTeamTab();
      data.team = team;
      break;
    }
    case 'finance': {
      const finance: FinancePayload = await loadFinanceTab();
      data.finance = finance;
      break;
    }
    case 'system': {
      const system: SystemPayload = await loadSystemTab();
      data.system = system;
      break;
    }
  }

  return <QualiaControl initialTab={tab} data={data} />;
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminControlPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = resolveControlTab(params.tab);

  return (
    <Suspense fallback={<ControlSkeleton />}>
      <ControlLoader tab={tab} />
    </Suspense>
  );
}
