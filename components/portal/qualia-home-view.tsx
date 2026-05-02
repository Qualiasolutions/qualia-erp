'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, ExternalLink, Lock, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useInboxTasks,
  useInboxPreview,
  useTodaysMeetings,
  useTeamTodaySnapshot,
  useEmployeeAssignments,
  useDailyBrief,
  invalidateDailyBrief,
} from '@/lib/swr';
import {
  dismissBriefItem,
  undismissBriefItem,
  createManualBriefItem,
  regenerateMyDailyBrief,
  type BriefItem,
} from '@/app/actions/daily-brief';
import { useClockGate } from '@/components/clock-gate-provider';
import {
  AssignmentFocusCard,
  type AssignmentFocusItem,
} from '@/components/portal/assignment-focus-card';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { hueFromId, TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';

export type QualiaHomeRole = 'admin' | 'employee';

interface QualiaHomeViewProps {
  role: QualiaHomeRole;
  displayName: string;
  /** Admin only — used for active-projects count + Next Ship pick. */
  workspaces?: ClientWorkspace[];
  /** Employee only — drives useEmployeeAssignments for project list. */
  userId?: string;
}

/** Small circular project/client mark: logo if present, initials otherwise.
 *  Matches the ring treatment used on the /projects pipeline cards so the
 *  visual language stays consistent across the homepage and the pipeline. */
function ProjectMark({
  logoUrl,
  fallback,
  size = 36,
  className,
}: {
  logoUrl: string | null;
  fallback: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/5',
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={size - 4}
          height={size - 4}
          className="rounded-full object-cover"
          style={{ width: size - 4, height: size - 4 }}
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-semibold uppercase text-primary">
          {fallback.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

function getGreeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 20) return 'Good evening';
  return 'Still up';
}

function avatarTone(seed: string): string {
  // Deterministic mapping to a small palette so avatars feel branded but varied.
  const palette = [
    'bg-primary/10 text-primary',
    'bg-blue-500/10 text-blue-500',
    'bg-violet-500/10 text-violet-500',
    'bg-emerald-500/10 text-emerald-500',
    'bg-amber-500/10 text-amber-500',
    'bg-rose-500/10 text-rose-500',
  ];
  const hue = hueFromId(seed);
  return palette[hue % palette.length] ?? palette[0];
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?'
  );
}

export function QualiaHomeView({ role, displayName, workspaces, userId }: QualiaHomeViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => setMounted((m) => m), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const timeStr = mounted
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const { isGated } = useClockGate();

  const { tasks: inboxTasks } = useInboxTasks();
  const openTasksCount = (inboxTasks as Array<{ id: string }>).length;
  const { data: inboxPreview } = useInboxPreview(1);
  const overdueCount = inboxPreview.overdueCount;

  type InboxTask = {
    id: string;
    title: string;
    status: string;
    priority: string | null;
    due_date: string | null;
    project: { id: string; name: string } | null;
  };

  const employeeTasks = useMemo(() => {
    const sorted = (inboxTasks as InboxTask[]).slice().sort((a, b) => {
      // In Progress first, then Todo
      const stRank = (s: string) => (s === 'In Progress' ? 0 : 1);
      const sd = stRank(a.status) - stRank(b.status);
      if (sd !== 0) return sd;
      // Then by due_date ascending (nulls last)
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return sorted.slice(0, 8);
  }, [inboxTasks]);

  const { meetings: todayMeetings } = useTodaysMeetings();
  const meetings = useMemo(
    () =>
      (
        todayMeetings as Array<{
          id: string;
          title: string;
          start_time: string;
          end_time: string;
        }>
      )
        .slice()
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [todayMeetings]
  );

  const { members: teamMembers } = useTeamTodaySnapshot();

  const { data: assignments } = useEmployeeAssignments(role === 'employee' ? userId : undefined);

  const employeeAssignments = useMemo<AssignmentFocusItem[]>(() => {
    if (role !== 'employee') return [];
    return ((assignments ?? []) as AssignmentFocusItem[]).filter((a) => a.project);
  }, [assignments, role]);

  // Active projects: admin → flatten workspaces; employee → assignments.
  const activeProjects = useMemo(() => {
    if (role === 'admin' && workspaces) {
      return workspaces.flatMap((ws) =>
        ws.projects
          .filter((p) => p.status === 'Active')
          .map((p) => ({
            id: p.id,
            name: p.name,
            clientName: ws.name,
            logoUrl: p.logo_url,
            href: `/projects/${p.id}/roadmap`,
          }))
      );
    }
    return employeeAssignments
      .filter((a) => a.project && a.project.status === 'Active')
      .map((a) => ({
        id: a.project!.id,
        name: a.project!.name,
        clientName: a.project!.client?.name ?? 'No client',
        logoUrl: a.project!.logo_url ?? null,
        href: `/projects/${a.project!.id}/roadmap`,
      }));
  }, [role, workspaces, employeeAssignments]);

  const nextShip = activeProjects[0] ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex-shrink-0 animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-medium tracking-wider">{dayName}</span>
          <span>·</span>
          <span>{dateStr}</span>
          <span>·</span>
          <span className="font-mono">{timeStr}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          {getGreeting(hour)}, <span className="text-primary">{displayName.split(' ')[0]}</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span>
            {openTasksCount === 0
              ? 'No open tasks. Inbox zero — enjoy the breathing room.'
              : `${openTasksCount} open ${openTasksCount === 1 ? 'task' : 'tasks'} on your list.`}
            {activeProjects.length > 0
              ? ` ${activeProjects.length} active ${
                  activeProjects.length === 1 ? 'project' : 'projects'
                } in flight.`
              : ''}
          </span>
          {overdueCount > 0 ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/[0.08] px-2 py-0.5 text-xs font-semibold text-destructive"
              role="status"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" aria-hidden />
              {overdueCount} overdue
            </span>
          ) : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stagger-1 mb-4 grid flex-shrink-0 animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Open Tasks
          </p>
          <p className="text-3xl font-bold tabular-nums">{openTasksCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {activeProjects.length}{' '}
            <span className="text-base font-normal text-muted-foreground">
              {activeProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Today
          </p>
          <p className="text-3xl font-bold tabular-nums">{dateStr}</p>
        </div>
      </div>

      {role === 'admin' ? (
        <AdminMainGrid
          teamMembers={teamMembers}
          activeProjects={activeProjects}
          nextShip={nextShip}
          meetings={meetings}
        />
      ) : (
        <EmployeeMainGrid
          tasks={employeeTasks}
          openTasksCount={openTasksCount}
          assignments={employeeAssignments}
          userId={userId}
          nextShip={nextShip}
          meetings={meetings}
          isGated={isGated}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Admin layout ─────────────────────────── */

function AdminMainGrid({
  teamMembers,
  activeProjects,
  nextShip,
  meetings,
}: {
  teamMembers: ReturnType<typeof useTeamTodaySnapshot>['members'];
  activeProjects: Array<{
    id: string;
    name: string;
    clientName: string;
    logoUrl: string | null;
    href: string;
  }>;
  nextShip: {
    id: string;
    name: string;
    clientName: string;
    logoUrl: string | null;
    href: string;
  } | null;
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-3">
      <div className="stagger-2 animate-fade-in lg:col-span-2">
        <DailyBriefCard />
      </div>

      <div className="stagger-3 animate-fade-in space-y-6">
        {nextShip ? (
          <Link
            href={nextShip.href}
            className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next Ship
            </p>
            <div className="flex items-center gap-4">
              <ProjectMark
                logoUrl={nextShip.logoUrl}
                fallback={nextShip.clientName || nextShip.name}
                size={56}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{nextShip.name}</p>
                <p className="text-sm text-muted-foreground">{nextShip.clientName}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ) : null}

        <TodayMeetingsCard meetings={meetings} isGated={false} />

        <WhosDoingWhatCard members={teamMembers} />

        <div className="text-xs text-muted-foreground">
          {activeProjects.length} active {activeProjects.length === 1 ? 'project' : 'projects'} in
          flight.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Employee layout (new) ─────────────────────────── */

function EmployeeMainGrid({
  tasks,
  openTasksCount,
  assignments,
  userId,
  nextShip,
  meetings,
  isGated,
}: {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    due_date: string | null;
    project: { id: string; name: string } | null;
  }>;
  openTasksCount: number;
  assignments: AssignmentFocusItem[];
  userId?: string;
  nextShip: {
    id: string;
    name: string;
    clientName: string;
    logoUrl: string | null;
    href: string;
  } | null;
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
  isGated: boolean;
}) {
  return (
    <div className="stagger-2 grid min-h-0 flex-1 animate-fade-in gap-6 overflow-hidden lg:grid-cols-3">
      <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
        <AssignmentFocusCard
          assignments={assignments}
          employeeId={userId}
          isGated={isGated}
          compact
        />
        <TasksCard
          tasks={tasks}
          openTasksCount={openTasksCount}
          isGated={isGated}
          className="min-h-0 flex-1"
        />
      </div>

      {/* Right column — Today's Meetings + Next Ship */}
      <div className="flex min-h-0 flex-col gap-6 overflow-hidden">
        <TodayMeetingsCard meetings={meetings} isGated={isGated} className="min-h-0 flex-1" />
        <NextShipCard nextShip={nextShip} isGated={isGated} />
      </div>
    </div>
  );
}

function TasksCard({
  tasks,
  openTasksCount,
  isGated,
  className,
}: {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    due_date: string | null;
    project: { id: string; name: string } | null;
  }>;
  openTasksCount: number;
  isGated: boolean;
  className?: string;
}) {
  const todayKey = new Date().toLocaleDateString('en-CA');
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card',
        className
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your Active Work
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">
            My tasks{' '}
            {openTasksCount > 0 ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                · {openTasksCount} open
              </span>
            ) : null}
          </h2>
        </div>
        {isGated ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            aria-label="Clock in to act on tasks"
          >
            <Lock className="h-3 w-3" />
            Clock in
          </span>
        ) : (
          <Link href="/tasks">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              All Tasks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Inbox zero — nothing open.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {tasks.map((t) => {
            const priorityKey = (t.priority ?? 'No Priority') as TaskPriorityKey;
            const priority =
              TASK_PRIORITY_COLORS[priorityKey] ?? TASK_PRIORITY_COLORS['No Priority'];
            const isOverdue = t.due_date && t.due_date < todayKey && t.status !== 'Done';
            const isDueToday = t.due_date === todayKey;
            const dueLabel = t.due_date
              ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              : null;
            const inProgress = t.status === 'In Progress';

            const inner = (
              <div className="flex items-center gap-3 px-6 py-3.5">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    inProgress ? 'bg-blue-500' : 'bg-muted-foreground/40'
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{t.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {t.project?.name ? (
                      <span className="truncate font-mono uppercase">{t.project.name}</span>
                    ) : null}
                    {t.project?.name && (priority.label !== 'None' || dueLabel) ? (
                      <span aria-hidden>·</span>
                    ) : null}
                    {priority.label !== 'None' ? (
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0 text-[10px] font-medium',
                          priority.bg,
                          priority.border,
                          priority.text
                        )}
                      >
                        {priority.label}
                      </span>
                    ) : null}
                    {dueLabel ? (
                      <span
                        className={cn(
                          isOverdue
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : isDueToday
                              ? 'font-semibold text-primary'
                              : 'text-muted-foreground'
                        )}
                      >
                        {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
                        {dueLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
                {!isGated ? (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
            );
            return (
              <li key={t.id}>
                {isGated ? (
                  <div className="cursor-default opacity-60" aria-disabled="true">
                    {inner}
                  </div>
                ) : (
                  <Link href="/tasks" className="block transition-colors hover:bg-muted/30">
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NextShipCard({
  nextShip,
  isGated,
}: {
  nextShip: {
    id: string;
    name: string;
    clientName: string;
    logoUrl: string | null;
    href: string;
  } | null;
  isGated: boolean;
}) {
  if (!nextShip) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Next Ship
        </p>
        <p className="text-sm text-muted-foreground">No active projects assigned.</p>
      </div>
    );
  }
  const inner = (
    <>
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Next Ship
      </p>
      <div className="flex items-center gap-4">
        <ProjectMark
          logoUrl={nextShip.logoUrl}
          fallback={nextShip.clientName || nextShip.name}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{nextShip.name}</p>
          <p className="text-sm text-muted-foreground">{nextShip.clientName}</p>
        </div>
        {!isGated ? <ArrowRight className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </>
  );
  if (isGated) {
    return (
      <div
        className="block cursor-default rounded-2xl border border-border bg-card p-6 opacity-60"
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={nextShip.href}
      className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
    >
      {inner}
    </Link>
  );
}

function TodayMeetingsCard({
  meetings,
  isGated,
  className,
}: {
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
  isGated: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6',
        isGated && 'opacity-60',
        className
      )}
    >
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Meetings
        </p>
        {isGated ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Clock in
          </span>
        ) : (
          <Link href="/schedule">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              Schedule
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the calendar today.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {meetings.map((m) => {
            const start = new Date(m.start_time);
            const end = new Date(m.end_time);
            const fmt = (d: Date) =>
              d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={m.id}
                className="flex items-center gap-3"
                aria-disabled={isGated || undefined}
              >
                <span className="w-20 font-mono text-xs text-muted-foreground">
                  {fmt(start)}–{fmt(end)}
                </span>
                <span className="text-sm font-medium">{m.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Who's doing what (sidebar team snapshot) ─────────────────────────── */

function WhosDoingWhatCard({
  members,
}: {
  members: ReturnType<typeof useTeamTodaySnapshot>['members'];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Team on Deck
          </p>
          <h2 className="mt-0.5 text-base font-semibold">Who&apos;s doing what</h2>
        </div>
        <Link href="/tasks?scope=all">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
          >
            All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No team activity yet.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.profileId} className="px-5 py-3.5 transition-colors hover:bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    {member.avatarUrl ? (
                      <AvatarImage src={member.avatarUrl} alt={member.fullName ?? ''} />
                    ) : null}
                    <AvatarFallback className={avatarTone(member.profileId)}>
                      {initialsOf(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                      aria-label="online"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {member.fullName ?? 'Unnamed'}
                    </span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {member.openTasksCount}
                    </Badge>
                  </div>
                  {member.topTasks.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {member.topTasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="flex items-center gap-1.5 text-xs">
                          <span className="text-primary">→</span>
                          <span className="truncate text-muted-foreground">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Nothing open.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Daily Brief ─────────────────────────── */

const TAG_TONES: Record<string, string> = {
  OWNER: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  TEAM: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  ME: 'border-primary/25 bg-primary/10 text-primary',
};

function BriefTagPill({ tag }: { tag: string }) {
  const tone = TAG_TONES[tag] ?? 'border-border bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex w-[68px] shrink-0 justify-center rounded-md border px-1.5 py-0.5',
        'font-mono text-[9px] font-semibold uppercase tracking-[0.08em]',
        tone
      )}
    >
      {tag}
    </span>
  );
}

function BriefRow({
  item,
  pending,
  onToggle,
}: {
  item: BriefItem;
  pending: boolean;
  onToggle: () => void;
}) {
  const done = item.dismissed_at !== null;
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-6 py-2.5 transition-opacity',
        (done || pending) && 'opacity-50'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        disabled={pending}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:border-primary/50',
          pending && 'cursor-not-allowed'
        )}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
      </button>
      <span className="mt-0.5">
        <BriefTagPill tag={item.tag} />
      </span>
      <p
        className={cn(
          'flex-1 text-sm leading-relaxed text-foreground',
          done && 'line-through decoration-muted-foreground/60 decoration-1'
        )}
      >
        {item.lead ? <span className="font-semibold">{item.lead}</span> : null}
        <span>{item.body}</span>
      </p>
    </div>
  );
}

function DailyBriefCard() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const { brief, isLoading } = useDailyBrief();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addBody, setAddBody] = useState('');
  const [addLead, setAddLead] = useState('');

  const handleToggle = useCallback(async (item: BriefItem) => {
    setPendingIds((prev) => new Set(prev).add(item.id));
    try {
      const result =
        item.dismissed_at === null
          ? await dismissBriefItem(item.id)
          : await undismissBriefItem(item.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to update item');
      } else {
        invalidateDailyBrief();
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateMyDailyBrief();
      if (!result.success) {
        toast.error(result.error || 'Failed to regenerate brief');
      } else {
        toast.success('Brief refreshed');
        invalidateDailyBrief();
      }
    } finally {
      setIsRegenerating(false);
    }
  }, []);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!addBody.trim()) return;
      const result = await createManualBriefItem({
        body: addBody.trim(),
        lead: addLead.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to add item');
        return;
      }
      setAddBody('');
      setAddLead('');
      setShowAdd(false);
      invalidateDailyBrief();
    },
    [addBody, addLead]
  );

  const sections = brief?.sections ?? [];
  const activeCount = brief?.totals.active ?? 0;
  const dismissedCount = brief?.totals.dismissed ?? 0;
  const totalToday = activeCount + dismissedCount;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Qualia Solutions
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Daily Brief</h2>
          <p className="mt-1 text-xs text-muted-foreground">{dateLabel} · auto-generated</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] font-semibold uppercase tabular-nums tracking-[0.12em] text-muted-foreground"
            aria-live="polite"
          >
            {dismissedCount}/{totalToday} done
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd((v) => !v)}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
            aria-label="Add manual item"
          >
            <Plus className="h-3 w-3" aria-hidden />
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
            aria-label="Regenerate brief"
          >
            <RefreshCw className={cn('h-3 w-3', isRegenerating && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-2 border-b border-border bg-muted/20 px-6 py-3"
        >
          <input
            type="text"
            value={addLead}
            onChange={(e) => setAddLead(e.target.value)}
            placeholder="Lead (optional, e.g. 'Chase Futini:')"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <input
            type="text"
            value={addBody}
            onChange={(e) => setAddBody(e.target.value)}
            placeholder="What needs doing?"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAdd(false);
                setAddBody('');
                setAddLead('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!addBody.trim()}>
              Add
            </Button>
          </div>
        </form>
      ) : null}

      <div className="pb-2">
        {isLoading && sections.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading brief…</div>
        ) : sections.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">All clear.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dismissedCount > 0
                ? `${dismissedCount} ticked today.`
                : 'Press Refresh to regenerate, or add an item.'}
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.heading} className="pt-5">
              <div className="flex items-center justify-between gap-3 px-6 pb-2">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {section.heading}
                </p>
                <p
                  className="font-mono text-[10px] tabular-nums text-muted-foreground/70"
                  aria-label={`${section.items.length} items`}
                >
                  {section.items.length}
                </p>
              </div>
              <div>
                {section.items.map((item) => (
                  <BriefRow
                    key={item.id}
                    item={item}
                    pending={pendingIds.has(item.id)}
                    onToggle={() => handleToggle(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {dismissedCount > 0 ? (
        <div className="border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
          >
            <span>Today&apos;s history · {dismissedCount} done</span>
            <RotateCcw
              className={cn('h-3 w-3 transition-transform', showHistory && 'rotate-180')}
              aria-hidden
            />
          </button>
          {showHistory ? <DismissedToday /> : null}
        </div>
      ) : null}
    </div>
  );
}

function DismissedToday() {
  const { brief } = useDailyBrief();
  const [items, setItems] = useState<BriefItem[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { getDailyBriefHistory } = await import('@/app/actions/daily-brief');
      const data = await getDailyBriefHistory(1);
      if (!cancelled) {
        // Only show items dismissed today
        const today = brief?.forDate ?? new Date().toISOString().slice(0, 10);
        setItems(data.filter((i) => i.for_date === today));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brief?.forDate, brief?.totals.dismissed]);

  const handleUndo = useCallback(async (item: BriefItem) => {
    setPendingIds((prev) => new Set(prev).add(item.id));
    try {
      const result = await undismissBriefItem(item.id);
      if (result.success) {
        invalidateDailyBrief();
      } else {
        toast.error(result.error || 'Failed to undo');
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="border-t border-border bg-background/40 pb-2">
      {items.map((item) => (
        <BriefRow
          key={item.id}
          item={item}
          pending={pendingIds.has(item.id)}
          onToggle={() => handleUndo(item)}
        />
      ))}
    </div>
  );
}
