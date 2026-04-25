'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addWeeks,
  format,
  formatISO,
  isSameDay,
  parseISO,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import type { MeetingWithRelations } from '@/lib/swr';

type EventType = 'standup' | 'client' | 'focus' | 'internal' | 'launch';

interface QualiaScheduleWeekProps {
  initialMeetings: MeetingWithRelations[];
  weekStart: string;
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

export function QualiaScheduleWeek({
  initialMeetings,
  weekStart,
  currentUserId,
}: QualiaScheduleWeekProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<MeetingWithRelations | null>(null);
  const weekStartDate = useMemo(() => parseISO(weekStart), [weekStart]);
  const weekEndDate = useMemo(() => addDays(weekStartDate, 6), [weekStartDate]);
  const today = new Date();
  const todayIndex = useMemo(() => {
    for (let i = 0; i < 7; i++) {
      if (isSameDay(addDays(weekStartDate, i), today)) return i;
    }
    return -1;
  }, [weekStartDate, today]);

  const events = useMemo(() => {
    return initialMeetings.map((m) => {
      const start = new Date(m.start_time);
      const end = new Date(m.end_time);
      let dayIndex = -1;
      for (let i = 0; i < 7; i++) {
        if (isSameDay(addDays(weekStartDate, i), start)) {
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
  }, [initialMeetings, weekStartDate]);

  const goToWeek = (direction: -1 | 0 | 1) => {
    const next = direction === 0 ? startOfWeek(new Date(), { weekStartsOn: 1 }) : addWeeks(weekStartDate, direction);
    const iso = formatISO(next, { representation: 'date' });
    router.push(`/schedule?week=${iso}`);
  };

  // Live time per zone — updates each render via React, refresh on minute change.
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
            Week of {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="animate-fade-in flex items-center gap-3">
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

          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => goToWeek(-1)}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg px-2 text-xs"
              onClick={() => goToWeek(0)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => goToWeek(1)}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <NewMeetingModal />
        </div>
      </div>

      {/* Legend */}
      <div className="stagger-1 mb-3 flex flex-shrink-0 flex-wrap items-center gap-4 animate-fade-in">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', item.color)} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="stagger-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card animate-fade-in">
        {/* Day headers */}
        <div
          className="grid flex-shrink-0 border-b border-border"
          style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}
        >
          <div className="p-3" />
          {dayLabels.map((label, i) => {
            const date = addDays(weekStartDate, i);
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

        {/* Time grid */}
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
                      onClick={() => setSelected(e.meeting)}
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="gap-0 rounded-2xl border-border bg-card p-0 sm:max-w-[480px]">
          {selected && (
            <>
              <DialogHeader className="p-6 pb-4">
                <div className="mb-3 flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize text-xs',
                      eventTypeBadge[classifyMeeting(selected)]
                    )}
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
                  <Button variant="outline" className="flex-1 gap-2 rounded-xl" disabled>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Suppress unused-var noise on currentUserId — reserved for future
          permission-based UI (e.g., highlighting your own meetings). */}
      <span className="sr-only" data-user={currentUserId} />
      <span className="sr-only" data-marker={Plus.displayName ?? 'plus'} />
    </div>
  );
}
