'use client';

import Link from 'next/link';
import { memo, useMemo } from 'react';

import {
  CheckCircle2,
  ArrowRight,
  Calendar,
  CheckSquare,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useTodaysTasks,
  useInboxTasks,
  useEmployeeAssignments,
  useTodaysMeetings,
  useTeamTodaySnapshot,
} from '@/lib/swr';
import type { TeamMemberToday } from '@/app/actions/team-today';
import { ProgressRing } from '@/components/ui/progress-ring';
import { AvatarStack, type AvatarStackPerson } from '@/components/ui/avatar-stack';
import { PriorityBadge, type PriorityKey } from '@/components/ui/priority-badge';
import { Button } from '@/components/ui/button';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';

export type QualiaTodayRole = 'admin' | 'employee';

type QualiaTodayProps = {
  role: QualiaTodayRole;
  displayName: string;
  /** Admin only -- used for the active-projects tape + stats row. */
  workspaces?: ClientWorkspace[];
  /** Employee only -- drives useEmployeeAssignments so the tape lists
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
   Date Strip + Greeting Header (v0 flat layout)
   ====================================================================== */

function DashboardHeader({
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
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Build subtitle
  const taskPart =
    openTasks === 0
      ? 'No open tasks. Inbox zero -- enjoy the breathing room.'
      : `${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'} on your list.`;
  const projectPart =
    role === 'admin' && activeProjects > 0
      ? ` ${activeProjects} active ${activeProjects === 1 ? 'project' : 'projects'} in flight.`
      : '';

  return (
    <div className="mb-6 flex-shrink-0 animate-stagger-in">
      {/* Date strip */}
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        <span className="font-medium tracking-wider">{dayName}</span>
        <span aria-hidden>·</span>
        <span>{dateStr}</span>
        <span aria-hidden>·</span>
        <span className="font-mono">{timeStr}</span>
      </div>

      {/* Big greeting */}
      <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
        {getGreeting(hour)}, <span className="text-primary">{firstName}</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-2 text-muted-foreground">
        {taskPart}
        {projectPart}
      </p>
    </div>
  );
}

/* ======================================================================
   Stat Cards Row (3 flat cards)
   ====================================================================== */

function StatCardsRow({
  openTasks,
  activeProjects,
  role,
}: {
  openTasks: number;
  activeProjects: number;
  role: QualiaTodayRole;
}) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return (
    <div className="stagger-1 mb-6 grid flex-shrink-0 animate-stagger-in grid-cols-3 gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Open Tasks
        </p>
        <p className="text-3xl font-bold tabular-nums">{openTasks}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Active
        </p>
        <p className="text-3xl font-bold tabular-nums">
          {activeProjects}{' '}
          <span className="text-base font-normal text-muted-foreground">
            {role === 'admin' ? 'projects' : 'assignments'}
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
  );
}

/* ======================================================================
   Team on deck -- admin view of every teammate's open work (v0 format)
   ====================================================================== */

const TeamOnDeck = memo(function TeamOnDeck({ members }: { members: TeamMemberToday[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Team on Deck
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">Who&apos;s doing what</h2>
        </div>
        <Link href="/tasks?scope=all">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
          >
            All Tasks
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={CheckCircle2}
            title="No team members yet"
            description="Add employees to the workspace to see their workload here."
            compact
            minimal
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {members.map((m) => (
            <TeamMemberRow key={m.profileId} member={m} />
          ))}
        </div>
      )}
    </div>
  );
});

const TeamMemberRow = memo(function TeamMemberRow({ member }: { member: TeamMemberToday }) {
  const firstName = (member.fullName ?? '').split(/\s+/)[0] ?? '';
  const initials =
    (member.fullName ?? '??')
      .split(/\s+/)
      .map((s) => s.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '??';

  return (
    <div className="px-6 py-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-4">
        <div className="relative">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={member.fullName ?? ''}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary"
              aria-hidden
            >
              {initials}
            </span>
          )}
          {member.openTasksCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-card" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{firstName || 'Unknown'}</span>
            <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0 text-[10px] font-medium text-secondary-foreground">
              {member.openTasksCount} open
            </span>
          </div>
          {member.topTasks.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {member.topTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <span className="text-primary" aria-hidden>
                    →
                  </span>
                  <span className="truncate text-muted-foreground">{task.title}</span>
                  {task.projectName ? (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {task.projectName}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Nothing open.</p>
          )}
        </div>
      </div>
    </div>
  );
});

/* ======================================================================
   Timeline -- today's tasks vertical list (employee view)
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your line today
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">What&apos;s on deck</h2>
        </div>
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
      </div>

      {tasks.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={CheckCircle2}
            title="No tasks today"
            description="Nothing scoped for today. Enjoy the breathing room."
            compact
            minimal
          />
        </div>
      ) : (
        <div className="px-6 py-4">
          <div className="relative">
            <div aria-hidden className="absolute bottom-2 left-[11px] top-2 w-px bg-border" />
            {tasks.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  'grid items-center gap-3.5 py-3.5',
                  i < tasks.length - 1 && 'border-b border-dashed border-border'
                )}
                style={{ gridTemplateColumns: '24px 1fr auto' }}
              >
                <div
                  aria-hidden
                  className={cn(
                    'mx-auto h-2.5 w-2.5 rounded-full border-2 border-card',
                    t.priority === 'urgent'
                      ? 'bg-destructive'
                      : t.priority === 'high'
                        ? 'bg-amber-500'
                        : 'bg-primary/40'
                  )}
                  style={{ boxShadow: '0 0 0 1px hsl(var(--border))' }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{t.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {t.projectName ?? 'No project'}
                    {t.minutes ? ` · ${t.minutes}m` : ''}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   Right column stack: Next Ship + Meetings + Quick Actions
   ====================================================================== */

interface TimetableMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

function RightColumnStack({
  nextShip,
  meetings,
}: {
  nextShip: { name: string; progress: number; daysLeft: number | null; href: string } | null;
  meetings: TimetableMeeting[];
}) {
  return (
    <div className="stagger-3 animate-stagger-in space-y-6">
      {/* Next Ship */}
      {nextShip ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next Ship
          </p>
          <div className="flex items-center gap-4">
            <ProgressRing
              value={nextShip.progress}
              size={56}
              stroke={4}
              label={`${Math.round(nextShip.progress * 100)}%`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{nextShip.name}</p>
              <p className="text-sm text-muted-foreground">
                {nextShip.daysLeft != null ? `${nextShip.daysLeft} days · in flight` : 'in flight'}
              </p>
            </div>
            <Link href={nextShip.href}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Today's Meetings */}
      <MeetingsTimetable meetings={meetings} />

      {/* Quick Actions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/tasks">
            <Button variant="secondary" className="h-11 w-full justify-start gap-2">
              <CheckSquare className="h-4 w-4" />
              New Task
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="secondary" className="h-11 w-full justify-start gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="secondary" className="h-11 w-full justify-start gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MeetingsTimetable({ meetings }: { meetings: TimetableMeeting[] }) {
  const sorted = [...meetings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Meetings
        </p>
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
      </div>

      {sorted.length === 0 ? (
        <div className="py-3 text-[12px] text-muted-foreground">Nothing on the calendar today.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const start = new Date(m.start_time);
            const end = new Date(m.end_time);
            const isPast = end.getTime() < Date.now();
            const timeLabel = `${formatHHMM(start)}-${formatHHMM(end)}`;
            return (
              <div
                key={m.id}
                className={cn(
                  'group flex cursor-pointer items-center gap-3',
                  isPast && 'opacity-50'
                )}
              >
                <span className="w-20 font-mono text-xs text-muted-foreground">{timeLabel}</span>
                <span className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                  {m.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatHHMM(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
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
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active work
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Projects in flight</h2>
        </div>
        <Link href="/projects">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
          >
            All projects
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {projects.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className={cn(
              'group block rounded-2xl border border-border bg-card p-[18px] text-left transition-all duration-200 ease-out',
              'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'
            )}
          >
            <div className="mb-3.5 flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {p.clientName.toUpperCase()}
              </span>
            </div>
            <div className="mb-3.5 truncate text-[17px] font-semibold leading-[1.25]">{p.name}</div>
            <div className="mb-2.5 h-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary/60 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round(p.progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <AvatarStack people={p.team} size={20} />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
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
   QualiaToday -- exported
   ====================================================================== */

export function QualiaToday({ role, displayName, workspaces, userId }: QualiaTodayProps) {
  const { tasks: todayTasks, isLoading: tasksLoading } = useTodaysTasks();
  const { tasks: inboxTasks } = useInboxTasks();
  const { data: assignments } = useEmployeeAssignments(role === 'employee' ? userId : undefined);
  const { meetings: todayMeetings } = useTodaysMeetings();
  const { members: teamMembers, isLoading: teamLoading } = useTeamTodaySnapshot();

  const timetableMeetings = useMemo<TimetableMeeting[]>(() => {
    return (
      todayMeetings as Array<{ id: string; title: string; start_time: string; end_time: string }>
    ).map((m) => ({
      id: m.id,
      title: m.title,
      start_time: m.start_time,
      end_time: m.end_time,
    }));
  }, [todayMeetings]);

  // Timeline tasks -- cap at 5, map to TimelineTask shape
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

  // Open tasks count -- inbox + today combined, unique
  const openTaskIds = useMemo(
    () =>
      new Set([
        ...(inboxTasks as Array<{ id: string }>).map((t) => t.id),
        ...(todayTasks as Array<{ id: string }>).map((t) => t.id),
      ]),
    [inboxTasks, todayTasks]
  );

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

  // Next ship -- pick project with the highest mock progress; for real data wire to project_phases
  const nextShip = tapeProjects[0]
    ? {
        name: tapeProjects[0].name,
        progress: tapeProjects[0].progress,
        daysLeft: null,
        href: tapeProjects[0].href,
      }
    : null;

  const isAdminView = role === 'admin';
  const leftPaneLoading = isAdminView ? teamLoading : tasksLoading;

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
      {/* Header: date strip + greeting + subtitle */}
      <DashboardHeader
        role={role}
        displayName={displayName}
        openTasks={openTaskIds.size}
        activeProjects={activeProjectsCount}
      />

      {/* Stat cards row */}
      <StatCardsRow openTasks={openTaskIds.size} activeProjects={activeProjectsCount} role={role} />

      {/* Main 3-col grid */}
      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-3">
        {/* Left: col-span-2 */}
        <div className="stagger-2 animate-stagger-in lg:col-span-2">
          {leftPaneLoading ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAdminView ? 'Team on Deck' : 'Your line today'}
                </p>
              </div>
              <div className="p-6">
                <div className="h-32 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          ) : isAdminView ? (
            <TeamOnDeck members={teamMembers} />
          ) : (
            <TodayTimeline tasks={timelineTasks} />
          )}
        </div>

        {/* Right column */}
        <RightColumnStack nextShip={nextShip} meetings={timetableMeetings} />
      </div>

      {/* Projects tape below */}
      <ProjectsTape projects={tapeProjects} />
    </div>
  );
}
