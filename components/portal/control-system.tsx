'use client';

import type { ReactNode } from 'react';
import { memo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, CheckCircle2, Rocket, Server } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import type {
  SystemPayload,
  AuditLogEntry,
  FrameworkReportCompleteness,
  FrameworkReportLite,
} from '@/app/actions/admin-control';
import { ApiTokensPanel } from './api-tokens-panel';

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
          Recent deploys, framework reports, API tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AuditLogTable entries={data.auditEntries} />
        <FrameworkReportsMini reports={data.frameworkReports} />
      </div>

      <FrameworkCompletenessPanel stats={data.frameworkCompleteness} />

      <ApiTokensPanel profiles={data.tokenAssignableProfiles} />
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
        <h3 className="text-sm font-semibold tracking-tight">Recent deploys</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Last {entries.length}
        </span>
      </header>
      {entries.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deploys yet"
          description="Production deploys will appear here."
          compact
          minimal
        />
      ) : (
        <ul className="divide-y divide-dashed divide-border">
          {entries.map((e) => {
            const action = e.action_type.replace(/_/g, ' ');
            const isFail = action.startsWith('deploy ') && action !== 'deployed';
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2">
                <span
                  className={
                    'rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider ' +
                    (isFail
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')
                  }
                >
                  {action}
                </span>
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-medium text-foreground">
                    {e.target_name ?? 'Unknown project'}
                  </span>
                  {e.actor_name ? (
                    <>
                      {' '}
                      <span className="text-muted-foreground">·</span>{' '}
                      <span className="text-muted-foreground">{e.actor_name}</span>
                    </>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(e.created_at))}
                </span>
              </li>
            );
          })}
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
   FrameworkCompletenessPanel
   ====================================================================== */

const FrameworkCompletenessPanel = memo(function FrameworkCompletenessPanel({
  stats,
}: {
  stats: FrameworkReportCompleteness;
}) {
  const hasGaps = stats.checkedReports > stats.completeReports;
  const gaps = [
    { label: 'Client ID missing', value: stats.missingClientId },
    { label: 'Framework version missing', value: stats.missingFrameworkVersion },
    { label: 'QS report ID missing', value: stats.missingClientReportId },
    { label: 'Framework project ID missing', value: stats.missingFrameworkProjectId },
    { label: 'Team ID missing', value: stats.missingTeamId },
    { label: 'Not per-user token', value: stats.nonPerUserTokenAuth },
  ].filter((gap) => gap.value > 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {hasGaps ? (
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">Framework report completeness</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last {stats.checkedReports} production reports checked for ERP linkage and token
              hygiene.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {stats.score}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {stats.completeReports}/{stats.checkedReports} complete
          </div>
        </div>
      </header>

      {stats.checkedReports === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">
          No production framework reports found yet.
        </p>
      ) : gaps.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">
          The latest reports include client, framework version, stable project/team IDs, report ID,
          and per-user token auth.
        </p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {gaps.map((gap) => (
            <div key={gap.label} className="px-4 py-3">
              <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {gap.value}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{gap.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});
