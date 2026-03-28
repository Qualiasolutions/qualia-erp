'use client';

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  isSameDay,
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
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';
import { useTimezone, TIMEZONE_CYPRUS } from '@/lib/schedule-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

const FIXED_HOURS = { from: 9, to: 18 }; // 9 AM – 6 PM
const HOUR_COUNT = FIXED_HOURS.to - FIXED_HOURS.from; // 9 hours
const HOURS = Array.from({ length: HOUR_COUNT }, (_, i) => i + FIXED_HOURS.from);

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

// ============ Hooks ============

function useResponsiveDays() {
  const [visibleDays, setVisibleDays] = useState(7);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) setVisibleDays(1);
      else if (w < 1024) setVisibleDays(3);
      else setVisibleDays(7);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return visibleDays;
}

// ============ Component ============

export function WeeklyView({ meetings }: WeeklyViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<{
    meeting: Meeting;
    start: Date;
    end: Date;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleDays = useResponsiveDays();

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);

  // Compute visible days based on responsive breakpoint
  const days = useMemo(() => {
    if (visibleDays === 7) {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    if (visibleDays === 3) {
      return eachDayOfInterval({
        start: subDays(currentDate, 1),
        end: addDays(currentDate, 1),
      });
    }
    // 1 day
    return [currentDate];
  }, [currentDate, visibleDays]);

  const isCurrentWeek = useMemo(() => {
    const today = toZonedTime(new Date(), timezone);
    if (visibleDays === 7) return isSameDay(startOfWeek(today), startOfWeek(currentDate));
    return days.some((d) => isSameDay(d, today));
  }, [currentDate, timezone, visibleDays, days]);

  // Parse meetings into typed objects
  const parsedMeetings = useMemo(() => {
    return meetings.map((m) => {
      const start = toZonedTime(parseISO(m.start_time), timezone);
      const end = toZonedTime(parseISO(m.end_time), timezone);
      return { meeting: m, start, end, id: m.id };
    });
  }, [meetings, timezone]);

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

  // Navigation
  const goToPrev = () => {
    if (visibleDays === 7) setCurrentDate(subWeeks(currentDate, 1));
    else if (visibleDays === 3) setCurrentDate(subDays(currentDate, 3));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToNext = () => {
    if (visibleDays === 7) setCurrentDate(addWeeks(currentDate, 1));
    else if (visibleDays === 3) setCurrentDate(addDays(currentDate, 3));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const isTodayInTz = (day: Date) => format(nowInTz, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

  const formatRange = () => {
    if (visibleDays === 1) return format(currentDate, 'EEEE, MMMM d, yyyy');
    const first = days[0];
    const last = days[days.length - 1];
    const sm = format(first, 'MMMM');
    const em = format(last, 'MMMM');
    const sd = format(first, 'd');
    const ed = format(last, 'd');
    const y = format(last, 'yyyy');
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

  // Timeline position as percentage of grid
  const timelinePosition = useMemo(() => {
    const minutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
    const visibleStart = FIXED_HOURS.from * 60;
    const visibleEnd = FIXED_HOURS.to * 60;
    if (minutes < visibleStart || minutes > visibleEnd) return null;
    return ((minutes - visibleStart) / (visibleEnd - visibleStart)) * 100;
  }, [nowInTz]);

  const gridCols =
    visibleDays === 1
      ? 'grid-cols-[44px_1fr]'
      : visibleDays === 3
        ? 'grid-cols-[44px_repeat(3,1fr)]'
        : 'grid-cols-[44px_repeat(7,1fr)]';

  return (
    <>
      <div
        ref={containerRef}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
      >
        {/* ===== Header ===== */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-sm font-semibold text-foreground sm:text-lg">{formatRange()}</h2>
            <div className="hidden items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground sm:flex">
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
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={goToToday}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-colors sm:px-4 sm:py-1.5 sm:text-sm',
                isCurrentWeek
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToPrev}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ===== Day Headers ===== */}
        <div className={cn('grid shrink-0 border-b border-border', gridCols)}>
          <div className="border-r border-border" />
          {days.map((day) => {
            const isToday = isTodayInTz(day);
            const count = meetingsByDate.get(format(day, 'yyyy-MM-dd'))?.length || 0;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r border-border py-2 text-center transition-colors last:border-r-0 sm:py-3',
                  isToday && 'bg-primary/[0.04]'
                )}
              >
                <div
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider sm:text-xs',
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {visibleDays === 1 ? format(day, 'EEEE') : format(day, 'EEE')}
                </div>
                <div className="mt-1 flex items-center justify-center sm:mt-1.5">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all sm:size-8 sm:text-sm',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/80'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {count > 0 && (
                  <div className="mt-0.5 flex justify-center gap-0.5 sm:mt-1">
                    {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'size-1 rounded-full sm:size-1.5',
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

        {/* ===== Time Grid — fills remaining height, scrolls as container ===== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn('relative grid', gridCols)} style={{ height: `${HOUR_COUNT * 4}rem` }}>
            {/* Hour labels */}
            <div className="relative border-r border-border">
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute right-0 flex w-full items-start justify-end pr-2 sm:pr-3"
                  style={{
                    top: `${(i / HOUR_COUNT) * 100}%`,
                    height: `${(1 / HOUR_COUNT) * 100}%`,
                  }}
                >
                  {i !== 0 && (
                    <span className="relative -top-[7px] select-none text-[9px] font-medium tabular-nums text-muted-foreground/50 sm:text-[10px]">
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
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0"
                      style={{
                        top: `${(i / HOUR_COUNT) * 100}%`,
                        height: `${(1 / HOUR_COUNT) * 100}%`,
                      }}
                    >
                      {i !== 0 && (
                        <div className="absolute inset-x-0 top-0 border-t border-border" />
                      )}
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-border/10"
                        style={{ top: '50%' }}
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
                    // Clamp events to visible range
                    const clampedStart = Math.max(
                      ev.start.getHours() * 60 + ev.start.getMinutes(),
                      FIXED_HOURS.from * 60
                    );
                    const clampedEnd = Math.min(
                      ev.end.getHours() * 60 + ev.end.getMinutes(),
                      FIXED_HOURS.to * 60
                    );
                    if (clampedStart >= FIXED_HOURS.to * 60 || clampedEnd <= FIXED_HOURS.from * 60)
                      return null;

                    const totalMinutes = HOUR_COUNT * 60;
                    const topPct = ((clampedStart - FIXED_HOURS.from * 60) / totalMinutes) * 100;
                    const heightPct = Math.max(
                      1.5,
                      ((clampedEnd - clampedStart) / totalMinutes) * 100
                    );
                    const colWidth = 100 / ev.totalCols;
                    const left = ev.col * colWidth;
                    const hasLink = !!ev.meeting.meeting_link;
                    const isCompact = heightPct < 8;

                    const isSelected = selectedMeeting?.meeting.id === ev.meeting.id;

                    return (
                      <Popover
                        key={ev.meeting.id}
                        open={isSelected}
                        onOpenChange={(open) => {
                          if (!open) setSelectedMeeting(null);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <div
                            className="absolute z-10 cursor-pointer p-[1px] sm:p-[2px]"
                            style={{
                              top: `${topPct}%`,
                              height: `${heightPct}%`,
                              left: `calc(${left}% + 1px)`,
                              width: `calc(${colWidth}% - 2px)`,
                            }}
                            onClick={() =>
                              setSelectedMeeting(
                                isSelected
                                  ? null
                                  : { meeting: ev.meeting, start: ev.start, end: ev.end }
                              )
                            }
                          >
                            <div
                              className={cn(
                                'ease-out-quart group relative flex h-full flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 transition-all duration-150 sm:px-2 sm:py-1.5',
                                'border-l-violet-500/80 bg-violet-500/[0.07] hover:bg-violet-500/[0.13]',
                                'dark:bg-violet-500/[0.10] dark:hover:bg-violet-500/[0.16]',
                                isSelected && 'bg-violet-500/[0.15] ring-1 ring-violet-500/40'
                              )}
                            >
                              <span
                                className={cn(
                                  'truncate font-semibold text-foreground/90',
                                  isCompact
                                    ? 'text-[9px] sm:text-[10px]'
                                    : 'text-[10px] sm:text-[11px]'
                                )}
                              >
                                {ev.meeting.title}
                              </span>

                              {!isCompact && (
                                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/55 sm:text-[10px]">
                                  <Clock className="size-2.5 shrink-0" strokeWidth={1.5} />
                                  <span className="tabular-nums">
                                    {format(ev.start, 'h:mm')} – {format(ev.end, 'h:mm a')}
                                  </span>
                                </div>
                              )}

                              {!isCompact && ev.meeting.project && (
                                <div className="mt-auto hidden truncate text-[10px] font-medium text-violet-500/50 sm:block">
                                  {ev.meeting.project.name}
                                </div>
                              )}

                              {hasLink && (
                                <Video className="absolute right-1.5 top-1.5 size-2.5 shrink-0 text-emerald-500/60" />
                              )}
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          side="right"
                          align="start"
                          sideOffset={8}
                          avoidCollisions
                          collisionPadding={16}
                          className="w-72 p-0"
                        >
                          <div className="space-y-3 p-4">
                            {/* Title */}
                            <h3 className="text-sm font-semibold text-foreground">
                              {ev.meeting.title}
                            </h3>

                            {/* Time */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="size-3.5 shrink-0" />
                              <span>
                                {format(ev.start, 'EEEE, MMM d')} &middot;{' '}
                                {format(ev.start, 'h:mm a')} – {format(ev.end, 'h:mm a')}
                              </span>
                            </div>

                            {/* Project */}
                            {ev.meeting.project && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Folder className="size-3.5 shrink-0" />
                                <span>{ev.meeting.project.name}</span>
                              </div>
                            )}

                            {/* Description */}
                            {ev.meeting.description && (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {ev.meeting.description}
                              </p>
                            )}

                            {/* Meeting link */}
                            {hasLink && (
                              <a
                                href={ev.meeting.meeting_link!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                              >
                                <Video className="size-3.5" />
                                Join Meeting
                                <ExternalLink className="ml-auto size-3" />
                              </a>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 border-t border-border px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMeeting(null);
                                handleEditMeeting(ev.meeting);
                              }}
                              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="size-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMeeting(null);
                                handleDeleteMeeting(ev.meeting.id);
                              }}
                              disabled={isPending}
                              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                            >
                              <Trash2 className="size-3" />
                              Delete
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
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
