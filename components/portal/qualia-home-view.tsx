'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckSquare, FolderKanban, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useInboxTasks,
  useTodaysMeetings,
  useTeamTodaySnapshot,
  useEmployeeAssignments,
} from '@/lib/swr';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { hueFromId } from '@/lib/color-constants';

export type QualiaHomeRole = 'admin' | 'employee';

interface QualiaHomeViewProps {
  role: QualiaHomeRole;
  displayName: string;
  /** Admin only — used for active-projects count + Next Ship pick. */
  workspaces?: ClientWorkspace[];
  /** Employee only — drives useEmployeeAssignments for project list. */
  userId?: string;
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

  const { tasks: inboxTasks } = useInboxTasks();
  const openTasksCount = (inboxTasks as Array<{ id: string }>).length;

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
            href: `/projects/${p.id}/roadmap`,
          }))
      );
    }
    type AssignmentRow = {
      project: {
        id: string;
        name: string;
        status: string | null;
        client: { id: string; name: string } | null;
      } | null;
    };
    return ((assignments ?? []) as AssignmentRow[])
      .filter((a) => a.project && a.project.status === 'Active')
      .map((a) => ({
        id: a.project!.id,
        name: a.project!.name,
        clientName: a.project!.client?.name ?? 'No client',
        href: `/projects/${a.project!.id}/roadmap`,
      }));
  }, [role, workspaces, assignments]);

  const nextShip = activeProjects[0] ?? null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex-shrink-0 animate-fade-in">
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
        <p className="mt-2 text-muted-foreground">
          {openTasksCount === 0
            ? 'No open tasks. Inbox zero — enjoy the breathing room.'
            : `${openTasksCount} open ${openTasksCount === 1 ? 'task' : 'tasks'} on your list.`}
          {activeProjects.length > 0
            ? ` ${activeProjects.length} active ${
                activeProjects.length === 1 ? 'project' : 'projects'
              } in flight.`
            : ''}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stagger-1 mb-6 grid flex-shrink-0 animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-3">
        {/* Team / Projects column */}
        <div className="stagger-2 animate-fade-in lg:col-span-2">
          {role === 'admin' ? (
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

              {teamMembers.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No team activity yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {teamMembers.map((member) => (
                    <div
                      key={member.profileId}
                      className="px-6 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {member.avatarUrl ? (
                              <AvatarImage src={member.avatarUrl} alt={member.fullName ?? ''} />
                            ) : null}
                            <AvatarFallback className={avatarTone(member.profileId)}>
                              {initialsOf(member.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          {member.isOnline && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card"
                              aria-label="online"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.fullName ?? 'Unnamed'}</span>
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {member.openTasksCount} open
                            </Badge>
                          </div>
                          {member.topTasks.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {member.topTasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-primary">→</span>
                                  <span className="truncate text-muted-foreground">
                                    {task.title}
                                  </span>
                                  {task.projectName && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      {task.projectName.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Nothing open.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Active Work
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold">Projects in flight</h2>
                </div>
                <Link href="/projects">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-primary"
                  >
                    All Projects
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {activeProjects.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No active project assignments.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeProjects.slice(0, 8).map((p) => (
                    <Link
                      key={p.id}
                      href={p.href}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.clientName}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="stagger-3 animate-fade-in space-y-6">
          {/* Next Ship */}
          {nextShip ? (
            <Link
              href={nextShip.href}
              className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Next Ship
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/5">
                  <span className="text-xs font-semibold text-primary">
                    {nextShip.clientName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{nextShip.name}</p>
                  <p className="text-sm text-muted-foreground">{nextShip.clientName}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ) : null}

          {/* Today's Meetings */}
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
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing on the calendar today.</p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => {
                  const start = new Date(m.start_time);
                  const end = new Date(m.end_time);
                  const fmt = (d: Date) =>
                    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={m.id} className="group flex items-center gap-3">
                      <span className="w-20 font-mono text-xs text-muted-foreground">
                        {fmt(start)}–{fmt(end)}
                      </span>
                      <span className="text-sm font-medium transition-colors group-hover:text-primary">
                        {m.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
      </div>
    </div>
  );
}
