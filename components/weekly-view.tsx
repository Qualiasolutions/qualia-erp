'use client';

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
  differenceInMinutes,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Pencil,
  Video,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';
import { useTimezone, TIMEZONE_CYPRUS } from '@/lib/schedule-utils';

// ============ Types ============

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  meeting_link?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface WeeklyViewProps {
  meetings: Meeting[];
}

// ============ Constants ============

const HOUR_HEIGHT = 96; // px per hour — generous for readability
const VISIBLE_HOURS = { from: 7, to: 22 };

// ============ Helpers ============

/** Group overlapping events into columns */
function groupEvents(
  dayEvents: { id: string; start: Date; end: Date; meeting: Meeting }[]
): { col: number; totalCols: number; meeting: Meeting; start: Date; end: Date }[] {
  const sorted = [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  const columns: { end: Date; id: string }[][] = [];
  const colMap = new Map<string, number>();

  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (ev.start >= last.end) {
        columns[c].push({ end: ev.end, id: ev.id });
        colMap.set(ev.id, c);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([{ end: ev.end, id: ev.id }]);
      colMap.set(ev.id, columns.length - 1);
    }
  }

  const totalCols = columns.length;
  return sorted.map((ev) => ({
    col: colMap.get(ev.id) ?? 0,
    totalCols,
    meeting: ev.meeting,
    start: ev.start,
    end: ev.end,
  }));
}

function getVisibleHours(events: { start: Date; end: Date }[]) {
  let earliest = VISIBLE_HOURS.from;
  let latest = VISIBLE_HOURS.to;

  for (const ev of events) {
    if (ev.start.getHours() < earliest) earliest = ev.start.getHours();
    const endH = ev.end.getHours() + (ev.end.getMinutes() > 0 ? 1 : 0);
    if (endH > latest) latest = Math.min(endH, 24);
  }

  return {
    hours: Array.from({ length: latest - earliest }, (_, i) => i + earliest),
    from: earliest,
    to: latest,
  };
}

// ============ Component ============

export function WeeklyView({ meetings }: WeeklyViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const isCurrentWeek = useMemo(() => {
    const today = toZonedTime(new Date(), timezone);
    return isSameDay(startOfWeek(today), weekStart);
  }, [weekStart, timezone]);

  // Parse meetings into typed objects per day
  const parsedMeetings = useMemo(() => {
    return meetings.map((m) => {
      const start = toZonedTime(parseISO(m.start_time), timezone);
      const end = toZonedTime(parseISO(m.end_time), timezone);
      return { meeting: m, start, end, id: m.id };
    });
  }, [meetings, timezone]);

  // Compute visible hours range based on all events
  const {
    hours,
    from: firstHour,
    to: lastHour,
  } = useMemo(() => getVisibleHours(parsedMeetings), [parsedMeetings]);

  // Group meetings by date key
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, typeof parsedMeetings>();
    for (const pm of parsedMeetings) {
      const key = format(pm.start, 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(pm);
      map.set(key, arr);
    }
    return map;
  }, [parsedMeetings]);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current || !isCurrentWeek) return;
    const nowMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
    const offsetMinutes = nowMinutes - firstHour * 60;
    const scrollTo = (offsetMinutes / 60) * HOUR_HEIGHT - 200;
    scrollRef.current.scrollTop = Math.max(0, scrollTo);
  }, [isCurrentWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const isTodayInTz = (day: Date) => format(nowInTz, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

  const formatWeekRange = () => {
    const sm = format(weekStart, 'MMMM');
    const em = format(weekEnd, 'MMMM');
    const sd = format(weekStart, 'd');
    const ed = format(weekEnd, 'd');
    const y = format(weekEnd, 'yyyy');
    return sm === em ? `${sm} ${sd} – ${ed}, ${y}` : `${sm} ${sd} – ${em} ${ed}, ${y}`;
  };

  const handleDeleteMeeting = useCallback((id: string) => {
    if (confirm('Delete this meeting?')) {
      startTransition(async () => {
        const result = await deleteMeeting(id);
        if (result.success) {
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
        }
      });
    }
  }, []);

  const handleEditMeeting = useCallback((m: Meeting) => setEditingMeeting(m), []);

  // Timeline position
  const timelinePosition = useMemo(() => {
    const minutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
    const visibleStart = firstHour * 60;
    const visibleEnd = lastHour * 60;
    if (minutes < visibleStart || minutes > visibleEnd) return null;
    return ((minutes - visibleStart) / (visibleEnd - visibleStart)) * 100;
  }, [nowInTz, firstHour, lastHour]);

  const totalGridHeight = hours.length * HOUR_HEIGHT;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">{formatWeekRange()}</h2>
            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="cursor-pointer bg-transparent text-xs font-medium text-muted-foreground focus:outline-none"
              >
                <option value="Europe/Nicosia">Cyprus</option>
                <option value="Asia/Amman">Jordan</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                isCurrentWeek
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ===== Day Headers ===== */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="border-r border-border" />
          {days.map((day) => {
            const isToday = isTodayInTz(day);
            const count = meetingsByDate.get(format(day, 'yyyy-MM-dd'))?.length || 0;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r border-border py-3 text-center transition-colors last:border-r-0',
                  isToday && 'bg-primary/[0.04]'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'EEE')}
                </div>
                <div className="mt-1.5 flex items-center justify-center">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/80'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {count > 0 && (
                  <div className="mt-1 flex justify-center gap-0.5">
                    {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'size-1.5 rounded-full',
                          isToday ? 'bg-primary' : 'bg-violet-400/50'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ===== Time Grid ===== */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '720px' }}>
          <div
            className="grid grid-cols-[60px_repeat(7,1fr)]"
            style={{ height: `${totalGridHeight}px` }}
          >
            {/* Hour labels */}
            <div className="relative border-r border-border">
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute right-0 flex w-full items-start justify-end pr-3"
                  style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                  {i !== 0 && (
                    <span className="relative -top-[7px] select-none text-[10px] font-medium tabular-nums text-muted-foreground/50">
                      {format(new Date(2000, 0, 1, hour), 'h a')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayParsed = meetingsByDate.get(dateKey) || [];
              const grouped = groupEvents(dayParsed);
              const isToday = isTodayInTz(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative border-r border-border last:border-r-0',
                    isToday && 'bg-primary/[0.02]'
                  )}
                >
                  {/* Hour grid lines */}
                  {hours.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0"
                      style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    >
                      {i !== 0 && (
                        <div className="absolute inset-x-0 top-0 border-t border-border" />
                      )}
                      {/* Half-hour dashed line */}
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-border/10"
                        style={{ top: `${HOUR_HEIGHT / 2}px` }}
                      />
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {isToday && timelinePosition !== null && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-30"
                      style={{ top: `${timelinePosition}%` }}
                    >
                      <div className="flex items-center">
                        <div className="-ml-[5px] size-2.5 rounded-full bg-primary shadow-sm shadow-primary/40 ring-2 ring-card" />
                        <div className="h-[2px] flex-1 bg-primary/60" />
                      </div>
                    </div>
                  )}

                  {/* Event blocks */}
                  {grouped.map((ev) => {
                    const startMin =
                      ev.start.getHours() * 60 + ev.start.getMinutes() - firstHour * 60;
                    const duration = differenceInMinutes(ev.end, ev.start);
                    const top = (startMin / 60) * HOUR_HEIGHT;
                    const height = Math.max(28, (duration / 60) * HOUR_HEIGHT);
                    const colWidth = 100 / ev.totalCols;
                    const left = ev.col * colWidth;
                    const hasLink = !!ev.meeting.meeting_link;
                    const isCompact = height < 48;

                    // Skip out-of-range events
                    if (ev.start.getHours() >= lastHour || ev.end.getHours() < firstHour)
                      return null;

                    return (
                      <div
                        key={ev.meeting.id}
                        className="absolute z-10 p-[2px]"
                        style={{
                          top: `${Math.max(0, top)}px`,
                          height: `${height}px`,
                          left: `calc(${left}% + 1px)`,
                          width: `calc(${colWidth}% - 2px)`,
                        }}
                      >
                        <div
                          onClick={() => hasLink && window.open(ev.meeting.meeting_link!, '_blank')}
                          className={cn(
                            'group relative flex h-full flex-col overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 transition-all duration-150',
                            'border-l-violet-500/80 bg-violet-500/[0.07] hover:bg-violet-500/[0.13]',
                            'dark:bg-violet-500/[0.10] dark:hover:bg-violet-500/[0.16]',
                            hasLink && 'cursor-pointer'
                          )}
                          title={`${ev.meeting.title}\n${format(ev.start, 'h:mm a')} – ${format(ev.end, 'h:mm a')}`}
                        >
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={cn(
                                'truncate font-semibold text-foreground/90',
                                isCompact ? 'text-[10px]' : 'text-[11px]'
                              )}
                            >
                              {ev.meeting.title}
                            </span>

                            {/* Hover actions */}
                            <div className="flex shrink-0 gap-px opacity-0 transition-opacity group-hover:opacity-100">
                              {hasLink && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(ev.meeting.meeting_link!, '_blank');
                                  }}
                                  className="rounded p-0.5 text-emerald-500/70 hover:text-emerald-500"
                                  title="Join"
                                >
                                  <ExternalLink className="size-2.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditMeeting(ev.meeting);
                                }}
                                className="rounded p-0.5 text-muted-foreground/60 hover:text-violet-500"
                                title="Edit"
                              >
                                <Pencil className="size-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeeting(ev.meeting.id);
                                }}
                                disabled={isPending}
                                className="rounded p-0.5 text-muted-foreground/60 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="size-2.5" />
                              </button>
                            </div>

                            {/* Video indicator (when not hovered) */}
                            {hasLink && (
                              <Video className="mt-0.5 size-2.5 shrink-0 text-emerald-500/60 group-hover:hidden" />
                            )}
                          </div>

                          {/* Time */}
                          {!isCompact && (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/55">
                              <Clock className="size-2.5 shrink-0" strokeWidth={1.5} />
                              <span className="tabular-nums">
                                {format(ev.start, 'h:mm')} – {format(ev.end, 'h:mm a')}
                              </span>
                            </div>
                          )}

                          {/* Project */}
                          {!isCompact && ev.meeting.project && (
                            <div className="mt-auto truncate text-[10px] font-medium text-violet-500/50">
                              {ev.meeting.project.name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={editingMeeting}
        open={editingMeeting !== null}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />
    </>
  );
}
