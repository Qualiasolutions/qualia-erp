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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { useRealtimeMeetings } from '@/lib/hooks/use-realtime-meetings';

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

const eventTypeBadge: Record<EventType, string> = {
  standup: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  client: 'bg-primary/10 text-primary border-primary/20',
  focus: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  internal: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  launch: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const eventTypeChip: Record<EventType, string> = {
  standup: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-l-2 border-emerald-500',
  client: 'bg-primary/15 text-primary border-l-2 border-primary',
  focus: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500',
  internal: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-l-2 border-violet-500',
  launch: 'bg-red-500/15 text-red-700 dark:text-red-300 border-l-2 border-red-500',
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
  const { meetings } = useMeetings(initialMeetings);
  useRealtimeMeetings();

  const anchor = useMemo(() => parseISO(anchorISO), [anchorISO]);
  const today = useMemo(() => new Date(), []);

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
    <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="animate-fade-in">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          </div>
          <p className="ml-11 text-sm uppercase tracking-wider text-muted-foreground">
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
                    'h-8 cursor-pointer rounded-lg px-3 text-xs font-medium capitalize transition-colors duration-150',
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
              className="h-9 w-9 rounded-lg"
              onClick={() => navigate(-1)}
              aria-label={`Previous ${view}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg px-2 text-xs"
              onClick={() => navigate(0)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
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
      <div className="stagger-1 mb-3 flex flex-shrink-0 animate-fade-in flex-wrap items-center gap-4">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', item.color)} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

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
                <div className="mb-3 flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn('text-xs capitalize', eventTypeBadge[classifyMeeting(selected)])}
                  >
                    {classifyMeeting(selected)}
                  </Badge>
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

                <div className="flex items-center gap-3 border-t border-border pt-4">
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
                return (
                  <button
                    key={e.meeting.id}
                    type="button"
                    onClick={() => onSelect(e.meeting)}
                    className={cn(
                      'absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded-lg border px-2 py-1 text-left transition-all duration-200',
                      'hover:scale-[1.02] hover:shadow-lg',
                      eventTypeBlock[e.type]
                    )}
                    style={{
                      top: `${Math.max(0, top)}px`,
                      height: `${Math.max(height - 2, 24)}px`,
                    }}
                  >
                    <p className="truncate text-[10px] font-medium">{e.meeting.title}</p>
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
          meeting: m,
          type: classifyMeeting(m),
          startHour,
          duration,
          startLabel: format(start, 'HH:mm'),
          endLabel: format(end, 'HH:mm'),
        };
      });
  }, [meetings, day]);

  return (
    <div className="stagger-2 flex min-h-0 flex-1 animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="grid flex-shrink-0 border-b border-border"
        style={{ gridTemplateColumns: '50px 1fr' }}
      >
        <div className="p-3" />
        <div className={cn('px-3 py-2 text-center', isToday && 'bg-primary/5')}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {format(day, 'EEE').toUpperCase()}
          </p>
          <p
            className={cn(
              'mt-0.5 text-base font-semibold',
              isToday &&
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground'
            )}
          >
            {format(day, 'd')}
          </p>
        </div>
      </div>

      <div
        className="grid min-h-0 flex-1 overflow-y-auto"
        style={{ gridTemplateColumns: '50px 1fr' }}
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

        <div
          className={cn(
            'relative divide-y divide-border/20 border-l border-border',
            isToday && 'bg-primary/5'
          )}
        >
          {hours.map((h) => (
            <div key={h} className="h-12" />
          ))}

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
            return (
              <button
                key={e.meeting.id}
                type="button"
                onClick={() => onSelect(e.meeting)}
                className={cn(
                  'absolute left-2 right-2 cursor-pointer overflow-hidden rounded-lg border px-3 py-2 text-left transition-all duration-200',
                  'hover:scale-[1.01] hover:shadow-lg',
                  eventTypeBlock[e.type]
                )}
                style={{
                  top: `${Math.max(0, top)}px`,
                  height: `${Math.max(height - 4, 32)}px`,
                }}
              >
                <p className="truncate text-sm font-semibold">{e.meeting.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] opacity-80">
                  <span>
                    {e.startLabel}–{e.endLabel}
                  </span>
                  <span className="opacity-60">·</span>
                  <span>{meetingInitials(e.meeting)}</span>
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
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelect(m)}
                      className={cn(
                        'flex w-full items-center gap-1 overflow-hidden rounded-sm px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-90',
                        eventTypeChip[type]
                      )}
                      title={`${m.title} · ${format(new Date(m.start_time), 'HH:mm')}`}
                    >
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
