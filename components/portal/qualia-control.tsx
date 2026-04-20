'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, Search, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type {
  ControlTab,
  OverviewPayload,
  ClientsPayload,
  TeamPayload,
  FinancePayload,
  SystemPayload,
} from '@/app/actions/admin-control';

import { ControlClients } from './control-clients';
import { ControlTeam } from './control-team';
import { ControlFinance } from './control-finance';
import { ControlSystem } from './control-system';

/* ======================================================================
   Types
   ====================================================================== */

export interface QualiaControlData {
  overview?: OverviewPayload;
  clients?: ClientsPayload;
  team?: TeamPayload;
  finance?: FinancePayload;
  system?: SystemPayload;
}

interface QualiaControlProps {
  initialTab: ControlTab;
  data: QualiaControlData;
}

const TABS: Array<{ id: ControlTab; label: string; desc: string }> = [
  { id: 'overview', label: 'Overview', desc: 'Pulse · health · this week' },
  { id: 'clients', label: 'Clients', desc: 'Directory & retainers' },
  { id: 'team', label: 'Team', desc: 'People, capacity, roles' },
  { id: 'finance', label: 'Finance', desc: 'Invoices, MRR, expenses' },
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
  if (!data) return <ControlTabPlaceholder label="Overview" />;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {k.label}
            </div>
            <div className="mt-2 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
              {k.value}
            </div>
            {k.delta ? (
              <div
                className={cn(
                  'mt-1.5 font-mono text-[11px] tabular-nums',
                  k.positive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {k.delta}
              </div>
            ) : (
              <div className="mt-1.5 h-[14px]" aria-hidden />
            )}
          </div>
        ))}
      </div>

      {/* This week + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <h3 className="text-sm font-semibold tracking-tight">Recent activity</h3>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Live
            </span>
          </header>
          {data.activity.length === 0 ? (
            <p className="py-4 text-center text-xs italic text-muted-foreground">
              No activity in the last 24h.
            </p>
          ) : (
            <ul className="flex flex-col">
              {data.activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-dashed border-border py-2 last:border-b-0"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
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

/* ======================================================================
   QualiaControl — shell
   ====================================================================== */

export function QualiaControl({ initialTab, data }: QualiaControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ControlTab>(initialTab);

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

  return (
    <div className="flex flex-col">
      <header className="border-b border-border bg-muted/30 px-6 pt-8 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Admin console
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
                Control
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeTab.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5" disabled>
                <Search className="size-3.5" aria-hidden />
                Audit log
              </Button>
              <Button size="sm" className="gap-1.5" disabled>
                <Plus className="size-3.5" aria-hidden />
                New…
              </Button>
            </div>
          </div>
          <nav className="mt-6 flex items-center gap-6 overflow-x-auto" aria-label="Control tabs">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTab(t.id)}
                  aria-current={active ? 'page' : undefined}
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

      <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-8">
        {tab === 'overview' && <ControlOverview data={data.overview} />}
        {tab === 'clients' && <ControlClients data={data.clients} />}
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
