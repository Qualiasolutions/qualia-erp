'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday as isDateToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
  Video,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { MeetingRequestActions } from '@/components/portal/meeting-request-actions';
import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { useRealtimeMeetings } from '@/lib/hooks/use-realtime-meetings';

/** Meeting lifecycle status — mirrors meetings_status_check (migration 20260527181551). */
type MeetingStatus = 'confirmed' | 'requested' | 'declined' | 'cancelled';

function getMeetingStatus(m: MeetingWithRelations): MeetingStatus {
  const raw = (m as MeetingWithRelations & { status?: string | null }).status;
  if (raw === 'requested' || raw === 'declined' || raw === 'cancelled') return raw;
  return 'confirmed';
}

type EventType = 'standup' | 'client' | 'focus' | 'internal' | 'launch';
type ScheduleView = 'day' | 'week' | 'month';

interface QualiaScheduleWeekProps {
  initialMeetings: MeetingWithRelations[];
  /** ISO date string. For day = the day; week = monday of week; month = first of month. */
  anchor: string;
  view: ScheduleView;
  currentUserId: string;
}

const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 → 20:00
const HOUR_PX = 48;

const eventTypeBlock: Record<EventType, string> = {
  standup: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  client: 'bg-primary/10 border-primary/30 text-primary',
  focus: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  internal: 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
  launch: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
};

/**
 * Visual overlay for `status='requested'` meetings. Amber accent + dashed
 * border distinguishes pending requests from confirmed meetings at a
 * glance, regardless of the underlying event-type colour.
 */
const REQUESTED_BLOCK =
  'bg-amber-500/15 !border-amber-500/60 border-dashed text-amber-700 dark:text-amber-300';
const REQUESTED_CHIP =
  'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-dashed border-amber-500/60';

const eventTypeBadge: Record<EventType, string> = {
  standup: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  client: 'bg-primary/10 text-primary border-primary/20',
  focus: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  internal: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  launch: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const eventTypeChip: Record<EventType, string> = {
  standup: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  client: 'bg-primary/15 text-primary border border-primary/30',
  focus: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  internal: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30',
  launch: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
};

const legend: Array<{ label: string; color: string; type: EventType }> = [
  { label: 'Standup', color: 'bg-emerald-500', type: 'standup' },
  { label: 'Client', color: 'bg-primary', type: 'client' },
  { label: 'Focus', color: 'bg-blue-500', type: 'focus' },
  { label: 'Internal', color: 'bg-violet-500', type: 'internal' },
  { label: 'Launch', color: 'bg-red-500', type: 'launch' },
];

function classifyMeeting(m: MeetingWithRelations): EventType {
  const title = (m.title ?? '').toLowerCase();
  if (m.client) return 'client';
  if (/(standup|stand-up|daily|sync)/.test(title)) return 'standup';
  if (/(focus|deep work|writing|research)/.test(title)) return 'focus';
  if (/(launch|ship|release|expo|conference)/.test(title)) return 'launch';
  return 'internal';
}

function meetingInitials(m: MeetingWithRelations): string {
  const creator = Array.isArray(m.creator) ? m.creator[0] : m.creator;
  const name: string = (creator as { full_name?: string | null } | null)?.full_name ?? '';
  return (
    name
      .split(/\s+/)
      .map((p: string) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?'
  );
}

function flattenAttendees(m: MeetingWithRelations): string[] {
  const list: string[] = [];
  for (const a of m.attendees ?? []) {
    const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
    if (profile?.full_name) list.push(profile.full_name);
  }
  return list;
}

/**
 * Assign overlapping events into side-by-side lanes so they don't stack on
 * top of each other. Returns a map of event-key → { lane, lanes } where
 * `lane` is the column index (0-based) and `lanes` is the total columns
 * in that event's overlap cluster.
 *
 * Algorithm: sweep events in start-time order. Maintain an `active` set
 * of overlapping events; when an event ends before the next starts, it
 * leaves the cluster. Each new event picks the lowest free lane index.
 * At cluster boundaries we backfill `lanes` for every cluster member.
 */
function assignLanes<T extends { id: string; startHour: number; duration: number }>(
  events: T[]
): Map<string, { lane: number; lanes: number }> {
  const result = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...events].sort((a, b) => a.startHour - b.startHour || b.duration - a.duration);

  let cluster: T[] = [];
  let clusterMaxLane = 0;
  let lanesByEvent = new Map<string, number>();

  const finalizeCluster = () => {
    const total = clusterMaxLane + 1;
    for (const e of cluster) {
      result.set(e.id, { lane: lanesByEvent.get(e.id) ?? 0, lanes: total });
    }
    cluster = [];
    clusterMaxLane = 0;
    lanesByEvent = new Map();
  };

  for (const event of sorted) {
    // Drop events that no longer overlap with `event`.
    const stillActive = cluster.filter((e) => e.startHour + e.duration > event.startHour);
    if (stillActive.length === 0 && cluster.length > 0) {
      finalizeCluster();
    } else {
      cluster = stillActive;
    }

    // Find the lowest free lane index among currently-active events.
    const taken = new Set(cluster.map((e) => lanesByEvent.get(e.id) ?? 0));
    let lane = 0;
    while (taken.has(lane)) lane++;

    cluster.push(event);
    lanesByEvent.set(event.id, lane);
    if (lane > clusterMaxLane) clusterMaxLane = lane;
  }
  if (cluster.length > 0) finalizeCluster();

  return result;
}

/* ──────────────────────────────────────────────────────────────────────────
   Top-level shell — header + view switcher + dispatch
   ────────────────────────────────────────────────────────────────────────── */

export function QualiaScheduleWeek({
  initialMeetings,
  anchor: anchorISO,
  view,
  currentUserId,
}: QualiaScheduleWeekProps) {
  const router = useRouter();
  const { meetings: rawMeetings } = useMeetings(initialMeetings);
  useRealtimeMeetings();

  const anchor = useMemo(() => parseISO(anchorISO), [anchorISO]);
  const today = useMemo(() => new Date(), []);

  // Drop declined / cancelled rows from the schedule entirely — they would
  // otherwise clutter the grid and confuse the "what's actually happening"
  // read. Requested + confirmed rows render side-by-side with distinct
  // visual treatment (see eventTypeBlock + REQUESTED_BLOCK).
  const meetings = useMemo(
    () =>
      rawMeetings.filter((m) => {
        const status = getMeetingStatus(m);
        return status === 'confirmed' || status === 'requested';
      }),
    [rawMeetings]
  );

  const pendingRequests = useMemo(
    () =>
      meetings
        .filter((m) => getMeetingStatus(m) === 'requested')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [meetings]
  );

  const [selected, setSelected] = useState<MeetingWithRelations | null>(null);
  const [editing, setEditing] = useState<MeetingWithRelations | null>(null);

  // Persist the user's preferred view so they land on it next visit.
  useEffect(() => {
    try {
      window.localStorage.setItem('qualia.schedule.view', view);
    } catch {
      // ignore (privacy mode etc.)
    }
  }, [view]);

  // Navigation: prev / today / next moves by view unit.
  const navigate = (direction: -1 | 0 | 1) => {
    let next: Date;
    if (direction === 0) {
      next =
        view === 'day'
          ? new Date()
          : view === 'week'
            ? startOfWeek(new Date(), { weekStartsOn: 1 })
            : startOfMonth(new Date());
    } else if (view === 'day') {
      next = addDays(anchor, direction);
    } else if (view === 'week') {
      next = addWeeks(anchor, direction);
    } else {
      next = addMonths(anchor, direction);
    }
    const iso = formatISO(next, { representation: 'date' });
    router.push(`/schedule?view=${view}&anchor=${iso}`);
  };

  const switchView = (newView: ScheduleView) => {
    if (newView === view) return;
    let nextAnchor: Date;
    if (newView === 'day') {
      // When switching to day, snap to today (if anchor's date isn't already a single day).
      nextAnchor = isDateToday(anchor) ? anchor : new Date();
    } else if (newView === 'week') {
      nextAnchor = startOfWeek(anchor, { weekStartsOn: 1 });
    } else {
      nextAnchor = startOfMonth(anchor);
    }
    const iso = formatISO(nextAnchor, { representation: 'date' });
    router.push(`/schedule?view=${newView}&anchor=${iso}`);
  };

  // Header label adapts to view.
  const headerLabel = useMemo(() => {
    if (view === 'day') return format(anchor, 'EEEE, MMM d, yyyy');
    if (view === 'month') return format(anchor, 'MMMM yyyy');
    const end = addDays(anchor, 6);
    return `Week of ${format(anchor, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [view, anchor]);

  // Live time per zone (visual only, refreshes on render).
  const nicosiaTime = today.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Nicosia',
  });
  const ammanTime = today.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="animate-fade-in">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
              Schedule
            </h1>
          </div>
          <p className="ml-11 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">
            {headerLabel}
          </p>
        </div>

        <div className="flex animate-fade-in flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 text-sm lg:flex">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nicosia</p>
              <p className="font-mono font-semibold tabular-nums">{nicosiaTime}</p>
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-primary">Amman</p>
              <p className="font-mono font-semibold tabular-nums text-primary">{ammanTime}</p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1" role="tablist">
            {(['day', 'week', 'month'] as const).map((v) => {
              const active = v === view;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchView(v)}
                  className={cn(
                    'h-11 min-w-[44px] cursor-pointer rounded-lg px-3 text-xs font-medium capitalize transition-colors duration-150 sm:h-8',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-lg sm:h-9 sm:w-9"
              onClick={() => navigate(-1)}
              aria-label={`Previous ${view}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-11 rounded-lg px-3 text-xs sm:h-9 sm:px-2"
              onClick={() => navigate(0)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-lg sm:h-9 sm:w-9"
              onClick={() => navigate(1)}
              aria-label={`Next ${view}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <NewMeetingModal />
        </div>
      </div>

      {/* Legend */}
      <div className="stagger-1 mb-3 flex flex-shrink-0 animate-fade-in flex-wrap items-center gap-x-4 gap-y-2">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', item.color)} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
        <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden />
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full border border-dashed border-amber-500 bg-amber-500/40"
            aria-hidden
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            Requested
          </span>
        </div>
      </div>

      {/* Pending requests panel — visible whenever there is at least one
          status='requested' meeting in the loaded range. Acts as the
          actionable "inbox" so admins don't have to hunt for amber blocks. */}
      {pendingRequests.length > 0 && (
        <PendingRequestsPanel requests={pendingRequests} onOpen={setSelected} />
      )}

      {/* Grid */}
      {view === 'day' && <DayGrid meetings={meetings} day={anchor} onSelect={setSelected} />}
      {view === 'week' && (
        <WeekGrid meetings={meetings} weekStart={anchor} onSelect={setSelected} />
      )}
      {view === 'month' && (
        <MonthGrid meetings={meetings} monthStart={anchor} onSelect={setSelected} />
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="gap-0 rounded-2xl border-border bg-card p-0 sm:max-w-[480px]">
          {selected && (
            <>
              <DialogHeader className="p-6 pb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn('text-xs capitalize', eventTypeBadge[classifyMeeting(selected)])}
                  >
                    {classifyMeeting(selected)}
                  </Badge>
                  {getMeetingStatus(selected) === 'requested' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500/60 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                      <AlertCircle className="h-3 w-3" aria-hidden />
                      Requested
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-semibold leading-relaxed">
                  {selected.title}
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 pb-6">
                {selected.description && (
                  <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {selected.description}
                  </p>
                )}

                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="w-20 text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {format(new Date(selected.start_time), 'HH:mm')} —{' '}
                      {format(new Date(selected.end_time), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="w-20 text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(new Date(selected.start_time), 'EEE, MMM d, yyyy')}
                    </span>
                  </div>
                  {(() => {
                    const link = (
                      selected as MeetingWithRelations & { meeting_link?: string | null }
                    ).meeting_link;
                    return link ? (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="w-20 text-muted-foreground">Location</span>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-medium text-primary hover:underline"
                        >
                          {link.replace(/^https?:\/\//, '').slice(0, 40)}
                        </a>
                      </div>
                    ) : null;
                  })()}
                  {flattenAttendees(selected).length > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                      <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="w-20 flex-shrink-0 text-muted-foreground">Attendees</span>
                      <div className="flex flex-wrap gap-1.5">
                        {flattenAttendees(selected).map((name, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-muted/50 text-xs font-normal"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {getMeetingStatus(selected) === 'requested' ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Respond to this request
                    </p>
                    <MeetingRequestActions
                      meetingId={selected.id}
                      meetingTitle={selected.title}
                      layout="stacked"
                      onResolved={() => setSelected(null)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditing(selected);
                        setSelected(null);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit details before responding
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-3">
                    {(() => {
                      const link = (
                        selected as MeetingWithRelations & { meeting_link?: string | null }
                      ).meeting_link;
                      return link ? (
                        <Button asChild className="flex-1 gap-2 rounded-xl">
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4" />
                            Join Meeting
                          </a>
                        </Button>
                      ) : null;
                    })()}
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 rounded-xl"
                      onClick={() => {
                        setEditing(selected);
                        setSelected(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <EditMeetingModal
        meeting={
          editing
            ? {
                id: editing.id,
                title: editing.title,
                description: editing.description ?? null,
                start_time: editing.start_time,
                end_time: editing.end_time,
                meeting_link:
                  (editing as MeetingWithRelations & { meeting_link?: string | null })
                    .meeting_link ?? null,
                project: (() => {
                  const p = (
                    editing as MeetingWithRelations & {
                      project?:
                        | { id: string; name: string }
                        | { id: string; name: string }[]
                        | null;
                    }
                  ).project;
                  if (!p) return null;
                  return Array.isArray(p) ? (p[0] ?? null) : p;
                })(),
                attendees: editing.attendees ?? [],
              }
            : null
        }
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />

      <span className="sr-only" data-user={currentUserId} />
      <span className="sr-only" data-marker={Plus.displayName ?? 'plus'} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Week grid (7 columns × 13 hours)
   ────────────────────────────────────────────────────────────────────────── */

function WeekGrid({
  meetings,
  weekStart,
  onSelect,
}: {
  meetings: MeetingWithRelations[];
  weekStart: Date;
  onSelect: (m: MeetingWithRelations) => void;
}) {
  const today = new Date();
  const todayIndex = (() => {
    for (let i = 0; i < 7; i++) if (isSameDay(addDays(weekStart, i), today)) return i;
    return -1;
  })();

  const events = useMemo(() => {
    return meetings.map((m) => {
      const start = new Date(m.start_time);
      const end = new Date(m.end_time);
      let dayIndex = -1;
      for (let i = 0; i < 7; i++) {
        if (isSameDay(addDays(weekStart, i), start)) {
          dayIndex = i;
          break;
        }
      }
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const duration = Math.max(0.5, endHour - startHour);
      return {
        id: m.id,
        meeting: m,
        type: classifyMeeting(m),
        dayIndex,
        startHour,
        duration,
        startLabel: format(start, 'HH:mm'),
        endLabel: format(end, 'HH:mm'),
      };
    });
  }, [meetings, weekStart]);

  // Assign lanes per-day so overlapping events render side-by-side.
  const lanesByDay = useMemo(() => {
    const map = new Map<number, Map<string, { lane: number; lanes: number }>>();
    for (let i = 0; i < 7; i++) {
      const dayEvents = events.filter((e) => e.dayIndex === i);
      map.set(i, assignLanes(dayEvents));
    }
    return map;
  }, [events]);

  return (
    <div className="stagger-2 flex min-h-0 flex-1 animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="grid flex-shrink-0 border-b border-border"
        style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}
      >
        <div className="p-3" />
        {dayLabels.map((label, i) => {
          const date = addDays(weekStart, i);
          const isToday = i === todayIndex;
          return (
            <div
              key={label}
              className={cn(
                'border-l border-border px-3 py-2 text-center',
                isToday && 'bg-primary/5'
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-base font-semibold',
                  isToday &&
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground'
                )}
              >
                {format(date, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}
      >
        <div className="divide-y divide-border/30">
          {hours.map((h) => (
            <div key={h} className="h-12 pr-2 pt-0.5 text-right">
              <span className="font-mono text-[9px] text-muted-foreground/60">
                {h.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {dayLabels.map((_, dayIndex) => (
          <div
            key={dayIndex}
            className={cn(
              'relative divide-y divide-border/20 border-l border-border',
              dayIndex === todayIndex && 'bg-primary/5'
            )}
          >
            {hours.map((h) => (
              <div key={h} className="h-12" />
            ))}

            {events
              .filter((e) => e.dayIndex === dayIndex)
              .map((e) => {
                const top = (e.startHour - hours[0]) * HOUR_PX;
                const height = e.duration * HOUR_PX;
                const placement = lanesByDay.get(dayIndex)?.get(e.id) ?? {
                  lane: 0,
                  lanes: 1,
                };
                const leftPct = (placement.lane / placement.lanes) * 100;
                const widthPct = (1 / placement.lanes) * 100;
                const isRequested = getMeetingStatus(e.meeting) === 'requested';
                return (
                  <button
                    key={e.meeting.id}
                    type="button"
                    onClick={() => onSelect(e.meeting)}
                    className={cn(
                      'absolute cursor-pointer overflow-hidden rounded-md border px-1.5 py-0.5 text-left shadow-sm transition-shadow duration-150 hover:shadow-md',
                      isRequested ? REQUESTED_BLOCK : eventTypeBlock[e.type]
                    )}
                    style={{
                      top: `${Math.max(0, top)}px`,
                      height: `${Math.max(height - 2, 22)}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                    aria-label={
                      isRequested
                        ? `Pending request: ${e.meeting.title}`
                        : `Meeting: ${e.meeting.title}`
                    }
                  >
                    <div className="flex items-center gap-1">
                      {isRequested && (
                        <AlertCircle
                          className="h-2.5 w-2.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                          aria-hidden
                        />
                      )}
                      <p className="truncate text-[10px] font-semibold leading-tight">
                        {e.meeting.title}
                      </p>
                    </div>
                    {height > 30 && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[9px] font-medium opacity-70">
                          {meetingInitials(e.meeting)}
                        </span>
                        <span className="text-[9px] opacity-50">
                          {e.startLabel}–{e.endLabel}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Day grid (single column × 13 hours)
   ────────────────────────────────────────────────────────────────────────── */

function DayGrid({
  meetings,
  day,
  onSelect,
}: {
  meetings: MeetingWithRelations[];
  day: Date;
  onSelect: (m: MeetingWithRelations) => void;
}) {
  const isToday = isSameDay(day, new Date());

  const events = useMemo(() => {
    return meetings
      .filter((m) => isSameDay(new Date(m.start_time), day))
      .map((m) => {
        const start = new Date(m.start_time);
        const end = new Date(m.end_time);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;
        const duration = Math.max(0.5, endHour - startHour);
        return {
          id: m.id,
          meeting: m,
          type: classifyMeeting(m),
          startHour,
          duration,
          startLabel: format(start, 'HH:mm'),
          endLabel: format(end, 'HH:mm'),
        };
      });
  }, [meetings, day]);

  const lanes = useMemo(() => assignLanes(events), [events]);

  // Current-time indicator (only when viewing today).
  const [nowOffset, setNowOffset] = useState<number | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- interval-driven current-time indicator; fires on timer not render */
  useEffect(() => {
    if (!isToday) {
      setNowOffset(null);
      return;
    }
    const compute = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h < hours[0] || h > hours[hours.length - 1] + 1) {
        setNowOffset(null);
      } else {
        setNowOffset((h - hours[0]) * HOUR_PX);
      }
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [isToday]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="stagger-2 flex min-h-0 flex-1 animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="grid flex-shrink-0 border-b border-border"
        style={{ gridTemplateColumns: '56px 1fr' }}
      >
        <div className="p-3" />
        <div
          className={cn('flex items-baseline gap-2 px-4 py-2.5', isToday && 'bg-primary/[0.04]')}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {format(day, 'EEEE')}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            · {events.length} {events.length === 1 ? 'meeting' : 'meetings'}
          </span>
        </div>
      </div>

      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{ gridTemplateColumns: '56px 1fr' }}
      >
        <div className="relative">
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute right-2 font-mono text-[10px] tabular-nums text-muted-foreground/70"
              style={{ top: `${i * HOUR_PX - 6}px` }}
            >
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div
          className={cn('relative border-l border-border', isToday && 'bg-primary/[0.025]')}
          style={{ height: `${hours.length * HOUR_PX}px` }}
        >
          {/* Hour gridlines */}
          {hours.map((_, i) => (
            <div
              key={`h-${i}`}
              className="pointer-events-none absolute inset-x-0 border-t border-border/60"
              style={{ top: `${i * HOUR_PX}px` }}
            />
          ))}
          {/* Half-hour dotted dividers */}
          {hours.map((_, i) => (
            <div
              key={`hh-${i}`}
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/30"
              style={{ top: `${i * HOUR_PX + HOUR_PX / 2}px` }}
            />
          ))}
          {/* Bottom edge */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-border/60"
            style={{ top: `${hours.length * HOUR_PX}px` }}
          />

          {/* Current-time indicator */}
          {nowOffset !== null && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: `${nowOffset}px` }}
              aria-hidden="true"
            >
              <div className="relative">
                <span className="absolute -left-1 -top-1 inline-block h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_hsl(0_84%_60%/0.55)]" />
                <div className="border-t-[1.5px] border-red-500/80" />
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Nothing scheduled for {format(day, 'EEEE')}.
              </p>
            </div>
          ) : null}

          {events.map((e) => {
            const top = (e.startHour - hours[0]) * HOUR_PX;
            const height = e.duration * HOUR_PX;
            const placement = lanes.get(e.id) ?? { lane: 0, lanes: 1 };
            const gap = 4; // px between adjacent lanes
            const leftPct = (placement.lane / placement.lanes) * 100;
            const widthPct = (1 / placement.lanes) * 100;
            const tall = height >= 44;
            const veryTall = height >= 72;
            const isRequested = getMeetingStatus(e.meeting) === 'requested';
            return (
              <button
                key={e.meeting.id}
                type="button"
                onClick={() => onSelect(e.meeting)}
                className={cn(
                  'group absolute cursor-pointer overflow-hidden rounded-md border text-left shadow-sm transition-all duration-150',
                  'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isRequested ? REQUESTED_BLOCK : eventTypeBlock[e.type]
                )}
                style={{
                  top: `${Math.max(0, top)}px`,
                  height: `${Math.max(height - 2, 22)}px`,
                  left: `calc(${leftPct}% + 6px)`,
                  width: `calc(${widthPct}% - ${gap + (placement.lane === placement.lanes - 1 ? 12 : 8)}px)`,
                }}
                aria-label={
                  isRequested
                    ? `Pending request: ${e.meeting.title}`
                    : `Meeting: ${e.meeting.title}`
                }
              >
                <div className={cn('px-2.5 py-1', tall ? 'py-1.5' : 'py-1')}>
                  <div className="flex items-center gap-1.5">
                    {isRequested && (
                      <AlertCircle
                        className="h-3 w-3 flex-shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden
                      />
                    )}
                    <p
                      className={cn(
                        'truncate font-semibold leading-tight',
                        tall ? 'text-[13px]' : 'text-[12px]'
                      )}
                    >
                      {e.meeting.title}
                    </p>
                  </div>
                  {tall && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] tabular-nums opacity-80">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span>
                        {e.startLabel}–{e.endLabel}
                      </span>
                      <span className="opacity-50">·</span>
                      <span className="font-mono">{meetingInitials(e.meeting)}</span>
                      {isRequested && (
                        <span className="ml-auto rounded-full bg-amber-500/25 px-1.5 py-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                          Requested
                        </span>
                      )}
                    </div>
                  )}
                  {veryTall && flattenAttendees(e.meeting).length > 0 && (
                    <p className="mt-1 truncate text-[10.5px] opacity-70">
                      {flattenAttendees(e.meeting).slice(0, 3).join(', ')}
                      {flattenAttendees(e.meeting).length > 3
                        ? ` +${flattenAttendees(e.meeting).length - 3}`
                        : ''}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Month grid (6 rows × 7 cols)
   ────────────────────────────────────────────────────────────────────────── */

function MonthGrid({
  meetings,
  monthStart,
  onSelect,
}: {
  meetings: MeetingWithRelations[];
  monthStart: Date;
  onSelect: (m: MeetingWithRelations) => void;
}) {
  const today = new Date();
  const gridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  // 6 rows × 7 cols = 42 cells covers any month
  const days = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [gridStart]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, MeetingWithRelations[]>();
    for (const m of meetings) {
      const key = format(new Date(m.start_time), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    // sort each day's meetings by time
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }
    return map;
  }, [meetings]);

  return (
    <div className="stagger-2 flex min-h-0 flex-1 animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Day-of-week header */}
      <div
        className="grid flex-shrink-0 border-b border-border"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
      >
        {dayLabels.map((label) => (
          <div
            key={label}
            className="border-l border-border px-3 py-2 text-center first:border-l-0"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* 6 rows × 7 cols */}
      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(100px, 1fr)',
        }}
      >
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, monthStart);
          const isToday = isSameDay(d, today);
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDay.get(dayKey) ?? [];
          const visible = dayMeetings.slice(0, 3);
          const extra = dayMeetings.length - visible.length;

          // Hide overflow rows after the last week containing the month end.
          const rowIndex = Math.floor(i / 7);
          const lastDayInRow = addDays(d, 6 - (i % 7));
          const showRow = i < 35 || rowIndex === 5 ? lastDayInRow >= monthStart : true;
          if (!showRow) return null;

          return (
            <div
              key={i}
              className={cn(
                'flex min-w-0 flex-col gap-1 border-l border-t border-border px-2 py-1.5 first:border-l-0',
                !inMonth && 'bg-muted/20',
                isToday && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                  )}
                >
                  {format(d, 'd')}
                </span>
                {dayMeetings.length > 0 && (
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {dayMeetings.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((m) => {
                  const type = classifyMeeting(m);
                  const isRequested = getMeetingStatus(m) === 'requested';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelect(m)}
                      className={cn(
                        'flex w-full items-center gap-1 overflow-hidden rounded-sm px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-90',
                        isRequested ? REQUESTED_CHIP : eventTypeChip[type]
                      )}
                      title={
                        isRequested
                          ? `Requested: ${m.title} · ${format(new Date(m.start_time), 'HH:mm')}`
                          : `${m.title} · ${format(new Date(m.start_time), 'HH:mm')}`
                      }
                    >
                      {isRequested && (
                        <AlertCircle
                          className="h-2.5 w-2.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                          aria-hidden
                        />
                      )}
                      <span className="font-mono opacity-70">
                        {format(new Date(m.start_time), 'HH:mm')}
                      </span>
                      <span className="truncate">{m.title}</span>
                    </button>
                  );
                })}
                {extra > 0 && (
                  <span className="px-1.5 text-[10px] font-medium text-muted-foreground">
                    +{extra} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* keep monthEnd referenced so the linter doesn't strip the import */}
      <span className="sr-only" data-month-end={formatISO(monthEnd, { representation: 'date' })} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Pending Requests panel — sits between the legend and the grid whenever
   the loaded range contains any `status='requested'` meetings.

   Acts as an actionable inbox: clicking a row opens the meeting detail
   dialog (which carries the full confirm / decline flow); the inline
   confirm / decline buttons on each row let admins resolve a request
   without leaving the schedule view.
   ────────────────────────────────────────────────────────────────────────── */

function PendingRequestsPanel({
  requests,
  onOpen,
}: {
  requests: MeetingWithRelations[];
  onOpen: (m: MeetingWithRelations) => void;
}) {
  return (
    <section
      aria-label="Pending meeting requests"
      className="stagger-1 mb-4 flex flex-shrink-0 animate-fade-in flex-col gap-2 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/[0.06] p-3 sm:p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" aria-hidden />
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Pending requests</h2>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
            {requests.length}
          </span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Awaiting your response
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {requests.slice(0, 6).map((m) => {
          const start = new Date(m.start_time);
          const end = new Date(m.end_time);
          const client = Array.isArray(m.client) ? m.client[0] : m.client;
          return (
            <li
              key={m.id}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card/80 p-3 transition-shadow duration-150 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <button
                type="button"
                onClick={() => onOpen(m)}
                className="-m-1 flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Open details for ${m.title}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                    {format(start, 'EEE MMM d')} · {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {m.title}
                </p>
                {client?.display_name && (
                  <p className="truncate text-xs text-muted-foreground">{client.display_name}</p>
                )}
              </button>
              <MeetingRequestActions
                meetingId={m.id}
                meetingTitle={m.title}
                layout="inline"
                className="sm:flex-shrink-0"
              />
            </li>
          );
        })}
      </ul>

      {requests.length > 6 && (
        <p className="text-[11px] text-muted-foreground">
          +{requests.length - 6} more — scroll the grid below to find amber-bordered blocks for the
          rest.
        </p>
      )}
    </section>
  );
}
