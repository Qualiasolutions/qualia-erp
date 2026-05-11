import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { isUserAdmin } from '@/app/actions/shared';
import {
  loadOverviewTab,
  loadTeamTab,
  loadFinanceTab,
  loadSystemTab,
  loadClientsTab,
  loadBillingTab,
  loadIntegrationsTab,
  resolveControlTab,
  type ControlTab,
  type OverviewPayload,
  type TeamPayload,
  type FinancePayload,
  type SystemPayload,
  type ClientsPayload,
  type BillingPayload,
  type IntegrationsPayload,
} from '@/app/actions/admin-control';
import { QualiaControl, type QualiaControlData } from '@/components/portal/qualia-control';

export const metadata: Metadata = {
  title: 'Dashboard | Qualia',
  description: 'Admin dashboard — pulse, team, finance, system',
};

function ControlSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-muted/30 px-6 pt-8 lg:px-8">
        <div>
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-9 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-6 flex gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="h-1" />
        </div>
      </div>
      <div className="w-full p-6 lg:p-8">
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
  if (!profile || !(await isUserAdmin(user.id))) redirect('/dashboard');

  // Finance tab is admin-visible (back from owner-only gate).
  const canViewFinance = true;

  const data: QualiaControlData = {};
  switch (tab) {
    case 'overview': {
      const overview: OverviewPayload = await loadOverviewTab();
      data.overview = overview;
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
    case 'reports': {
      data.reports = true;
      break;
    }
    case 'clients': {
      const clients: ClientsPayload = await loadClientsTab();
      data.clients = clients;
      break;
    }
    case 'billing': {
      const billing: BillingPayload = await loadBillingTab();
      data.billing = billing;
      break;
    }
    case 'integrations': {
      const integrations: IntegrationsPayload = await loadIntegrationsTab();
      data.integrations = integrations;
      break;
    }
  }

  return <QualiaControl initialTab={tab} data={data} canViewFinance={canViewFinance} />;
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
