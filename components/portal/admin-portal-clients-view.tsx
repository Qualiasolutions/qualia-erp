'use client';

import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock3, FolderKanban, Search, UserRoundCheck, Users, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getInitials } from '@/lib/utils';
import type { MergedPortalClient } from '@/app/actions/client-portal/admin';

type StatusFilter = 'all' | 'active' | 'inactive' | 'needs_attention';

interface AdminPortalClientsViewProps {
  clients: MergedPortalClient[];
  totalActive: number;
  totalInactive: number;
}

export function AdminPortalClientsView({
  clients,
  totalActive,
  totalInactive,
}: AdminPortalClientsViewProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (status === 'active' && !client.isActive) return false;
      if (status === 'inactive' && client.isActive) return false;
      if (status === 'needs_attention' && client.openRequestCount === 0) return false;
      if (!q) return true;
      const text = `${client.full_name ?? ''} ${client.email ?? ''} ${client.projects
        .map((project) => project.name)
        .join(' ')}`.toLowerCase();
      return text.includes(q);
    });
  }, [clients, query, status]);

  const openRequests = clients.reduce((sum, client) => sum + client.openRequestCount, 0);
  const linkedProjects = clients.reduce((sum, client) => sum + client.projects.length, 0);
  const hasFilters = status !== 'all' || query.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-4 shadow-elevation-1 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="sr-only">Client command center</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Registered portal clients
            </span>
            <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Login accounts, linked projects, and open client requests in one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[440px]">
          <SummaryTile label="Active" value={totalActive} icon={UserRoundCheck} tone="primary" />
          <SummaryTile label="Inactive" value={totalInactive} icon={Clock3} />
          <SummaryTile label="Open requests" value={openRequests} icon={FolderKanban} tone="warn" />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search client, email, project..."
            aria-label="Search portal clients"
            className="h-10 rounded-lg bg-card pl-9"
          />
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-muted/35 p-1"
          role="group"
          aria-label="Filter clients"
        >
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['needs_attention', 'Needs attention'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value as StatusFilter)}
              aria-pressed={status === value}
              className={cn(
                'h-8 rounded-md px-3 text-xs font-medium transition-colors',
                status === value
                  ? 'bg-background text-foreground shadow-elevation-1'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
            className="gap-1.5"
          >
            <X className="size-3.5" />
            Reset
          </Button>
        )}
        <p className="ml-auto font-mono text-[11px] text-muted-foreground">
          {filtered.length} / {clients.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <Users className="size-10 text-muted-foreground/30" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">No portal clients match</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear the filters to return to the full registry.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/25 hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <div className="flex items-start gap-4">
                <Avatar className="size-12 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(client.full_name || client.email || 'Client')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                        {client.full_name || 'Unnamed client'}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.email || 'No email'}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-6 rounded-full px-2 text-[10px]',
                        client.isActive
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {client.isActive ? 'Active login' : 'Inactive login'}
                    </Badge>
                    <Badge variant="outline" className="h-6 rounded-full px-2 text-[10px]">
                      {client.openRequestCount} open / {client.requestCount} total requests
                    </Badge>
                    <Badge variant="outline" className="h-6 rounded-full px-2 text-[10px]">
                      {client.projects.length} projects
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.projects.slice(0, 4).map((project) => (
                      <span
                        key={project.id}
                        className="inline-flex max-w-[220px] items-center gap-2 rounded-lg border border-border/70 bg-muted/25 px-2 py-1 text-xs text-muted-foreground"
                      >
                        <Avatar className="size-5 rounded-md">
                          {project.logo_url && (
                            <AvatarImage src={project.logo_url} alt="" className="object-cover" />
                          )}
                          <AvatarFallback className="rounded-md text-[8px]">
                            {getInitials(project.name, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{project.name}</span>
                        {project.status && (
                          <span className="shrink-0 text-[10px] text-muted-foreground/70">
                            {project.status}
                          </span>
                        )}
                      </span>
                    ))}
                    {client.projects.length > 4 && (
                      <span className="inline-flex items-center rounded-lg bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                        +{client.projects.length - 4} more
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Last login{' '}
                    {client.lastSignIn ? formatShortDate(client.lastSignIn) : 'not recorded'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="font-mono text-[11px] text-muted-foreground">
        {linkedProjects} linked project access records across {clients.length} registered accounts.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'primary' | 'warn';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            'size-3.5',
            tone === 'primary'
              ? 'text-primary'
              : tone === 'warn'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          )}
        />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
