'use client';

import { memo, useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Building2 } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import type { ClientsPayload, ClientSummaryRow } from '@/app/actions/admin-control';
import { EmptyState } from '@/components/ui/empty-state';

/* ======================================================================
   ControlClients — admin-eye directory
   ====================================================================== */

export function ControlClients({ data }: { data: ClientsPayload | undefined }) {
  const clients = useMemo(() => data?.clients ?? [], [data]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    if (!deferredQuery) return clients;
    const q = deferredQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.username ?? '').toLowerCase().includes(q)
    );
  }, [clients, deferredQuery]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Clients</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {clients.length} total &middot;{' '}
            {clients.filter((c) => c.active_project_count > 0).length} with active projects
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 focus-within:border-primary/40">
          <Search className="size-3.5 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-52 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            aria-label="Search clients"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={clients.length === 0 ? 'No clients yet' : 'No matching clients'}
          description={
            clients.length === 0
              ? 'Clients will appear here once added.'
              : 'Try adjusting your search query.'
          }
          compact
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className="grid items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
            style={{ gridTemplateColumns: '16px 1.5fr 120px 80px 80px 120px' }}
          >
            <span aria-hidden />
            <span>Client</span>
            <span>Status</span>
            <span className="text-right">Active</span>
            <span className="text-right">Total</span>
            <span className="text-right">Last activity</span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((row) => (
              <ClientRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   Subcomponents
   ====================================================================== */

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  prospect: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  churned: 'bg-muted text-muted-foreground',
  on_hold: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const ClientRow = memo(function ClientRow({ row }: { row: ClientSummaryRow }) {
  const hue = hueFromId(row.id);
  const statusKey = (row.lead_status || 'active').toLowerCase();
  const chipClass = STATUS_STYLES[statusKey] ?? 'bg-muted text-muted-foreground';

  return (
    <li>
      <Link
        href={`/clients/${row.id}`}
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors duration-150',
          'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
        )}
        style={{ gridTemplateColumns: '16px 1.5fr 120px 80px 80px 120px' }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          aria-hidden
          style={{ background: clientAccent(hue, 55, 0.14) }}
        />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.name || '—'}</div>
          {row.email ? (
            <div className="truncate text-[11px] text-muted-foreground">{row.email}</div>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
            chipClass
          )}
        >
          {statusKey.replace(/_/g, ' ')}
        </span>
        <span className="text-right font-mono text-xs tabular-nums text-foreground">
          {row.active_project_count}
        </span>
        <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
          {row.project_count}
        </span>
        <span className="text-right font-mono text-[11px] text-muted-foreground">
          {row.last_activity ? format(new Date(row.last_activity), 'dd MMM') : '—'}
        </span>
      </Link>
    </li>
  );
});
