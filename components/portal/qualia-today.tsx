'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { useTodaysTasks, useInboxTasks, useEmployeeAssignments } from '@/lib/swr';
import { QIcon } from '@/components/ui/q-icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Sparkline } from '@/components/ui/sparkline';
import { AvatarStack, type AvatarStackPerson } from '@/components/ui/avatar-stack';
import { PriorityBadge, type PriorityKey } from '@/components/ui/priority-badge';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';

export type QualiaTodayRole = 'admin' | 'employee';

type QualiaTodayProps = {
  role: QualiaTodayRole;
  displayName: string;
  /** Admin only — used for the active-projects tape + stats row. */
  workspaces?: ClientWorkspace[];
  /** Employee only — drives useEmployeeAssignments so the tape lists
   *  the user's assigned active projects. */
  userId?: string;
};

/* ======================================================================
   Helpers
   ====================================================================== */

function getGreeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 20) return 'Good evening';
  return 'Still up';
}

function mapPriorityFromLegacy(p: string | null | undefined): PriorityKey {
  const normalized = String(p ?? '').toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium' || normalized === 'med') return 'med';
  return 'low';
}

function personFromId(id: string, name: string | null | undefined): AvatarStackPerson {
  // Deterministic hue from id hash; initials from name or id.
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  const initials =
    (name ?? '??')
      .split(/\s+/)
      .map((s) => s.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '??';
  return { id, initials, hue };
}

/* ======================================================================
   Hero — greeting + pulse stats
   ====================================================================== */

function TodayHero({
  role,
  displayName,
  openTasks,
  activeProjects,
}: {
  role: QualiaTodayRole;
  displayName: string;
  openTasks: number;
  activeProjects: number;
}) {
  const now = new Date();
  const hour = now.getHours();
  const firstName = displayName.split(' ')[0] ?? displayName;
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <section
      className="q-page-enter relative mb-5 overflow-hidden rounded-xl border p-7"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--accent-teal), transparent 92%) 0%, color-mix(in oklch, var(--accent-teal), transparent 98%) 50%, var(--surface) 100%)',
        borderColor: 'color-mix(in oklch, var(--accent-teal), transparent 82%)',
      }}
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: 'var(--accent-teal)' }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div
            className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--accent-teal)' }}
          >
            <span className="q-live-dot" aria-hidden />
            {dayName} · {dateStr} · {timeStr}
          </div>
          <h1 className="q-display m-0 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
            {getGreeting(hour)}, <span style={{ color: 'var(--accent-teal)' }}>{firstName}</span>
          </h1>
          <p
            className="mt-2 max-w-[560px] text-[13.5px] leading-[1.5]"
            style={{ color: 'var(--text-soft)' }}
          >
            {openTasks === 0
              ? 'No open tasks. Inbox zero — enjoy the breathing room.'
              : `${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'} on your list.`}
            {role === 'admin' && activeProjects > 0
              ? ` ${activeProjects} active projects in flight.`
              : ''}
          </p>
        </div>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-x-12 gap-y-3 border-t pt-4"
        style={{ borderColor: 'color-mix(in oklch, var(--accent-teal), transparent 82%)' }}
      >
        <PulseStat label="Open tasks" value={String(openTasks)} />
        <PulseStat
          label="Active"
          value={String(activeProjects)}
          trend={role === 'admin' ? 'projects' : 'assignments'}
        />
        <PulseStat label="Today" value={dateStr} />
      </div>
    </section>
  );
}

function PulseStat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="q-label-mono uppercase">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-[18px] font-medium" style={{ color: 'var(--text)' }}>
          {value}
        </span>
        {trend ? (
          <span className="font-mono text-[11px] opacity-70" style={{ color: 'var(--text-mute)' }}>
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ======================================================================
   Timeline — today's tasks vertical list
   ====================================================================== */

type TimelineTask = {
  id: string;
  title: string;
  priority: PriorityKey;
  projectName: string | null;
  minutes: number | null;
};

function TodayTimeline({ tasks }: { tasks: TimelineTask[] }) {
  return (
    <div
      className="card rounded-xl border p-7"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <div className="q-eyebrow">Your line today</div>
          <h2 className="q-display mt-1 text-[16px] font-semibold">What&apos;s on deck</h2>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-hi)] hover:text-[var(--text)]"
        >
          All tasks <QIcon name="arrow-right" size={12} />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks today"
          description="Nothing scoped for today. Enjoy the breathing room."
          compact
          minimal
        />
      ) : (
        <div className="relative">
          <div
            aria-hidden
            className="absolute bottom-2 left-[60px] top-2 w-px"
            style={{ background: 'var(--line)' }}
          />
          {tasks.map((t, i) => (
            <div
              key={t.id}
              className="grid items-center gap-3.5 py-3.5"
              style={{
                gridTemplateColumns: '50px 24px 1fr auto',
                borderBottom: i < tasks.length - 1 ? '1px dashed var(--line)' : 'none',
              }}
            >
              <div
                className="text-right font-mono text-[11px] tracking-[0.04em]"
                style={{ color: 'var(--text-mute)' }}
              >
                {['09:30', '11:00', '13:15', '15:45', '16:30'][i] ?? '—'}
              </div>
              <div
                aria-hidden
                className="mx-auto h-2.5 w-2.5 rounded-full border-2"
                style={{
                  background:
                    t.priority === 'urgent'
                      ? 'var(--q-rust)'
                      : t.priority === 'high'
                        ? 'var(--q-amber)'
                        : 'var(--accent-hi)',
                  borderColor: 'var(--surface)',
                  boxShadow: '0 0 0 1px var(--line)',
                }}
              />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                  {t.title}
                </div>
                <div className="text-[11.5px]" style={{ color: 'var(--text-mute)' }}>
                  {t.projectName ?? 'No project'}
                  {t.minutes ? ` · ${t.minutes}m` : ''}
                </div>
              </div>
              <PriorityBadge priority={t.priority} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   Glance cards — Next ship + Inbox + Velocity
   ====================================================================== */

function GlanceStack({
  nextShip,
  inboxCount,
}: {
  nextShip: { name: string; progress: number; daysLeft: number | null; href: string } | null;
  inboxCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {nextShip ? (
        <div
          className="card rounded-xl border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          <div className="q-eyebrow mb-3">Next ship</div>
          <div className="flex items-center gap-4">
            <ProgressRing
              value={nextShip.progress}
              size={56}
              stroke={4}
              label={`${Math.round(nextShip.progress * 100)}%`}
            />
            <div className="min-w-0 flex-1">
              <div className="q-display truncate text-[14px] font-semibold leading-[1.3]">
                {nextShip.name}
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-mute)' }}>
                {nextShip.daysLeft != null ? `${nextShip.daysLeft} days · in flight` : 'in flight'}
              </div>
            </div>
            <Link
              href={nextShip.href}
              className="rounded-md p-1.5 text-[var(--text-mute)] hover:bg-[var(--surface-hi)] hover:text-[var(--text)]"
              aria-label={`Open ${nextShip.name} roadmap`}
            >
              <QIcon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      ) : null}

      <div
        className="card rounded-xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
      >
        <div className="q-eyebrow mb-3">Inbox</div>
        <div
          className="q-tabular font-mono text-[30px] font-medium leading-none tracking-[-0.01em]"
          style={{ color: 'var(--text)' }}
        >
          {inboxCount.toString().padStart(2, '0')}
        </div>
        <div className="mt-1.5 text-[12px]" style={{ color: 'var(--text-mute)' }}>
          unprocessed tasks ·{' '}
          <Link href="/tasks" className="font-medium" style={{ color: 'var(--accent-teal)' }}>
            triage →
          </Link>
        </div>
      </div>

      <div
        className="card rounded-xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
      >
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="q-eyebrow">Shipping velocity</div>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--q-moss)' }}>
            wk/wk
          </div>
        </div>
        {/* Sparkline data is indicative — replace with real deploy telemetry in a later pass. */}
        <Sparkline points={[2, 3, 5, 3, 6, 7, 4, 8, 12]} width={260} height={48} />
        <div
          className="mt-1 flex justify-between font-mono text-[10px]"
          style={{ color: 'var(--text-mute)' }}
        >
          <span>Last week</span>
          <span>This week</span>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   Projects tape
   ====================================================================== */

type TapeProject = {
  id: string;
  name: string;
  clientName: string;
  clientAccent: string;
  progress: number;
  team: AvatarStackPerson[];
  href: string;
};

function ProjectsTape({ projects }: { projects: TapeProject[] }) {
  if (projects.length === 0) return null;
  return (
    <section className="mt-7">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="q-eyebrow">Active work</div>
          <h2 className="q-display mt-1 text-[22px] font-semibold">Projects in flight</h2>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-mute)] hover:bg-[var(--surface-hi)] hover:text-[var(--text)]"
        >
          All projects <QIcon name="arrow-right" size={12} />
        </Link>
      </div>
      <div
        className="q-stagger grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {projects.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className={cn(
              'card group block rounded-xl border p-[18px] text-left transition-all duration-200 ease-out',
              'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
            )}
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <div className="mb-3.5 flex items-center gap-2">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: p.clientAccent }}
              />
              <span className="q-label-mono truncate" style={{ fontSize: 10 }}>
                {p.clientName.toUpperCase()}
              </span>
            </div>
            <div className="q-display mb-3.5 truncate text-[17px] leading-[1.25]">{p.name}</div>
            <div
              className="mb-2.5 h-1 overflow-hidden rounded"
              style={{ background: 'var(--bg-sub)' }}
            >
              <div
                className="h-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round(p.progress * 100)}%`,
                  background: 'var(--accent-hi)',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <AvatarStack people={p.team} size={20} />
              <span
                className="q-tabular font-mono text-[11px]"
                style={{ color: 'var(--text-mute)' }}
              >
                {Math.round(p.progress * 100)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ======================================================================
   QualiaToday — exported
   ====================================================================== */

export function QualiaToday({ role, displayName, workspaces, userId }: QualiaTodayProps) {
  const { tasks: todayTasks, isLoading: tasksLoading } = useTodaysTasks();
  const { tasks: inboxTasks } = useInboxTasks();
  const { data: assignments } = useEmployeeAssignments(role === 'employee' ? userId : undefined);

  // Timeline tasks — cap at 5, map to TimelineTask shape
  const timelineTasks = useMemo<TimelineTask[]>(() => {
    return (
      todayTasks as Array<{
        id: string;
        title: string;
        priority: string | null;
        estimated_minutes?: number | null;
        project?: { name: string | null } | null;
      }>
    )
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: mapPriorityFromLegacy(t.priority),
        projectName: t.project?.name ?? null,
        minutes: t.estimated_minutes ?? null,
      }));
  }, [todayTasks]);

  // Open tasks count — inbox + today combined, unique
  const openTaskIds = new Set([
    ...(inboxTasks as Array<{ id: string }>).map((t) => t.id),
    ...(todayTasks as Array<{ id: string }>).map((t) => t.id),
  ]);

  // Projects for admin: from workspaces prop (flattened). For employee: from useProjects.
  const tapeProjects = useMemo<TapeProject[]>(() => {
    if (role === 'admin' && workspaces) {
      const flat: TapeProject[] = [];
      for (const ws of workspaces) {
        for (const p of ws.projects) {
          if (p.status !== 'Active') continue;
          flat.push({
            id: p.id,
            name: p.name,
            clientName: ws.name,
            clientAccent: 'var(--accent-teal)',
            progress: 0.5, // workspaces don't carry progress; render a mid-point
            team: [],
            href: `/projects/${p.id}/roadmap`,
          });
        }
      }
      return flat;
    }

    // Employee: assignments carry { project: { id, name, status, client } }
    type AssignmentRow = {
      project: {
        id: string;
        name: string;
        status: string | null;
        client: { id: string; name: string } | null;
      } | null;
    };
    return ((assignments ?? []) as AssignmentRow[])
      .filter(
        (a) => a.project && a.project.status !== 'Archived' && a.project.status !== 'Canceled'
      )
      .map((a) => {
        const p = a.project;
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          clientName: p.client?.name ?? 'No client',
          clientAccent: 'var(--accent-teal)',
          progress: 0.5,
          team: [personFromId(p.id, p.client?.name ?? p.name)],
          href: `/projects/${p.id}/roadmap`,
        } satisfies TapeProject;
      })
      .filter((x): x is TapeProject => x !== null);
  }, [role, workspaces, assignments]);

  const activeProjectsCount = tapeProjects.length;
  const inboxCount = (inboxTasks as Array<{ id: string }>).length;

  // Next ship — pick project with the highest mock progress; for real data wire to project_phases
  const nextShip = tapeProjects[0]
    ? {
        name: tapeProjects[0].name,
        progress: tapeProjects[0].progress,
        daysLeft: null,
        href: tapeProjects[0].href,
      }
    : null;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 1400, padding: 'var(--pad)' }}>
      <TodayHero
        role={role}
        displayName={displayName}
        openTasks={openTaskIds.size}
        activeProjects={activeProjectsCount}
      />

      <div
        className="grid gap-[var(--gap)]"
        style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}
      >
        {tasksLoading ? (
          <div
            className="card rounded-xl border p-7"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <div className="q-eyebrow mb-3">Your line today</div>
            <div
              className="h-32 animate-pulse rounded-md"
              style={{ background: 'var(--bg-sub)' }}
            />
          </div>
        ) : (
          <TodayTimeline tasks={timelineTasks} />
        )}
        <GlanceStack nextShip={nextShip} inboxCount={inboxCount} />
      </div>

      <ProjectsTape projects={tapeProjects} />
    </div>
  );
}
