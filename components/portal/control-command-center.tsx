'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cog,
  FileText,
  Flag,
  TrendingDown,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

import { cn } from '@/lib/utils';
import type { CommandCenterPayload } from '@/app/actions/admin-control';

/* ======================================================================
   Helpers
   ====================================================================== */

function initials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function shortName(name: string | null): string {
  if (!name) return '—';
  const parts = name.split(/\s+/);
  return parts[0] ?? name;
}

function fmtMoney(amount: number, currency: string): string {
  const code = currency || 'EUR';
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${Math.round(amount)}`;
  }
}

function healthDot(health: 'green' | 'amber' | 'red' | 'unknown'): string {
  switch (health) {
    case 'green':
      return 'bg-emerald-500';
    case 'amber':
      return 'bg-amber-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/40';
  }
}

function healthLabel(health: 'green' | 'amber' | 'red' | 'unknown'): string {
  switch (health) {
    case 'green':
      return 'On track';
    case 'amber':
      return 'At risk';
    case 'red':
      return 'Overdue';
    default:
      return 'No date';
  }
}

/* ======================================================================
   Section frame
   ====================================================================== */

function Section({
  title,
  badge,
  icon: Icon,
  children,
}: {
  title: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
        </div>
        {badge ? (
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Group({
  title,
  count,
  children,
  emptyText,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  emptyText?: string;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="px-4 pb-3 pt-0 text-[11px] italic text-muted-foreground">
          {emptyText ?? 'Nothing here.'}
        </p>
      ) : (
        <ul className="flex flex-col">{children}</ul>
      )}
    </div>
  );
}

function Row({
  href,
  children,
  severity = 'neutral',
}: {
  href?: string;
  children: React.ReactNode;
  severity?: 'neutral' | 'amber' | 'red';
}) {
  const tone =
    severity === 'red'
      ? 'hover:bg-red-500/[0.05]'
      : severity === 'amber'
        ? 'hover:bg-amber-500/[0.05]'
        : 'hover:bg-muted/50';
  const content = (
    <div className="flex items-center gap-3 border-t border-dashed border-border px-4 py-2.5 transition-colors first:border-t-0">
      {children}
    </div>
  );
  if (!href) return <li className={cn('cursor-default', tone)}>{content}</li>;
  return (
    <li>
      <Link href={href} className={cn('block transition-colors', tone)}>
        {content}
      </Link>
    </li>
  );
}

/* ======================================================================
   TODAY column
   ====================================================================== */

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function TodayColumn({ data }: { data: CommandCenterPayload['today'] }) {
  const total = data.clockedIn.length + data.notIn.length + data.doneToday.length;
  return (
    <Section title="Today" icon={UserCheck} badge={`${data.clockedIn.length}/${total} in`}>
      <Group
        title="Clocked in"
        count={data.clockedIn.length}
        emptyText="No one is clocked in right now."
      >
        {data.clockedIn.map((row) => {
          const overrun =
            row.plannedDurationMin != null && row.elapsedMin > row.plannedDurationMin + 15;
          return (
            <Row
              key={row.id}
              href={`/admin/attendance?session=${row.id}`}
              severity={overrun ? 'amber' : 'neutral'}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                aria-hidden
              >
                {initials(row.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="truncate font-semibold">{shortName(row.name)}</span>
                  {row.projectName ? (
                    <span className="truncate text-muted-foreground">· {row.projectName}</span>
                  ) : (
                    <span className="text-muted-foreground">· no project</span>
                  )}
                </div>
                {row.clockInNote ? (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    “{row.clockInNote}”
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  'shrink-0 font-mono text-[10px] tabular-nums',
                  overrun ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                )}
              >
                {row.elapsedMin}m{row.plannedDurationMin ? `/${row.plannedDurationMin}m` : ''}
              </span>
            </Row>
          );
        })}
      </Group>

      <Group
        title="Done today"
        count={data.doneToday.length}
        emptyText="No one has clocked out yet today."
      >
        {data.doneToday.map((row) => (
          <Row key={row.id} href={`/admin/attendance?profile=${row.id}`} severity="neutral">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
              aria-hidden
            >
              {initials(row.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate font-semibold">{shortName(row.name)}</span>
                {row.projectName ? (
                  <span className="truncate text-muted-foreground">· {row.projectName}</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Out at {fmtTimeShort(row.lastEndedAt)} · {fmtDuration(row.totalMinutes)} today
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
              done
            </span>
          </Row>
        ))}
      </Group>

      <Group title="Not in yet" count={data.notIn.length} emptyText="Whole team is clocked in.">
        {data.notIn.map((row) => (
          <Row key={row.id} href={`/team`} severity="neutral">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
              aria-hidden
            >
              {initials(row.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {row.name ?? 'Unknown'}
            </span>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
              not in
            </span>
          </Row>
        ))}
      </Group>

      <Group
        title="Today's reports"
        count={data.todaysReports.length}
        emptyText="No reports submitted today."
      >
        {data.todaysReports.map((r) => {
          const verifBad = r.verification === 'fail';
          return (
            <Row
              key={r.id}
              href={`/admin/reports?tab=framework&id=${r.id}`}
              severity={verifBad ? 'amber' : 'neutral'}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="truncate font-semibold">{r.projectName}</span>
                  {r.tasksTotal != null && r.tasksTotal > 0 ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {r.tasksDone ?? 0}/{r.tasksTotal}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {r.submittedBy ?? '—'} · {r.status}
                  {verifBad ? ' · verification failed' : ''}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {formatDistanceToNowStrict(new Date(r.submittedAt), { addSuffix: false })}
              </span>
            </Row>
          );
        })}
      </Group>

      <Group
        title="Open blockers"
        count={data.blockers.length}
        emptyText="No open blockers from session reports."
      >
        {data.blockers.map((b) => (
          <Row key={b.id} href={`/admin/reports?tab=framework&id=${b.id}`} severity="red">
            <Flag className="size-3.5 shrink-0 text-red-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate font-semibold">{b.projectName}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-red-600 dark:text-red-400">
                  ×{b.gapCycles}
                </span>
              </div>
              {b.notes ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{b.notes}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatDistanceToNowStrict(new Date(b.submittedAt), { addSuffix: false })}
            </span>
          </Row>
        ))}
      </Group>
    </Section>
  );
}

/* ======================================================================
   THIS MONTH column
   ====================================================================== */

function MonthColumn({ data }: { data: CommandCenterPayload['thisMonth'] }) {
  return (
    <Section title="This month" icon={Clock} badge={`${data.summary.total} active`}>
      <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
        <SummaryCell label="On track" value={data.summary.onTrack} tone="emerald" />
        <SummaryCell label="At risk" value={data.summary.atRisk} tone="amber" />
        <SummaryCell label="Overdue" value={data.summary.overdue} tone="red" />
      </div>

      {data.projects.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs italic text-muted-foreground">
          No active projects.
        </p>
      ) : (
        <ul className="flex flex-col">
          {data.projects.map((p) => {
            const severity =
              p.health === 'red' ? 'red' : p.health === 'amber' ? 'amber' : 'neutral';
            return (
              <Row key={p.id} href={`/projects/${p.id}`} severity={severity}>
                <span
                  className={cn('size-2 shrink-0 rounded-full', healthDot(p.health))}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="truncate font-semibold">{p.name}</span>
                    {p.clientName ? (
                      <span className="truncate text-muted-foreground">· {p.clientName}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {healthLabel(p.health)}
                    {p.targetDate ? (
                      <>
                        {' '}
                        · due{' '}
                        <span className="font-mono tabular-nums">
                          {new Date(p.targetDate).toLocaleDateString('en-IE', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {p.daysToTarget != null
                          ? p.daysToTarget < 0
                            ? ` (${Math.abs(p.daysToTarget)}d late)`
                            : p.daysToTarget === 0
                              ? ' (today)'
                              : ` (${p.daysToTarget}d)`
                          : ''}
                      </>
                    ) : (
                      ' · no deadline'
                    )}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {p.progress}%
                </span>
              </Row>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';
  return (
    <div className="flex flex-col items-center gap-0.5 bg-card px-3 py-3">
      <span className={cn('font-mono text-lg font-semibold tabular-nums leading-none', toneClass)}>
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/* ======================================================================
   MONEY & RISK column
   ====================================================================== */

function MoneyRiskColumn({ data }: { data: CommandCenterPayload['moneyRisk'] }) {
  const totalOverdueAmount = data.overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  return (
    <Section
      title="Money & risk"
      icon={Wallet}
      badge={
        data.overdueInvoices.length > 0
          ? fmtMoney(totalOverdueAmount, data.overdueInvoices[0]?.currency ?? 'EUR')
          : undefined
      }
    >
      <Group
        title="Overdue invoices"
        count={data.overdueInvoices.length}
        emptyText="Nothing overdue. Nice."
      >
        {data.overdueInvoices.map((inv) => (
          <Row
            key={inv.id}
            href={inv.pdfUrl ?? `/admin?tab=finance`}
            severity={inv.daysOverdue > 14 ? 'red' : 'amber'}
          >
            <FileText
              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate font-semibold">{inv.customerName}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  #{inv.invoiceNumber}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{inv.daysOverdue}d overdue</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground">
              {fmtMoney(inv.balance, inv.currency)}
            </span>
          </Row>
        ))}
      </Group>

      <Group
        title="No deadline"
        count={data.projectsNoDeadline.length}
        emptyText="Every active project has a target date."
      >
        {data.projectsNoDeadline.map((p) => (
          <Row key={p.id} href={`/projects/${p.id}`} severity="amber">
            <TrendingDown
              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate font-semibold">{p.name}</span>
                {p.clientName ? (
                  <span className="truncate text-muted-foreground">· {p.clientName}</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Set a delivery date.</p>
            </div>
          </Row>
        ))}
      </Group>

      <Group
        title="Stale client actions"
        count={data.staleClientActions.length}
        emptyText="No stale actions waiting on clients."
      >
        {data.staleClientActions.map((a) => (
          <Row key={a.id} href={`/admin?tab=team`} severity={a.daysStale > 14 ? 'red' : 'amber'}>
            <AlertTriangle
              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate font-semibold">{a.title}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {[a.clientName, a.projectName].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {a.daysStale}d
            </span>
          </Row>
        ))}
      </Group>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Hours logged this month
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {data.unbilledHours.totalHours.toFixed(1)}h
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Across {data.unbilledHours.sessionCount} session
          {data.unbilledHours.sessionCount === 1 ? '' : 's'}.
        </p>
      </div>
    </Section>
  );
}

/* ======================================================================
   Public component
   ====================================================================== */

export const CommandCenter = memo(function CommandCenter({ data }: { data: CommandCenterPayload }) {
  const totalIssues =
    data.today.blockers.length +
    data.thisMonth.summary.atRisk +
    data.thisMonth.summary.overdue +
    data.moneyRisk.overdueInvoices.length +
    data.moneyRisk.projectsNoDeadline.length +
    data.moneyRisk.staleClientActions.length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-semibold tracking-tight">Command center</h2>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            updated {new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {totalIssues === 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden />
            All clear
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <Cog className="size-3.5" aria-hidden />
            {totalIssues} item{totalIssues === 1 ? '' : 's'} to handle
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodayColumn data={data.today} />
        <MonthColumn data={data.thisMonth} />
        <MoneyRiskColumn data={data.moneyRisk} />
      </div>
    </div>
  );
});
