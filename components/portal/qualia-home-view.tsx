'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Check,
  ExternalLink,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useTodaysMeetings,
  useTeamTodaySnapshot,
  useEmployeeAssignments,
  useDailyBrief,
  invalidateDailyBrief,
  useNotifications,
  useCurrentWorkspaceId,
  useMilestonesDue,
  useOpenRequestsCount,
  type MilestoneDue,
} from '@/lib/swr';
import {
  dismissBriefItem,
  undismissBriefItem,
  createManualBriefItem,
  regenerateMyDailyBrief,
  type BriefItem,
} from '@/app/actions/daily-brief';
import { EmptyState } from '@/components/ui/empty-state';
import { useClockGate } from '@/components/clock-gate-provider';
import {
  AssignmentFocusCard,
  type AssignmentFocusItem,
} from '@/components/portal/assignment-focus-card';
import type { ClientWorkspace } from '@/app/actions/portal-workspaces';
import { hueFromId } from '@/lib/color-constants';
import { EmployeeDailyTasks } from '@/components/portal/employee-daily-tasks';

export type QualiaHomeRole = 'admin' | 'employee';

interface QualiaHomeViewProps {
  role: QualiaHomeRole;
  displayName: string;
  /** Admin only — used for active-projects count. */
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
    const raf = requestAnimationFrame(() => setMounted(true));
    const id = window.setInterval(() => setMounted((m) => m), 60_000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const timeStr = mounted
    ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const { isGated } = useClockGate();

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

  // Active projects: admin -> flatten workspaces; employee -> assignments.
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

  // Milestones due this week
  const activeProjectIds = useMemo(() => activeProjects.map((p) => p.id), [activeProjects]);
  const { milestones: milestonesDue } = useMilestonesDue(activeProjectIds);
  const milestonesDueCount = milestonesDue.length;

  // Open requests count
  const { count: openRequestsCount } = useOpenRequestsCount();

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
            {milestonesDueCount === 0
              ? 'No milestones due this week.'
              : `${milestonesDueCount} milestone${milestonesDueCount === 1 ? '' : 's'} due this week.`}
            {activeProjects.length > 0
              ? ` ${activeProjects.length} active ${
                  activeProjects.length === 1 ? 'project' : 'projects'
                } in flight.`
              : ''}
          </span>
        </div>
      </div>

      {/* Stats Grid — admin only (employees see info in subtitle + ClientPulse) */}
      {role === 'admin' && (
        <div className="stagger-1 mb-4 grid flex-shrink-0 animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Milestones Due
            </p>
            <p className="text-3xl font-bold tabular-nums">{milestonesDueCount}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">this week</p>
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
              Open Requests
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {openRequestsCount === 0 ? (
                <span className="text-base font-normal text-muted-foreground">All clear</span>
              ) : (
                openRequestsCount
              )}
            </p>
          </div>
        </div>
      )}

      {role === 'admin' ? (
        <AdminMainGrid
          teamMembers={teamMembers}
          activeProjects={activeProjects}
          meetings={meetings}
          milestonesDue={milestonesDue}
        />
      ) : (
        <EmployeeMainGrid
          assignments={employeeAssignments}
          userId={userId}
          meetings={meetings}
          isGated={isGated}
          milestonesDue={milestonesDue}
          openRequestsCount={openRequestsCount}
        />
      )}
    </div>
  );
}

/* --------- Milestones Card --------- */

function MilestonesCard({
  milestones,
  title = 'My Milestones',
  emptyText = 'No milestones due — coast is clear.',
  className,
}: {
  milestones: MilestoneDue[];
  title?: string;
  emptyText?: string;
  className?: string;
}) {
  const todayKey = new Date().toISOString().slice(0, 10);
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
            Milestones
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Target className="h-4 w-4" />
        </div>
      </div>
      {milestones.length === 0 ? (
        <EmptyState icon={Target} title={emptyText} compact minimal className="px-6 py-10" />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {milestones.map((m) => {
            const isOverdue = m.target_date != null && m.target_date < todayKey;
            const isDueThisWeek = m.target_date != null && m.target_date >= todayKey;
            const dueLabel = m.target_date
              ? new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              : null;
            return (
              <li key={m.id}>
                <Link
                  href={m.project ? `/projects/${m.project.id}/roadmap` : '#'}
                  className="block px-6 py-3.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        isOverdue ? 'bg-destructive' : 'bg-primary'
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {m.project ? (
                          <span className="truncate font-mono uppercase">{m.project.name}</span>
                        ) : null}
                        {m.project && dueLabel ? <span aria-hidden>·</span> : null}
                        {dueLabel ? (
                          <span
                            className={cn(
                              isOverdue
                                ? 'font-semibold text-destructive'
                                : isDueThisWeek
                                  ? 'font-semibold text-primary'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {isOverdue ? 'Overdue · ' : ''}
                            {dueLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------- Admin layout --------- */

function AdminMainGrid({
  teamMembers,
  activeProjects,
  meetings,
  milestonesDue,
}: {
  teamMembers: ReturnType<typeof useTeamTodaySnapshot>['members'];
  activeProjects: Array<{
    id: string;
    name: string;
    clientName: string;
    logoUrl: string | null;
    href: string;
  }>;
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
  milestonesDue: MilestoneDue[];
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-3">
      <div className="stagger-2 animate-fade-in lg:col-span-2">
        <DailyBriefCard />
      </div>

      <div className="stagger-3 animate-fade-in space-y-6">
        <MilestonesCard
          milestones={milestonesDue}
          title="Milestones This Week"
          emptyText="No milestones due this week."
        />

        <ClientPulseCard />

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

/* --------- Employee layout --------- */

function EmployeeMainGrid({
  assignments,
  userId,
  meetings,
  isGated,
  milestonesDue,
  openRequestsCount,
}: {
  assignments: AssignmentFocusItem[];
  userId?: string;
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
  isGated: boolean;
  milestonesDue: MilestoneDue[];
  openRequestsCount: number;
}) {
  return (
    <div className="stagger-2 grid min-h-0 flex-1 animate-fade-in gap-6 overflow-hidden lg:grid-cols-3">
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto lg:col-span-2">
        {userId && <EmployeeDailyTasks userId={userId} />}
        <AssignmentFocusCard
          assignments={assignments}
          employeeId={userId}
          isGated={isGated}
          compact
        />
        <MilestonesCard milestones={milestonesDue} className="min-h-0 flex-1" />
      </div>

      {/* Right column — Today's Meetings + Client Pulse (with open-request count merged in) */}
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
        <TodayMeetingsCard meetings={meetings} isGated={isGated} />
        <ClientPulseCard openRequestsCount={openRequestsCount} />
      </div>
    </div>
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
        <EmptyState icon={Calendar} title="Nothing on the calendar today" compact minimal />
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

/* --------- Client Pulse — recent client activity --------- */

interface ClientPulseNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  created_at: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
}

function pickPulseIcon(action: string | null): typeof Sparkles {
  const a = (action ?? '').toLowerCase();
  if (a.includes('message')) return MessageSquare;
  if (a.includes('feature') || a.includes('request') || a.includes('submitted')) return Sparkles;
  return Target;
}

function ClientPulseCard({
  className,
  openRequestsCount,
}: {
  className?: string;
  openRequestsCount?: number;
}) {
  const { workspaceId } = useCurrentWorkspaceId();
  const { notifications } = useNotifications(workspaceId || null);

  const items = useMemo(() => {
    const all = (notifications as ClientPulseNotification[]) ?? [];
    return all.filter((n) => n.type === 'client_activity').slice(0, 5);
  }, [notifications]);

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card',
        className
      )}
    >
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Client pulse
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">
            Recent activity
            {openRequestsCount !== undefined && openRequestsCount > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {openRequestsCount} open
              </span>
            ) : null}
          </h2>
        </div>
        <Link
          href="/requests"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary"
        >
          All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No client activity yet today"
          description="Quiet inbox"
          compact
          minimal
          className="px-5 py-8"
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const Icon = pickPulseIcon(item.message);
            const when = item.created_at
              ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
              : '';
            const inner = (
              <div className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    {item.message ?? item.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.title}</p>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                    {when}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={item.id}>
                {item.link ? (
                  <Link href={item.link} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------- Who's doing what (sidebar team snapshot) --------- */

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
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team activity yet"
          compact
          minimal
          className="px-5 py-8"
        />
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

/* --------- Daily Brief --------- */

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
