'use client';

import type { ReactNode } from 'react';
import { memo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Github, Cloud, Database, Settings, Server, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  SystemPayload,
  IntegrationHealth,
  AuditLogEntry,
  FrameworkReportLite,
} from '@/app/actions/admin-control';

const SERVICE_META: Record<IntegrationHealth['service'], { icon: typeof Github; label: string }> = {
  github: { icon: Github, label: 'GitHub' },
  vercel: { icon: Cloud, label: 'Vercel' },
  supabase: { icon: Database, label: 'Supabase' },
  other: { icon: Settings, label: 'Other' },
};

const STATUS_TONE: Record<IntegrationHealth['status'], string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  down: 'bg-red-500',
};

const STATUS_LABEL: Record<IntegrationHealth['status'], string> = {
  ok: 'healthy',
  warn: 'stale',
  down: 'not connected',
};

/* ======================================================================
   ControlSystem
   ====================================================================== */

export function ControlSystem({
  data,
  emptyFallback,
}: {
  data: SystemPayload | undefined;
  emptyFallback?: ReactNode;
}) {
  if (!data) {
    return emptyFallback ? (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        {emptyFallback}
      </div>
    ) : (
      <EmptyState
        icon={Server}
        title="System data not loaded"
        description="Integration health and audit data will appear here."
        compact
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">System</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Integrations, audit log, framework reports.
        </p>
      </div>

      <IntegrationsHealthGrid integrations={data.integrations} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AuditLogTable entries={data.auditEntries} />
        <FrameworkReportsMini reports={data.frameworkReports} />
      </div>

      <SettingsShortcut />
    </div>
  );
}

/* ======================================================================
   IntegrationsHealthGrid
   ====================================================================== */

function IntegrationsHealthGrid({ integrations }: { integrations: IntegrationHealth[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {integrations.map((int) => {
        const meta = SERVICE_META[int.service];
        const Icon = meta.icon;
        return (
          <div
            key={int.service}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-5"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">{meta.label}</span>
                <span
                  className={cn('size-1.5 rounded-full', STATUS_TONE[int.status])}
                  aria-hidden
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {STATUS_LABEL[int.status]}
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {int.connected_count} {int.connected_count === 1 ? 'project' : 'projects'}
              </div>
              {int.last_sync_at ? (
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  synced {formatDistanceToNowStrict(new Date(int.last_sync_at))} ago
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ======================================================================
   AuditLogTable
   ====================================================================== */

const AuditLogTable = memo(function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Audit log</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Last {entries.length}
        </span>
      </header>
      {entries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit entries"
          description="Admin actions will appear here."
          compact
          minimal
        />
      ) : (
        <ul className="divide-y divide-dashed divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                {e.action_type.replace(/_/g, ' ')}
              </span>
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-medium text-foreground">{e.actor_name ?? 'Someone'}</span>
                {e.target_name ? (
                  <>
                    {' '}
                    <span className="text-muted-foreground">→</span>{' '}
                    <span className="text-foreground">{e.target_name}</span>
                  </>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {formatDistanceToNowStrict(new Date(e.created_at))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

/* ======================================================================
   FrameworkReportsMini
   ====================================================================== */

const FrameworkReportsMini = memo(function FrameworkReportsMini({
  reports,
}: {
  reports: FrameworkReportLite[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Framework reports</h3>
        <Link
          href="/admin/reports?tab=framework"
          className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary underline-offset-4 hover:underline"
        >
          View all →
        </Link>
      </header>
      {reports.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No session reports"
          description="Framework session reports will appear here."
          compact
          minimal
        />
      ) : (
        <ul className="divide-y divide-dashed divide-border">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
                {r.client_report_id ?? '—'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {r.project_name ?? 'Untitled'}
              </span>
              {r.total_phases != null ? (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {r.total_phases} phases
                </span>
              ) : null}
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {format(new Date(r.recorded_at), 'dd MMM')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

/* ======================================================================
   SettingsShortcut
   ====================================================================== */

function SettingsShortcut() {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Workspace settings</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Portal policies, notification defaults, custom domain.
          </p>
        </div>
        <Link
          href="/settings/integrations"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors duration-150 hover:border-primary/40 hover:text-primary"
        >
          Open settings →
        </Link>
      </div>
    </section>
  );
}
