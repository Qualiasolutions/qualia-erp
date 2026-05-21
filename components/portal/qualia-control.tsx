'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

import type {
  ControlTab,
  OverviewPayload,
  TeamPayload,
  FinancePayload,
  SystemPayload,
} from '@/app/actions/admin-control';
import type { BillableClient } from '@/app/actions/invoice-generation';

import { ControlTeam } from './control-team';
import { ControlFinance } from './control-finance';
import { ControlSystem } from './control-system';
import { ControlOverviewTab } from './control-overview';

/* ======================================================================
   Types
   ====================================================================== */

export interface QualiaControlData {
  overview?: OverviewPayload;
  team?: TeamPayload;
  finance?: FinancePayload;
  system?: SystemPayload;
  billableClients?: BillableClient[];
}

interface QualiaControlProps {
  initialTab: ControlTab;
  data: QualiaControlData;
  /** When false, the Finance section is hidden. Server still enforces. */
  canViewFinance?: boolean;
}

const SECTION_META: Record<ControlTab, { eyebrow: string; title: string; desc: string }> = {
  overview: {
    eyebrow: 'Admin console',
    title: 'Dashboard',
    desc: 'What needs your attention right now.',
  },
  team: {
    eyebrow: 'Admin console',
    title: 'Team',
    desc: 'People, capacity, roles.',
  },
  finance: {
    eyebrow: 'Admin console',
    title: 'Finance',
    desc: 'Invoices, MRR, expenses.',
  },
  system: {
    eyebrow: 'Admin console',
    title: 'System',
    desc: 'Integrations, audit, workspace.',
  },
};

/* ======================================================================
   Placeholder used by Task 1 scaffolding; replaced by Tasks 2-5
   ====================================================================== */

export function ControlTabPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <p className="text-sm italic text-muted-foreground">{label} — loading…</p>
    </div>
  );
}

/* ======================================================================
   Overview tab
   ====================================================================== */

const ControlOverview = memo(function ControlOverview({
  data,
  billableClients,
}: {
  data: OverviewPayload | undefined;
  billableClients?: BillableClient[];
}) {
  if (!data) return <ControlTabPlaceholder label="Dashboard" />;

  return <ControlOverviewTab data={data} billableClients={billableClients ?? []} />;
});

/* ======================================================================
   QualiaControl — shell
   ====================================================================== */

export function QualiaControl({ initialTab, data, canViewFinance = false }: QualiaControlProps) {
  const tab = initialTab;
  const meta = SECTION_META[tab];

  if (tab === 'finance' && !canViewFinance) {
    return (
      <div className="flex flex-col">
        <SectionHeader meta={SECTION_META.overview} />
        <div className="w-full p-6 lg:p-8">
          <p className="text-sm text-muted-foreground">
            Finance access is restricted. Contact the workspace owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SectionHeader meta={meta} />
      <div className="w-full p-6 lg:p-8">
        {tab === 'overview' && (
          <ControlOverview data={data.overview} billableClients={data.billableClients} />
        )}
        {tab === 'team' && <ControlTeam data={data.team} />}
        {tab === 'finance' && <ControlFinance data={data.finance} />}
        {tab === 'system' && (
          <ControlSystem
            data={data.system}
            emptyFallback={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="size-3.5" aria-hidden />
                System check idle.
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function PlanningHealth({ data }: { data: OverviewPayload['planningHealth'] }) {
  const rows = data.rows.filter((row) => row.count > 0);
  const hasIssues = data.totalIssues > 0;

  if (!hasIssues) {
    return (
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Planning health is clean
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No active projects, milestones, or open work items need deadline cleanup.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/[0.04]">
      <header className="flex flex-col gap-2 border-b border-amber-500/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Planning cleanup needed
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Missing deadlines and orphaned project work are now visible without using an unphased
              bucket.
            </p>
          </div>
        </div>
        <span className="bg-amber-500/12 shrink-0 rounded-md px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-300">
          {data.totalIssues} issue{data.totalIssues === 1 ? '' : 's'}
        </span>
      </header>

      <div className="grid grid-cols-1 divide-y divide-amber-500/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {rows.map((row) => (
          <Link
            key={row.key}
            href={row.href}
            className="group flex min-h-24 items-center gap-3 px-4 py-3 transition-colors hover:bg-amber-500/[0.06]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background font-mono text-sm font-semibold tabular-nums text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
              {row.count}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{row.label}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                {row.description}
              </span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ meta }: { meta: { eyebrow: string; title: string; desc: string } }) {
  return (
    <header className="border-b border-border bg-card/45 px-4 py-3 backdrop-blur-xl lg:px-6">
      <h1 className="sr-only">{meta.title}</h1>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {meta.eyebrow}
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <p className="truncate text-sm font-medium text-foreground">{meta.desc}</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {meta.title}
        </span>
      </div>
    </header>
  );
}

export { PlanningHealth };
