'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useTodaysMeetings,
  useEmployeeAssignments,
  useNotifications,
  useCurrentWorkspaceId,
  useMilestonesDue,
  useOpenRequestsCount,
  type MilestoneDue,
} from '@/lib/swr';
import { EmptyState } from '@/components/ui/empty-state';
import { useClockGate } from '@/components/clock-gate-provider';
import {
  AssignmentFocusCard,
  type AssignmentFocusItem,
} from '@/components/portal/assignment-focus-card';
import { EmployeeDailyTasks } from '@/components/portal/employee-daily-tasks';
import {
  createDashboardNote,
  deleteDashboardNote,
  getDashboardNotes,
  togglePinNote,
  updateDashboardNote,
  type DashboardNote,
} from '@/app/actions/dashboard-notes';

export type QualiaHomeRole = 'admin' | 'employee';

const OWNER_WAITING_ITEMS = [
  { status: 'Waiting on requirements', item: 'SHSO' },
  { status: 'Waiting on requirements', item: 'Kronospan' },
  { status: 'Waiting on requirements', item: 'Velicor' },
  { status: 'Reply / forms', item: '7Buddas - ask him to refill the form' },
  { status: 'Website remake', item: 'AI Expo / Maxim - remake the Health AI Expo website' },
  { status: 'Close-off', item: 'Geo - close off officially what is happening' },
  { status: 'Waiting on demo', item: 'Moayad demo' },
  { status: 'Waiting on decision', item: 'Sanad Dispatcher' },
  { status: 'Waiting on decision', item: 'Fotini' },
  { status: 'Proposal to create', item: 'Cellas - create proposal' },
] as const;

type OwnerWaitingItem = (typeof OWNER_WAITING_ITEMS)[number];

interface QualiaHomeViewProps {
  role: QualiaHomeRole;
  displayName: string;
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

export function QualiaHomeView({ role, displayName, userId }: QualiaHomeViewProps) {
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

  const { data: assignments } = useEmployeeAssignments(role === 'employee' ? userId : undefined);

  const employeeAssignments = useMemo<AssignmentFocusItem[]>(() => {
    if (role !== 'employee') return [];
    return ((assignments ?? []) as AssignmentFocusItem[]).filter((a) => a.project);
  }, [assignments, role]);

  const activeProjects = useMemo(() => {
    return employeeAssignments
      .filter((a) => a.project && a.project.status === 'Active')
      .map((a) => ({
        id: a.project!.id,
        name: a.project!.name,
        clientName: a.project!.client?.name ?? 'No client',
        logoUrl: a.project!.logo_url ?? null,
        href: `/projects/${a.project!.id}/roadmap`,
      }));
  }, [employeeAssignments]);

  // Employee milestone card still uses due-this-week. Admin uses project progress instead.
  const activeProjectIds = useMemo(
    () => (role === 'employee' ? activeProjects.map((p) => p.id) : []),
    [activeProjects, role]
  );
  const { milestones: milestonesDue } = useMilestonesDue(activeProjectIds);
  const milestonesDueCount = milestonesDue.length;

  // Open requests count
  const { count: openRequestsCount } = useOpenRequestsCount();

  const firstName = displayName.split(' ')[0] || displayName;
  const weekSummary =
    role === 'admin'
      ? `${OWNER_WAITING_ITEMS.length} manual follow-ups`
      : milestonesDueCount === 0
        ? 'No milestones due this week'
        : `${milestonesDueCount} milestone${milestonesDueCount === 1 ? '' : 's'} due this week`;
  const activeSummary =
    role === 'admin'
      ? 'Manual dashboard'
      : activeProjects.length > 0
        ? `${activeProjects.length} active ${activeProjects.length === 1 ? 'project' : 'projects'}`
        : 'No active projects';

  return (
    <div className="flex h-full flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <header className="stagger-1 mb-4 flex-shrink-0 animate-fade-in rounded-xl border border-border bg-card px-4 py-3 md:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                {dayName}
              </span>
              <span aria-hidden>·</span>
              <span>{dateStr}</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{timeStr}</span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight md:text-xl">
              {getGreeting(hour)}, <span className="text-primary">{firstName}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:justify-end">
            <span className="rounded-md bg-primary/[0.07] px-2 py-1 font-medium text-primary">
              {weekSummary}
            </span>
            <span className="rounded-md bg-muted/60 px-2 py-1">{activeSummary}</span>
          </div>
        </div>
      </header>

      {role === 'admin' ? (
        <AdminMainGrid meetings={meetings} />
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
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card',
        className
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
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
        <EmptyState icon={Target} title={emptyText} compact minimal className="px-5 py-8" />
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
                  className="block px-5 py-3 transition-colors hover:bg-muted/30"
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
  meetings,
}: {
  meetings: Array<{ id: string; title: string; start_time: string; end_time: string }>;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-3">
      <div className="stagger-2 animate-fade-in space-y-6 lg:col-span-2">
        <OwnerWaitingListCard />
        <OwnerDashboardNotesCard />
      </div>

      <div className="stagger-3 animate-fade-in space-y-6">
        <TodayMeetingsCard meetings={meetings} isGated={false} />
        <ClientPulseCard />
      </div>
    </div>
  );
}

function OwnerWaitingListCard() {
  const grouped = OWNER_WAITING_ITEMS.reduce<Record<string, OwnerWaitingItem[]>>((acc, entry) => {
    acc[entry.status] = [...(acc[entry.status] ?? []), entry];
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Fawzi dashboard
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">Waiting list</h2>
        </div>
        <Badge variant="secondary" className="px-2 py-0.5 text-xs">
          {OWNER_WAITING_ITEMS.length}
        </Badge>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        {Object.entries(grouped).map(([status, items]) => (
          <section key={status} className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{status}</p>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((entry) => (
                <li key={`${entry.status}-${entry.item}`} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                  <span className="min-w-0 break-words text-sm leading-snug text-foreground">
                    {entry.item}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function OwnerDashboardNotesCard() {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const refreshNotes = useCallback(async () => {
    try {
      const data = await getDashboardNotes();
      setNotes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDashboardNotes();
        if (!cancelled) setNotes(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load dashboard notes');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = () => {
    const content = draft.trim();
    if (!content) return;

    startTransition(async () => {
      const result = await createDashboardNote(content);
      if (!result.success) {
        toast.error(result.error || 'Failed to add note');
        return;
      }
      setDraft('');
      await refreshNotes();
      toast.success('Added to dashboard');
    });
  };

  const handleUpdate = (noteId: string) => {
    const content = editingContent.trim();
    if (!content) return;

    startTransition(async () => {
      const result = await updateDashboardNote(noteId, content);
      if (!result.success) {
        toast.error(result.error || 'Failed to update note');
        return;
      }
      setEditingId(null);
      setEditingContent('');
      await refreshNotes();
      toast.success('Dashboard note updated');
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      const result = await deleteDashboardNote(noteId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete note');
        return;
      }
      await refreshNotes();
      toast.success('Removed from dashboard');
    });
  };

  const handleTogglePin = (note: DashboardNote) => {
    startTransition(async () => {
      const result = await togglePinNote(note.id, !note.pinned);
      if (!result.success) {
        toast.error(result.error || 'Failed to update pin');
        return;
      }
      await refreshNotes();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Dynamic dashboard
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight">Pinned notes</h2>
        </div>
        <Badge variant="secondary" className="px-2 py-0.5 text-xs">
          {notes.filter((note) => note.pinned).length}/{notes.length}
        </Badge>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Keep a client follow-up, decision, or proposal in front of you..."
            className="min-h-20 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={!draft.trim() || isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add note
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No dynamic notes yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const editing = editingId === note.id;
              return (
                <li
                  key={note.id}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    note.pinned
                      ? 'border-primary/30 bg-primary/[0.04]'
                      : 'border-border bg-background/60'
                  )}
                >
                  {editing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="min-h-24 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent('');
                          }}
                          className="gap-2"
                        >
                          <X className="size-3.5" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!editingContent.trim() || isPending}
                          onClick={() => handleUpdate(note.id)}
                          className="gap-2"
                        >
                          <Save className="size-3.5" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                        className={cn(
                          'mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                          note.pinned
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {note.content}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditingContent(note.content);
                          }}
                          aria-label="Edit note"
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          aria-label="Delete note"
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5',
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
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card',
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
