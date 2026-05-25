'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  DeliveryExceptionRow,
  DeliveryPayload,
  DeliveryQueue,
  DeliverySeverity,
} from '@/app/actions/admin-control';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

function severityClass(severity: DeliverySeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400';
    case 'high':
      return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400';
    case 'medium':
      return 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400';
    case 'low':
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function formatDate(date: string | null): string {
  if (!date) return 'No date';
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' }).format(parsed);
}

function freshnessLabel(value: string | null): string {
  if (!value) return 'Missing';
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

function statusTone(row: DeliveryExceptionRow): string {
  if (row.severity === 'critical') return 'border-red-500/20 bg-red-500/[0.03]';
  if (row.severity === 'high') return 'border-amber-500/20 bg-amber-500/[0.03]';
  return 'border-border bg-card';
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'critical' | 'amber' | 'neutral' | 'good';
}) {
  const valueClass =
    tone === 'critical'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'good'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-foreground';

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('font-mono text-2xl font-semibold tabular-nums', valueClass)}>
          {value}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QueueCard({ queue }: { queue: DeliveryQueue }) {
  const visible = queue.rows.slice(0, 8);
  const overflow = queue.rows.length - visible.length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{queue.label}</h2>
            <Badge
              variant={queue.rows.length ? 'default' : 'outline'}
              className="h-5 px-1.5 text-[10px]"
            >
              {queue.rows.length}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{queue.description}</p>
        </div>
        {queue.rows.length > 0 ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
      </header>

      {visible.length === 0 ? (
        <div className="px-4 py-5 text-xs text-muted-foreground">No exceptions in this queue.</div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((row) => (
            <li key={`${queue.key}-${row.id}`}>
              <Link
                href={row.href}
                className={cn(
                  'group grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto]',
                  statusTone(row)
                )}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {row.projectName}
                    </span>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1',
                        severityClass(row.severity)
                      )}
                    >
                      {row.severity}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {row.detail}
                    {row.clientName ? ` - ${row.clientName}` : ''}
                    {row.employeeName ? ` - ${row.employeeName}` : ''}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {formatDate(row.deadlineDate)}
                    </span>
                    {row.nextCommand ? (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        {row.nextCommand}
                      </span>
                    ) : null}
                    {row.verification ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        verif {row.verification}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="flex items-center justify-end gap-2 text-xs font-medium text-primary">
                  Mission
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {overflow > 0 ? (
        <div className="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
          + {overflow} more
        </div>
      ) : null}
    </section>
  );
}

function DeliveryTable({ rows }: { rows: DeliveryExceptionRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Top exceptions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sorted by queue priority. Every row opens the project mission.
        </p>
      </header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="hidden lg:table-cell">Proof</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="hidden sm:table-cell">Next</TableHead>
            <TableHead className="w-[80px] text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 12).map((row) => (
            <TableRow key={`top-${row.id}`}>
              <TableCell>
                <div className="min-w-0">
                  <Link
                    href={row.href}
                    className="line-clamp-1 text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.projectName}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.detail}</p>
                </div>
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                report {freshnessLabel(row.lastReportAt)} / snapshot{' '}
                {freshnessLabel(row.snapshotGeneratedAt)}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatDate(row.deadlineDate)}
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-primary sm:table-cell">
                {row.nextCommand ?? 'Set packet'}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={row.href}
                  className="inline-flex items-center justify-end text-primary hover:underline"
                  aria-label={`Open mission for ${row.projectName}`}
                >
                  <ArrowRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function ControlDelivery({ data }: { data: DeliveryPayload | undefined }) {
  if (!data) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Delivery control is loading"
        description="Work-packet exceptions will appear here."
        compact
      />
    );
  }

  const topRows = data.queues.flatMap((queue) => queue.rows);
  const hasExceptions = data.summary.totalExceptions > 0;

  return (
    <div className="flex flex-col gap-6">
      <section
        className={cn(
          'rounded-lg border px-4 py-4',
          hasExceptions
            ? 'border-amber-500/20 bg-amber-500/[0.04]'
            : 'border-emerald-500/20 bg-emerald-500/[0.04]'
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {hasExceptions ? (
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Delivery exceptions
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Owner view for deadlines, assignments, work packets, Framework proof, and review.
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Updated {freshnessLabel(data.generatedAt)}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard
          label="Exceptions"
          value={data.summary.totalExceptions}
          detail="all queues"
          tone={data.summary.totalExceptions > 0 ? 'amber' : 'good'}
        />
        <SummaryCard
          label="Critical"
          value={data.summary.critical}
          detail="needs owner action"
          tone={data.summary.critical > 0 ? 'critical' : 'good'}
        />
        <SummaryCard
          label="Due soon"
          value={data.summary.dueSoon}
          detail="overdue, today, 3 days"
          tone={data.summary.dueSoon > 0 ? 'amber' : 'good'}
        />
        <SummaryCard
          label="Review"
          value={data.summary.waitingReview}
          detail="submitted by employees"
          tone={data.summary.waitingReview > 0 ? 'amber' : 'neutral'}
        />
        <SummaryCard
          label="Stale proof"
          value={data.summary.staleProof}
          detail="reports or snapshots"
          tone={data.summary.staleProof > 0 ? 'amber' : 'good'}
        />
      </section>

      <DeliveryTable rows={topRows} />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {data.queues.map((queue) => (
          <QueueCard key={queue.key} queue={queue} />
        ))}
      </section>

      <section className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <FileClock className="size-4 shrink-0" />
        <span>
          This screen uses ERP assignments and deadlines as the source of truth, then overlays
          Framework reports and snapshots as proof.
        </span>
      </section>
    </div>
  );
}
