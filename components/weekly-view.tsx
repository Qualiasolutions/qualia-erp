'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  parseISO,
  setHours,
  setMinutes,
  isSameDay,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Clock, Trash2, Pencil, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';
import { useTimezone, TIMEZONE_CYPRUS } from '@/lib/schedule-utils';

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

type WeeklyItem = Meeting & { itemType: 'meeting' };

interface WeeklyViewProps {
  meetings: Meeting[];
}

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 21;

export function WeeklyView({ meetings }: WeeklyViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Check if viewing current week
  const isCurrentWeek = useMemo(() => {
    const today = toZonedTime(new Date(), timezone);
    const thisWeekStart = startOfWeek(today);
    return isSameDay(weekStart, thisWeekStart);
  }, [weekStart, timezone]);

  // Group meetings by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, WeeklyItem[]>();

    meetings.forEach((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      const dateKey = format(meetingInTz, 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, { ...meeting, itemType: 'meeting' as const }]);
    });

    return map;
  }, [meetings, timezone]);

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getItemPosition = useCallback(
    (item: WeeklyItem) => {
      const start = toZonedTime(parseISO(item.start_time), timezone);
      const end = toZonedTime(parseISO(item.end_time), timezone);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

      return { top: Math.max(0, topOffset), height: Math.max(28, height) };
    },
    [timezone]
  );

  // Compute horizontal layout for overlapping items within each day
  const itemLayoutMap = useMemo(() => {
    const layoutMap = new Map<string, { col: number; totalCols: number }>();

    for (const [, dayItems] of itemsByDate) {
      const sorted = [...dayItems].sort(
        (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
      );

      const columns: { endMinutes: number; itemId: string }[][] = [];

      for (const item of sorted) {
        const start = toZonedTime(parseISO(item.start_time), timezone);
        const end = toZonedTime(parseISO(item.end_time), timezone);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();

        let placed = false;
        for (let col = 0; col < columns.length; col++) {
          const lastInCol = columns[col][columns[col].length - 1];
          if (startMin >= lastInCol.endMinutes) {
            columns[col].push({ endMinutes: endMin, itemId: item.id });
            layoutMap.set(item.id, { col, totalCols: columns.length });
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([{ endMinutes: endMin, itemId: item.id }]);
          layoutMap.set(item.id, { col: columns.length - 1, totalCols: columns.length });
        }
      }

      const totalCols = columns.length;
      for (const item of sorted) {
        const layout = layoutMap.get(item.id);
        if (layout) layout.totalCols = totalCols;
      }
    }

    return layoutMap;
  }, [itemsByDate, timezone]);

  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMMM');
    const endMonth = format(weekEnd, 'MMMM');
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekEnd, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  };

  const isTodayInTz = (day: Date) => {
    const todayStr = format(nowInTz, 'yyyy-MM-dd');
    const dayStr = format(day, 'yyyy-MM-dd');
    return todayStr === dayStr;
  };

  // Count meetings for a given day
  const getMeetingCount = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return itemsByDate.get(dateKey)?.length || 0;
  };

  const handleDeleteMeeting = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      startTransition(async () => {
        const result = await deleteMeeting(id);
        if (result.success) {
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
        }
      });
    }
  }, []);

  const handleEditMeeting = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <div className="flex items-center gap-5">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              {formatWeekRange()}
            </h2>
            {/* Timezone selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="cursor-pointer bg-transparent text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
              >
                <option value="Europe/Nicosia">Cyprus</option>
                <option value="Asia/Amman">Jordan</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className={cn(
                'mr-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                isCurrentWeek
                  ? 'bg-qualia-500/10 text-qualia-600 dark:text-qualia-400'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/40">
          <div className="border-r border-border/30" />
          {days.map((day) => {
            const isCurrentDay = isTodayInTz(day);
            const meetingCount = getMeetingCount(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative border-r border-border/30 px-1 py-3 text-center transition-colors last:border-r-0',
                  isCurrentDay && 'bg-qualia-500/[0.06] dark:bg-qualia-500/[0.08]'
                )}
              >
                <div
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-widest',
                    isCurrentDay
                      ? 'text-qualia-600 dark:text-qualia-400'
                      : 'text-muted-foreground/70'
                  )}
                >
                  {format(day, 'EEE')}
                </div>
                <div className="mt-1 flex items-center justify-center">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
                      isCurrentDay
                        ? 'bg-qualia-500 text-white shadow-sm shadow-qualia-500/30'
                        : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                {meetingCount > 0 && !isCurrentDay && (
                  <div className="mt-1.5 flex justify-center">
                    <span className="h-1 w-1 rounded-full bg-violet-400/60" />
                  </div>
                )}
                {meetingCount > 0 && isCurrentDay && (
                  <div className="mt-1.5 flex justify-center">
                    <span className="text-[10px] font-medium text-qualia-600 dark:text-qualia-400">
                      {meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid max-h-[640px] grid-cols-[56px_repeat(7,1fr)] overflow-y-auto">
          {/* Time labels */}
          <div className="relative border-r border-border/30">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end border-b border-border/20 pr-2.5 pt-1"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="relative -top-0.5 select-none text-[10px] font-medium tabular-nums text-muted-foreground/60">
                  {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDate.get(dateKey) || [];
            const isCurrentDay = isTodayInTz(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative border-r border-border/30 last:border-r-0',
                  isCurrentDay && 'bg-qualia-500/[0.03] dark:bg-qualia-500/[0.04]'
                )}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="relative border-b border-border/20"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {/* Half-hour line */}
                    <div
                      className="absolute inset-x-0 border-b border-dashed border-border/10"
                      style={{ top: `${HOUR_HEIGHT / 2}px` }}
                    />
                  </div>
                ))}

                {/* Current time indicator */}
                {isCurrentDay && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{
                      top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                    }}
                  >
                    <div className="flex items-center">
                      <div className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-qualia-500 shadow-sm shadow-qualia-500/40 ring-2 ring-card" />
                      <div className="h-[2px] w-full bg-qualia-500/70" />
                    </div>
                  </div>
                )}

                {/* Meeting items */}
                {dayItems.map((item) => {
                  const { top, height } = getItemPosition(item);
                  const startTime = toZonedTime(parseISO(item.start_time), timezone);
                  const endTime = toZonedTime(parseISO(item.end_time), timezone);

                  if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                    return null;
                  }

                  const hasLink = !!item.meeting_link;
                  const layout = itemLayoutMap.get(item.id);
                  const col = layout?.col ?? 0;
                  const totalCols = layout?.totalCols ?? 1;
                  const colWidth = 100 / totalCols;
                  const leftPercent = col * colWidth;
                  const isCompact = height < 40;

                  return (
                    <div
                      key={item.id}
                      onClick={() => hasLink && window.open(item.meeting_link!, '_blank')}
                      className={cn(
                        'group absolute z-10 overflow-hidden rounded-md border-l-[3px] transition-all duration-150',
                        'bg-violet-500/[0.08] hover:bg-violet-500/[0.14] dark:bg-violet-500/[0.12] dark:hover:bg-violet-500/[0.18]',
                        'border-l-violet-500/70',
                        hasLink ? 'cursor-pointer' : 'cursor-default'
                      )}
                      style={{
                        top: `${top + 1}px`,
                        height: `${height - 2}px`,
                        left: `calc(${leftPercent}% + 2px)`,
                        width: `calc(${colWidth}% - 4px)`,
                      }}
                      title={`${item.title}\n${format(startTime, 'h:mm a')} – ${format(endTime, 'h:mm a')}${hasLink ? '\nClick to join' : ''}`}
                    >
                      <div className="flex h-full flex-col px-1.5 py-1">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-0.5">
                          <span
                            className={cn(
                              'truncate font-semibold text-foreground/90',
                              isCompact ? 'text-[10px]' : 'text-[11px]'
                            )}
                          >
                            {item.title}
                          </span>

                          {/* Link indicator */}
                          {hasLink && (
                            <Video className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-emerald-500 opacity-70 group-hover:opacity-0" />
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-shrink-0 gap-0 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditMeeting(item);
                              }}
                              className="rounded p-0.5 text-muted-foreground hover:text-violet-500"
                              title="Edit"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMeeting(item.id);
                              }}
                              disabled={isPending}
                              className="rounded p-0.5 text-muted-foreground hover:text-red-500"
                              title="Remove"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Time */}
                        {!isCompact && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="tabular-nums">
                              {format(startTime, 'h:mm')} – {format(endTime, 'h:mm a')}
                            </span>
                          </div>
                        )}

                        {/* Project */}
                        {height > 55 && item.project && (
                          <div className="mt-auto truncate text-[10px] font-medium text-violet-500/60">
                            {item.project.name}
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

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={editingMeeting}
        open={editingMeeting !== null}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />
    </>
  );
}
