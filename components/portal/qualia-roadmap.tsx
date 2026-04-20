import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { format, parseISO, differenceInDays, isValid, startOfMonth, addMonths } from 'date-fns';

import { cn } from '@/lib/utils';

type ProjectPhaseRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  description: string | null;
  sort_order: number | null;
  plan_count: number | null;
  plans_completed: number | null;
};

type RoadmapProjectRow = {
  id: string;
  name: string;
  status: string;
  target_date: string | null;
  start_date: string | null;
  project_type: string | null;
  client: { id: string; name: string } | null;
  issue_stats: { total: number; done: number };
};

export interface QualiaRoadmapProps {
  project: RoadmapProjectRow;
  phases: ProjectPhaseRow[];
}

/* ======================================================================
   Helpers
   ====================================================================== */

function hueFromId(id: string | null | undefined): number {
  if (!id) return 174;
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function safeParse(date: string | null | undefined): Date | null {
  if (!date) return null;
  const d = parseISO(date);
  return isValid(d) ? d : null;
}

function fmtDate(date: Date): string {
  return format(date, 'dd MMM');
}

type PhaseStatus = 'done' | 'active' | 'upcoming';

function resolvePhaseStatus(phase: ProjectPhaseRow): PhaseStatus {
  const raw = (phase.status || '').toLowerCase();
  if (phase.completed_at || raw === 'done' || raw === 'completed' || raw === 'complete')
    return 'done';
  if (raw === 'active' || raw === 'in_progress' || raw === 'in-progress') return 'active';
  return 'upcoming';
}

function phaseProgress(phase: ProjectPhaseRow): number {
  if (phase.completed_at) return 1;
  const total = phase.plan_count ?? 0;
  const done = phase.plans_completed ?? 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, done / total));
}

function statusBarClasses(status: PhaseStatus): {
  border: string;
  bg: string;
  text: string;
  fill: string;
  dot: string;
} {
  if (status === 'done') {
    return {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-500/10',
      text: 'text-foreground',
      fill: 'bg-emerald-500/30',
      dot: 'bg-emerald-500',
    };
  }
  if (status === 'active') {
    return {
      border: 'border-primary/60',
      bg: 'bg-primary/10',
      text: 'text-foreground',
      fill: 'bg-primary/30',
      dot: 'bg-primary',
    };
  }
  return {
    border: 'border-border',
    bg: 'bg-muted/40',
    text: 'text-muted-foreground',
    fill: 'bg-transparent',
    dot: 'bg-muted-foreground/40',
  };
}

/* ======================================================================
   Breadcrumb
   ====================================================================== */

function Breadcrumb({ clientName, projectName }: { clientName: string; projectName: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <ChevronLeft className="size-3" aria-hidden />
        Projects
      </Link>
      <span aria-hidden className="text-border">
        /
      </span>
      <span className="text-muted-foreground">{clientName}</span>
      <span aria-hidden className="text-border">
        /
      </span>
      <span className="text-foreground">{projectName}</span>
    </nav>
  );
}

/* ======================================================================
   Header
   ====================================================================== */

function RoadmapHeader({
  project,
  phases,
  start,
  end,
  overallProgress,
  clientHue,
}: {
  project: RoadmapProjectRow;
  phases: ProjectPhaseRow[];
  start: Date | null;
  end: Date | null;
  overallProgress: number;
  clientHue: number;
}) {
  const totalDays = start && end ? Math.max(1, differenceInDays(end, start)) : 0;
  const doneCount = phases.filter((p) => resolvePhaseStatus(p) === 'done').length;

  return (
    <header className="mb-8">
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className="size-2 rounded-[2px]"
          style={{ background: `oklch(55% 0.15 ${clientHue})` }}
          aria-hidden
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {project.client?.name ?? 'Internal'} / {project.status}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] font-semibold tracking-tight text-foreground">
            {project.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            {start && end && (
              <span className="tabular-nums">
                {fmtDate(start)} → {fmtDate(end)}
              </span>
            )}
            {totalDays > 0 && <span className="tabular-nums">{totalDays} days</span>}
            <span className="tabular-nums">{phases.length} phases</span>
            {project.project_type && <span>{project.project_type}</span>}
          </div>
        </div>
        <dl className="flex gap-6">
          <KPI label="Complete" value={`${doneCount}/${phases.length}`} />
          <KPI
            label="Progress"
            value={`${Math.round(overallProgress * 100)}%`}
            accentHue={clientHue}
          />
          <KPI
            label="Due"
            value={
              project.target_date && safeParse(project.target_date)
                ? format(safeParse(project.target_date)!, 'd MMM')
                : '—'
            }
          />
        </dl>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${overallProgress * 100}%`,
            background: `oklch(55% 0.15 ${clientHue})`,
          }}
        />
      </div>
    </header>
  );
}

function KPI({ label, value, accentHue }: { label: string; value: string; accentHue?: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className="text-lg font-semibold tabular-nums tracking-tight"
        style={accentHue !== undefined ? { color: `oklch(55% 0.15 ${accentHue})` } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

/* ======================================================================
   Gantt schedule
   ====================================================================== */

function RoadmapSchedule({
  phases,
  start,
  end,
  clientHue,
}: {
  phases: ProjectPhaseRow[];
  start: Date;
  end: Date;
  clientHue: number;
}) {
  const totalMs = Math.max(end.getTime() - start.getTime(), 1);
  const today = new Date();
  const todayInRange = today >= start && today <= end;
  const todayOffset = todayInRange ? ((today.getTime() - start.getTime()) / totalMs) * 100 : null;

  const months: { date: Date; offset: number }[] = [];
  let cursor = startOfMonth(start);
  while (cursor <= end) {
    const offset = ((cursor.getTime() - start.getTime()) / totalMs) * 100;
    months.push({ date: new Date(cursor), offset: Math.max(0, offset) });
    cursor = addMonths(cursor, 1);
  }

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight">Schedule</h2>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          <LegendDot className="bg-emerald-500" label="Done" />
          <LegendDot style={{ background: `oklch(55% 0.15 ${clientHue})` }} label="Active" />
          <LegendDot className="bg-muted-foreground/40" label="Upcoming" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Month axis */}
        <div className="grid grid-cols-[220px_1fr] border-b border-border bg-muted/20 md:grid-cols-[280px_1fr]">
          <div className="border-r border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Phase
          </div>
          <div className="relative h-9">
            {months.map((m, i) => (
              <span
                key={i}
                className="absolute inset-y-0 flex items-center whitespace-nowrap pl-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                style={{
                  left: `${m.offset}%`,
                  borderLeft: i === 0 ? 'none' : '1px solid hsl(var(--border))',
                }}
              >
                {format(m.date, 'MMM')}
                {m.date.getFullYear() !== start.getFullYear() && ` ’${format(m.date, 'yy')}`}
              </span>
            ))}
            {todayOffset !== null && (
              <span
                className="pointer-events-none absolute inset-y-0 z-10 border-l-[1.5px]"
                style={{
                  left: `${todayOffset}%`,
                  borderColor: `oklch(55% 0.15 ${clientHue})`,
                }}
              >
                <span
                  className="absolute -left-5 top-2 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: `oklch(55% 0.15 ${clientHue})` }}
                >
                  Today
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Phase rows */}
        {phases.map((phase, i) => {
          const phaseStart = safeParse(phase.start_date);
          const phaseEnd = safeParse(phase.target_date) ?? safeParse(phase.completed_at);
          const status = resolvePhaseStatus(phase);
          const styles = statusBarClasses(status);
          const progress = phaseProgress(phase);
          const days =
            phaseStart && phaseEnd ? Math.max(1, differenceInDays(phaseEnd, phaseStart)) : 0;

          const hasTimeline = phaseStart && phaseEnd;
          const leftPct = hasTimeline
            ? ((phaseStart!.getTime() - start.getTime()) / totalMs) * 100
            : 0;
          const widthPct = hasTimeline
            ? ((phaseEnd!.getTime() - phaseStart!.getTime()) / totalMs) * 100
            : 0;

          return (
            <div
              key={phase.id}
              className={cn(
                'grid grid-cols-[220px_1fr] md:grid-cols-[280px_1fr]',
                i < phases.length - 1 && 'border-b border-border'
              )}
            >
              <div
                className={cn(
                  'flex flex-col justify-center gap-1 border-r border-border px-4 py-3',
                  status === 'active' && 'bg-muted/20'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 font-mono text-[10px] text-muted-foreground">
                    P{i + 1}
                  </span>
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {phase.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2.5 gap-y-0 pl-8 font-mono text-[11px] text-muted-foreground">
                  {phase.plan_count ? <span>{phase.plan_count} items</span> : null}
                  {days > 0 && <span>· {days}d</span>}
                  {status === 'active' && progress > 0 && (
                    <span
                      className="font-semibold"
                      style={{ color: `oklch(55% 0.15 ${clientHue})` }}
                    >
                      · {Math.round(progress * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="relative py-3.5">
                {months.map((m, j) => (
                  <span
                    key={j}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-border/60"
                    style={{ left: `${m.offset}%` }}
                  />
                ))}
                {todayOffset !== null && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 z-10 border-l-[1.5px]"
                    style={{
                      left: `${todayOffset}%`,
                      borderColor: `oklch(55% 0.15 ${clientHue})`,
                    }}
                  />
                )}
                {hasTimeline && (
                  <div
                    className={cn(
                      'absolute inset-y-3 flex items-center overflow-hidden rounded border',
                      styles.border,
                      styles.bg
                    )}
                    style={{
                      left: `calc(${leftPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                    }}
                  >
                    {status === 'active' && progress > 0 && (
                      <span
                        aria-hidden
                        className={cn('absolute inset-y-0 left-0', styles.fill)}
                        style={{ width: `${progress * 100}%` }}
                      />
                    )}
                    <span
                      className={cn(
                        'relative flex w-full justify-between px-2.5 font-mono text-[10.5px] tabular-nums',
                        styles.text
                      )}
                    >
                      <span>{fmtDate(phaseStart!)}</span>
                      <span>{fmtDate(phaseEnd!)}</span>
                    </span>
                  </div>
                )}
                {!hasTimeline && (
                  <div className="px-3 text-xs italic text-muted-foreground">
                    Dates not scheduled
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LegendDot({
  className,
  style,
  label,
}: {
  className?: string;
  style?: React.CSSProperties;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('size-2 rounded-[2px]', className)} style={style} />
      {label}
    </span>
  );
}

/* ======================================================================
   Phase breakdown table
   ====================================================================== */

function PhaseBreakdownTable({
  phases,
  clientHue,
}: {
  phases: ProjectPhaseRow[];
  clientHue: number;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight">Phase breakdown</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          className="grid border-b border-border bg-muted/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
          style={{
            gridTemplateColumns: '40px 1fr 120px 100px 100px 70px 110px',
            columnGap: '12px',
          }}
        >
          <span>#</span>
          <span>Phase</span>
          <span>Status</span>
          <span>Start</span>
          <span>End</span>
          <span>Days</span>
          <span className="text-right">Progress</span>
        </div>
        {phases.map((phase, i) => {
          const start = safeParse(phase.start_date);
          const end = safeParse(phase.target_date) ?? safeParse(phase.completed_at);
          const status = resolvePhaseStatus(phase);
          const styles = statusBarClasses(status);
          const progress = phaseProgress(phase);
          const days = start && end ? Math.max(1, differenceInDays(end, start)) : null;

          return (
            <div
              key={phase.id}
              className={cn(
                'grid items-center px-4 py-3 text-sm',
                i < phases.length - 1 && 'border-b border-border',
                status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
              )}
              style={{
                gridTemplateColumns: '40px 1fr 120px 100px 100px 70px 110px',
                columnGap: '12px',
              }}
            >
              <span className="font-mono text-[11px] text-muted-foreground">P{i + 1}</span>
              <span className="truncate font-medium">{phase.name}</span>
              <span className="inline-flex items-center gap-1.5 text-xs capitalize">
                <span aria-hidden className={cn('size-1.5 rounded-full', styles.dot)} />
                {status}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {start ? format(start, 'dd MMM') : '—'}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {end ? format(end, 'dd MMM') : '—'}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {days ? `${days}d` : '—'}
              </span>
              <span className="flex items-center justify-end gap-2">
                <span className="h-[3px] max-w-[60px] flex-1 overflow-hidden rounded-full bg-border/50">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      background:
                        status === 'done'
                          ? 'hsl(142 76% 36%)'
                          : status === 'active'
                            ? `oklch(55% 0.15 ${clientHue})`
                            : 'hsl(var(--muted-foreground) / 0.4)',
                    }}
                  />
                </span>
                <span className="w-7 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(progress * 100)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ======================================================================
   Main export
   ====================================================================== */

export function QualiaRoadmap({ project, phases }: QualiaRoadmapProps) {
  const phasesWithDates = phases.filter((p) => p.start_date || p.target_date);

  const starts = phasesWithDates
    .map((p) => safeParse(p.start_date))
    .filter((d): d is Date => d !== null);
  const ends = phasesWithDates
    .map((p) => safeParse(p.target_date) ?? safeParse(p.completed_at))
    .filter((d): d is Date => d !== null);

  const projectStart = safeParse(project.start_date);
  const projectEnd = safeParse(project.target_date);

  const start =
    starts.length > 0 ? new Date(Math.min(...starts.map((d) => d.getTime()))) : projectStart;
  const end = ends.length > 0 ? new Date(Math.max(...ends.map((d) => d.getTime()))) : projectEnd;

  const clientHue = hueFromId(project.client?.id ?? project.id);

  const overallProgress =
    phases.length > 0 ? phases.reduce((sum, p) => sum + phaseProgress(p), 0) / phases.length : 0;

  return (
    <div className="mx-auto w-full p-6 lg:p-8">
      <Breadcrumb clientName={project.client?.name ?? 'Internal'} projectName={project.name} />
      <RoadmapHeader
        project={project}
        phases={phases}
        start={start}
        end={end}
        overallProgress={overallProgress}
        clientHue={clientHue}
      />
      {start && end && phases.length > 0 ? (
        <RoadmapSchedule phases={phases} start={start} end={end} clientHue={clientHue} />
      ) : (
        <section className="mb-10 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No scheduled phases yet. Add phase dates to see the timeline.
          </p>
        </section>
      )}
      {phases.length > 0 && <PhaseBreakdownTable phases={phases} clientHue={clientHue} />}
    </div>
  );
}
