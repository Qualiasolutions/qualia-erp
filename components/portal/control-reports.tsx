'use client';

import { memo, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
  Loader2,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkline } from '@/components/ui/sparkline';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getReportsPerformance,
  type ReportsPerfPayload,
  type EmployeePerfRow,
  type ProjectPerfRow,
  type ReportFlag,
} from '@/app/actions/admin-control';

/* ======================================================================
   Helpers
   ====================================================================== */

function fmtWeekRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  end.setDate(end.getDate() - 1);
  return `${start.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}`;
}

function performanceTone(score: number | null): 'positive' | 'warning' | 'critical' | 'neutral' {
  if (score == null) return 'neutral';
  if (score >= 7.5) return 'positive';
  if (score >= 5.0) return 'warning';
  return 'critical';
}

function performanceColor(score: number | null): string {
  const tone = performanceTone(score);
  return tone === 'positive'
    ? 'text-emerald-700 dark:text-emerald-400'
    : tone === 'warning'
      ? 'text-amber-700 dark:text-amber-400'
      : tone === 'critical'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-muted-foreground';
}

function initials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/* ======================================================================
   ControlReports — performance lens
   ====================================================================== */

export function ControlReports() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mode, setMode] = useState<'employee' | 'project'>('employee');
  const [data, setData] = useState<ReportsPerfPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  /* eslint-disable react-hooks/set-state-in-effect -- async data fetch on filter change with cancellation guard */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReportsPerformance(weekOffset).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [weekOffset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Loading performance lens…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No reports yet"
        description="Once /qualia-report runs are submitted, the performance lens will populate here."
        compact
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header — week picker + view toggle + totals */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => setWeekOffset((o) => o - 1))}
            aria-label="Previous week"
            className="h-8"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <div className="min-w-[180px] text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Week of
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums">
              {fmtWeekRange(data.weekStartISO, data.weekEndISO)}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => setWeekOffset((o) => Math.min(0, o + 1)))}
            disabled={weekOffset >= 0}
            aria-label="Next week"
            className="h-8"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          {weekOffset !== 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTransition(() => setWeekOffset(0))}
              className="h-8 text-xs"
            >
              Today
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <Link
            href="/admin/reports?tab=framework"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-primary underline-offset-4 hover:underline"
          >
            All reports
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </header>

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Totals label="Sessions" value={data.totals.sessions} />
        <Totals label="Framework progress" value={data.totals.tasksDone} />
        <Totals
          label="Gap cycles"
          value={data.totals.gapCycles}
          tone={data.totals.gapCycles > 0 ? 'warning' : 'neutral'}
        />
        <Totals
          label="Verification fails"
          value={data.totals.verificationFails}
          tone={data.totals.verificationFails > 0 ? 'critical' : 'neutral'}
        />
      </div>

      {/* Flags this week */}
      {data.flags.length > 0 ? <FlagsCard flags={data.flags} /> : null}

      {/* Main content — employee or project view */}
      {mode === 'employee' ? (
        <EmployeeView rows={data.employees} />
      ) : (
        <ProjectView rows={data.projects} />
      )}
    </div>
  );
}

/* ======================================================================
   Mode toggle
   ====================================================================== */

function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'employee' | 'project';
  onChange: (m: 'employee' | 'project') => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {(['employee', 'project'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'rounded-sm px-3 py-1 text-xs font-medium capitalize transition-colors',
            mode === m
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Totals({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'critical';
}) {
  const valueClass =
    tone === 'warning'
      ? 'text-amber-700 dark:text-amber-400'
      : tone === 'critical'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', valueClass)}>
        {value}
      </div>
    </div>
  );
}

/* ======================================================================
   Flags card — Range "two-week lookback" pattern
   ====================================================================== */

const FLAG_META: Record<
  ReportFlag['reason'],
  { icon: typeof AlertTriangle; tone: string; label: string }
> = {
  stuck: {
    icon: AlertTriangle,
    tone: 'border-amber-500/30 bg-amber-500/[0.05]',
    label: 'Stuck',
  },
  verification_fail: {
    icon: Flag,
    tone: 'border-rose-500/30 bg-rose-500/[0.05]',
    label: 'Verification fail',
  },
  zero_progress: {
    icon: TrendingDown,
    tone: 'border-muted-foreground/30 bg-muted/30',
    label: 'No progress',
  },
};

const FlagsCard = memo(function FlagsCard({ flags }: { flags: ReportFlag[] }) {
  const groups: Record<ReportFlag['reason'], ReportFlag[]> = {
    stuck: [],
    verification_fail: [],
    zero_progress: [],
  };
  for (const f of flags) groups[f.reason].push(f);

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Flag className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Flags this week</h3>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {flags.length}
        </span>
      </header>
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {(Object.keys(groups) as ReportFlag['reason'][]).map((reason) => {
          const list = groups[reason];
          const meta = FLAG_META[reason];
          const Icon = meta.icon;
          return (
            <div key={reason} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                <h4 className="text-xs font-semibold tracking-tight">{meta.label}</h4>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {list.length}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground/70">None this week.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {list.slice(0, 4).map((f) => (
                    <li key={f.reportId}>
                      <Link
                        href={`/admin/reports?tab=framework&id=${f.reportId}`}
                        className={cn(
                          'block rounded-md border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-card',
                          meta.tone
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-foreground">
                            {f.submittedBy ?? 'Unknown'}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                            {f.projectName ?? '—'}
                          </span>
                        </div>
                        {f.notes ? (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                            {f.notes}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                  {list.length > 4 ? (
                    <li className="pl-2 font-mono text-[10px] text-muted-foreground/60">
                      +{list.length - 4} more…
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});

/* ======================================================================
   Employee view — 15Five Pulse pattern
   ====================================================================== */

function EmployeeView({ rows }: { rows: EmployeePerfRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No reports submitted this week"
        description="Once /qualia-report runs land for this week, performance metrics will appear here."
        compact
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.profileId ?? row.fullName ?? Math.random()}>
          <EmployeeCard row={row} />
        </li>
      ))}
    </ul>
  );
}

function EmployeeCard({ row }: { row: EmployeePerfRow }) {
  const indexClass = performanceColor(row.performanceIndex);
  const TrendIcon =
    row.performanceDelta == null
      ? null
      : row.performanceDelta > 0.1
        ? TrendingUp
        : row.performanceDelta < -0.1
          ? TrendingDown
          : null;
  const trendTone =
    row.performanceDelta != null && row.performanceDelta > 0.1
      ? 'text-emerald-700 dark:text-emerald-400'
      : row.performanceDelta != null && row.performanceDelta < -0.1
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-muted-foreground';
  const sparkTone =
    performanceTone(row.performanceIndex) === 'positive'
      ? 'positive'
      : performanceTone(row.performanceIndex) === 'critical'
        ? 'critical'
        : 'brand';

  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-card/80">
      <div className="flex items-start gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary"
          aria-hidden
        >
          {initials(row.fullName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h4 className="truncate text-sm font-semibold tracking-tight">
              {row.fullName ?? 'Unknown'}
            </h4>
            <span className="inline-flex items-baseline gap-1.5">
              <span
                className={cn(
                  'font-mono text-2xl font-semibold tabular-nums leading-none',
                  indexClass
                )}
              >
                {row.performanceIndex != null ? row.performanceIndex.toFixed(1) : '—'}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                / 10
              </span>
            </span>
            {TrendIcon && row.performanceDelta != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums',
                  trendTone
                )}
              >
                <TrendIcon className="size-3" aria-hidden />
                {row.performanceDelta > 0 ? '+' : ''}
                {row.performanceDelta.toFixed(1)} vs last wk
              </span>
            ) : null}
            {row.sparkline.length >= 2 ? (
              <Sparkline
                data={row.sparkline}
                tone={sparkTone}
                width={60}
                height={24}
                minPoints={2}
                fillArea={false}
              />
            ) : null}
            {row.currentStreak >= 3 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400">
                <Sparkles className="size-3" aria-hidden />
                {row.currentStreak} clean
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>
              <strong className="text-foreground">{row.sessions}</strong> session
              {row.sessions === 1 ? '' : 's'}
            </span>
            <span>
              progress{' '}
              <strong className="text-foreground">
                {row.tasksDone}/{row.tasksTotal}
              </strong>
              {row.completionPct != null ? (
                <span className="ml-1 text-muted-foreground/70">({row.completionPct}%)</span>
              ) : null}
            </span>
            {row.gapCycles > 0 ? (
              <span className="text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mr-0.5 inline size-3" aria-hidden />
                {row.gapCycles} gap cycle{row.gapCycles === 1 ? '' : 's'}
              </span>
            ) : null}
            {row.verificationFail > 0 ? (
              <span className="text-rose-700 dark:text-rose-400">
                {row.verificationFail} fail{row.verificationFail === 1 ? '' : 's'}
              </span>
            ) : null}
            {row.deploys > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                <Rocket className="mr-0.5 inline size-3" aria-hidden />
                {row.deploys} deploy{row.deploys === 1 ? '' : 's'}
              </span>
            ) : null}
            {row.commits > 0 ? <span>{row.commits} commits</span> : null}
          </div>

          {row.projects.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {row.projects.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {p}
                </span>
              ))}
              {row.projects.length > 5 ? (
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  +{row.projects.length - 5}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return row.profileId ? (
    <Link href={`/admin/employee/${row.profileId}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/* ======================================================================
   Project view
   ====================================================================== */

function ProjectView({ rows }: { rows: ProjectPerfRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No project activity"
        description="No /qualia-report runs hit any project this week."
        compact
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.projectKey}>
          <ProjectCard row={row} />
        </li>
      ))}
    </ul>
  );
}

function ProjectCard({ row }: { row: ProjectPerfRow }) {
  const isSpike = row.volumeMultiplier != null && row.volumeMultiplier >= 2;
  const isQuiet = row.volumeMultiplier != null && row.volumeMultiplier < 0.5 && row.fourWeekAvg > 0;

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-4">
        <span
          className="mt-1 size-3 shrink-0 rounded-full"
          aria-hidden
          style={{ background: `oklch(0.66 0.13 ${row.hue})` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h4 className="truncate text-sm font-semibold tracking-tight">{row.projectName}</h4>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              <strong className="text-foreground">{row.reports}</strong> report
              {row.reports === 1 ? '' : 's'}
            </span>
            {row.fourWeekAvg > 0 && row.volumeMultiplier != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums',
                  isSpike
                    ? 'rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-400'
                    : isQuiet
                      ? 'text-muted-foreground/70'
                      : 'text-muted-foreground'
                )}
              >
                {row.volumeMultiplier.toFixed(1)}× avg ({row.fourWeekAvg}/wk)
              </span>
            ) : null}
            {row.latestMilestone ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                · {row.latestMilestone}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>
              progress{' '}
              <strong className="text-foreground">
                {row.tasksDone}/{row.tasksTotal}
              </strong>
              {row.completionPct != null ? ` (${row.completionPct}%)` : ''}
            </span>
            {row.gapCycles > 0 ? (
              <span className="text-amber-700 dark:text-amber-400">
                {row.gapCycles} gap cycle{row.gapCycles === 1 ? '' : 's'}
              </span>
            ) : null}
            {row.verificationFails > 0 ? (
              <span className="text-rose-700 dark:text-rose-400">
                {row.verificationFails} fail{row.verificationFails === 1 ? '' : 's'}
              </span>
            ) : null}
            {row.deploys > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400">{row.deploys} deploys</span>
            ) : null}
            {row.commits > 0 ? <span>{row.commits} commits</span> : null}
          </div>

          {row.contributors.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-mono uppercase tracking-wide text-muted-foreground">By</span>
              {row.contributors.slice(0, 5).map((c) => (
                <span
                  key={c.name}
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground"
                >
                  {c.name} <span className="text-foreground/60">×{c.count}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
