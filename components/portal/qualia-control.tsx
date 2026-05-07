'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  ControlTab,
  OverviewPayload,
  TeamPayload,
  FinancePayload,
  SystemPayload,
} from '@/app/actions/admin-control';

import { ControlTeam } from './control-team';
import { ControlFinance } from './control-finance';
import { ControlReports } from './control-reports';
import { ControlSystem } from './control-system';
import { CommandCenter } from './control-command-center';

/* ======================================================================
   Types
   ====================================================================== */

export interface QualiaControlData {
  overview?: OverviewPayload;
  team?: TeamPayload;
  finance?: FinancePayload;
  system?: SystemPayload;
}

interface QualiaControlProps {
  initialTab: ControlTab;
  data: QualiaControlData;
  /** When false, the Finance tab is hidden in the UI. Server still enforces. */
  canViewFinance?: boolean;
}

const ALL_TABS: Array<{ id: ControlTab; label: string; desc: string }> = [
  { id: 'overview', label: 'Dashboard', desc: 'Today, project risk, and this week' },
  { id: 'team', label: 'Team', desc: 'People, capacity, roles' },
  { id: 'finance', label: 'Finance', desc: 'Invoices, MRR, expenses' },
  { id: 'reports', label: 'Reports', desc: 'Team performance · weekly lens' },
  { id: 'system', label: 'System', desc: 'Integrations, audit, workspace' },
];

const STORAGE_KEY = 'qualia.control.tab';

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
}: {
  data: OverviewPayload | undefined;
}) {
  if (!data) return <ControlTabPlaceholder label="Dashboard" />;

  return (
    <div className="flex flex-col gap-6">
      {/* Daily overview for the main admin dashboard. */}
      <CommandCenter data={data.commandCenter} />

      {/* Planning health — orphan deadlines / missing dates */}
      <PlanningHealth data={data.planningHealth} />

      {/* Pulse: this week + recent completions (secondary) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight">This week</h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Last 7 days
            </span>
          </header>
          <dl className="flex flex-col gap-2">
            {data.week.map((w) => (
              <div
                key={w.label}
                className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-b-0 last:pb-0"
              >
                <dt className="text-xs text-muted-foreground">{w.label}</dt>
                <dd
                  className={cn(
                    'font-mono text-sm font-semibold tabular-nums',
                    w.kind === 'ok' && 'text-emerald-600 dark:text-emerald-400',
                    w.kind === 'accent' && 'text-primary',
                    w.kind === 'warn' && 'text-amber-600 dark:text-amber-400',
                    w.kind === 'neutral' && 'text-foreground'
                  )}
                >
                  {w.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Latest task completions</h3>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Live
            </span>
          </header>
          {data.activity.length === 0 ? (
            <p className="py-4 text-center text-xs italic text-muted-foreground">
              No tasks completed yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {data.activity.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-dashed border-border py-2 last:border-b-0"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {(a.actor_name ?? '??')
                      .split(/\s+/)
                      .map((p) => p.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">
                      <span className="font-semibold text-foreground">
                        {a.actor_name ?? 'Someone'}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {a.action_type.replace(/_/g, ' ')}
                      </span>
                      {a.target_name ? (
                        <>
                          {' '}
                          <span className="text-foreground">{a.target_name}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(a.created_at), { addSuffix: false })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
});

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
              No active projects, phases, or open tasks need deadline cleanup.
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

/* ======================================================================
   QualiaControl — shell
   ====================================================================== */

export function QualiaControl({ initialTab, data, canViewFinance = false }: QualiaControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ControlTab>(initialTab);

  // Filter out tabs the current user can't see. The Finance tab is owner-only.
  const TABS = useMemo(
    () => ALL_TABS.filter((t) => t.id !== 'finance' || canViewFinance),
    [canViewFinance]
  );

  // On mount, honor localStorage if URL didn't specify.
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== tab && TABS.some((t) => t.id === stored)) {
        setTab(stored as ControlTab);
        router.replace(`?tab=${stored}`, { scroll: false });
      }
    } catch {
      /* ignore storage failures */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTab = useCallback(
    (next: ControlTab) => {
      setTab(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      router.replace(`?tab=${next}`, { scroll: false });
    },
    [router]
  );

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  /* Arrow-key handler for roving tabindex (WAI-ARIA Tabs pattern) */
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = TABS.findIndex((t) => t.id === tab);
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        changeTab(nextTab.id);
        document.getElementById(`tab-${nextTab.id}`)?.focus();
      }
    },
    [tab, changeTab, TABS]
  );

  return (
    <div className="flex flex-col">
      <header className="border-b border-border bg-muted/30 px-6 pt-8 lg:px-8">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Admin console
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeTab.desc}</p>
            </div>
          </div>
          <nav
            role="tablist"
            aria-label="Dashboard tabs"
            className="mt-6 flex items-center gap-6 overflow-x-auto"
          >
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`tabpanel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => changeTab(t.id)}
                  onKeyDown={handleTabKeyDown}
                  className={cn(
                    'relative whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors duration-150',
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="w-full p-6 lg:p-8"
      >
        {tab === 'overview' && <ControlOverview data={data.overview} />}
        {tab === 'team' && <ControlTeam data={data.team} />}
        {tab === 'finance' && canViewFinance && <ControlFinance data={data.finance} />}
        {tab === 'reports' && <ControlReports />}
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
