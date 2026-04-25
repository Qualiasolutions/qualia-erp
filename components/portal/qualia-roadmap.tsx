import Link from 'next/link';
import { ChevronLeft, CalendarRange } from 'lucide-react';
import { format, parseISO, differenceInDays, isValid, startOfMonth, addMonths } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';

import { cn } from '@/lib/utils';
import { hueFromId, clientAccent } from '@/lib/color-constants';
import { RoadmapSideRail } from './roadmap-side-rail';

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
  lead?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  client?: { id: string; name: string } | null;
  workspaceId?: string;
  userRole?: 'admin' | 'employee' | 'client';
}

/* ======================================================================
   Helpers
   ====================================================================== */

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
   Back link (v0: arrow + "Projects" text link)
   ====================================================================== */

function BackLink() {
  return (
    <Link
      href="/projects"
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Projects
    </Link>
  );
}

/* ======================================================================
   Header — v0 style: avatar tile + name + status/type badges
   ====================================================================== */

function RoadmapHeader({
  project,
  phases,
  overallProgress,
}: {
  project: RoadmapProjectRow;
  phases: ProjectPhaseRow[];
  start: Date | null;
  end: Date | null;
  overallProgress: number;
  clientHue: number;
}) {
  const doneCount = phases.filter((p) => resolvePhaseStatus(p) === 'done').length;
  const initials = project.name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  const pctNum = Math.round(overallProgress * 100);

  const statusLabel = project.status.toLowerCase();
  const isActive = statusLabel === 'active' || statusLabel === 'delayed';
  const isDone = statusLabel === 'done' || statusLabel === 'launched';

  // Determine status description for the third stat card
  const statusDescription = isDone
    ? 'All milestones complete'
    : doneCount > 0
      ? `${doneCount} of ${phases.length} phases done`
      : phases.length > 0
        ? 'In progress'
        : 'No phases yet';

  return (
    <header className="mb-6">
      {/* Top bar: back link + avatar tile + name + badges + action buttons */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex animate-fade-in items-center gap-4">
          <BackLink />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  isActive
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : isDone
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                      : 'border-border bg-muted/50 text-muted-foreground'
                )}
              >
                {project.status}
              </span>
            </div>
            {project.project_type && (
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {project.project_type}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 stat cards — v0 style */}
      <div className="stagger-1 grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Overall
            </p>
          </div>
          <p className="text-3xl font-bold tabular-nums">{pctNum}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phases
            </p>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {doneCount}{' '}
            <span className="text-base font-normal text-muted-foreground">/ {phases.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <CalendarRange className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
          </div>
          <p className={cn('text-sm font-medium', isDone ? 'text-emerald-500' : 'text-foreground')}>
            {statusDescription}
          </p>
        </div>
      </div>
    </header>
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
          <LegendDot style={{ background: clientAccent(clientHue) }} label="Active" />
          <LegendDot className="bg-muted-foreground/40" label="Upcoming" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
                  borderColor: clientAccent(clientHue),
                }}
              >
                <span
                  className="absolute -left-5 top-2 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: clientAccent(clientHue) }}
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
                    <span className="font-semibold" style={{ color: clientAccent(clientHue) }}>
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
                      borderColor: clientAccent(clientHue),
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
   Phase breakdown — v0 style collapsible milestone rows
   ====================================================================== */

function PhaseBreakdownList({
  phases,
  clientHue,
}: {
  phases: ProjectPhaseRow[];
  clientHue: number;
}) {
  return (
    <section className="stagger-2 animate-fade-in">
      <h2 className="mb-3 text-base font-semibold tracking-tight">Milestones</h2>
      <div className="space-y-2 pb-4">
        {phases.map((phase) => {
          const status = resolvePhaseStatus(phase);
          const progress = phaseProgress(phase);
          const total = phase.plan_count ?? 0;
          const done = phase.plans_completed ?? 0;

          return (
            <div
              key={phase.id}
              className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-primary/20"
            >
              <div className="flex items-center gap-4 px-6 py-4">
                {/* Status icon */}
                {status === 'done' ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10"
                    aria-hidden
                  >
                    <CalendarRange className="h-3 w-3 text-emerald-500" />
                  </span>
                ) : status === 'active' ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden
                  >
                    <CalendarRange className="h-3 w-3 text-primary" />
                  </span>
                ) : (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-muted"
                    aria-hidden
                  >
                    <CalendarRange className="h-3 w-3 text-muted-foreground" />
                  </span>
                )}

                {/* Phase name */}
                <span className="flex-1 truncate text-sm font-medium">{phase.name}</span>

                {/* Task count */}
                {total > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {done}/{total} done
                  </span>
                )}

                {/* Progress bar — inline small */}
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border/50">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${progress * 100}%`,
                        background:
                          status === 'done'
                            ? 'hsl(142 72% 29%)'
                            : status === 'active'
                              ? clientAccent(clientHue)
                              : 'hsl(var(--muted-foreground) / 0.3)',
                      }}
                    />
                  </span>
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </span>

                {/* Status badge */}
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize',
                    status === 'done'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : status === 'active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  {status === 'done' ? 'closed' : status}
                </span>
              </div>
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

export function QualiaRoadmap({
  project,
  phases,
  lead,
  client,
  workspaceId,
  userRole,
}: QualiaRoadmapProps) {
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

  const showRail = !!workspaceId;

  return (
    <div className="flex w-full flex-col overflow-x-hidden lg:h-full lg:flex-row">
      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="w-full p-6 lg:p-8">
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
            <section className="mb-10">
              <EmptyState
                icon={CalendarRange}
                title="No scheduled phases yet"
                description="Add phase dates to see the timeline."
              />
            </section>
          )}
          {phases.length > 0 && <PhaseBreakdownList phases={phases} clientHue={clientHue} />}
        </div>
      </div>

      {/* Side rail — stacks below on mobile, pinned right on lg+ */}
      {showRail && (
        <div className="w-full lg:w-80 lg:shrink-0">
          <RoadmapSideRail
            projectId={project.id}
            workspaceId={workspaceId}
            lead={lead ?? null}
            client={client ?? null}
            userRole={userRole ?? 'employee'}
          />
        </div>
      )}
    </div>
  );
}
