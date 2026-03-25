'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Clock, Pencil, Trash2, Video } from 'lucide-react';
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
  meeting_link?: string | null;
  client?: { id: string } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface CalendarViewProps {
  meetings: Meeting[];
  onDateSelect?: (date: Date) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ meetings, onDateSelect }: CalendarViewProps) {
  const { timezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const handleEdit = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
  }, []);

  const handleDelete = useCallback((id: string) => {
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

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);
  const todayStr = format(nowInTz, 'yyyy-MM-dd');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    meetings.forEach((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      const dateKey = format(meetingInTz, 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, meeting]);
    });
    return map;
  }, [meetings, timezone]);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const isTodayInTz = (day: Date) => format(day, 'yyyy-MM-dd') === todayStr;
  const isCurrentMonth = useMemo(() => {
    return isSameMonth(currentDate, nowInTz);
  }, [currentDate, nowInTz]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
              Cyprus
              <ChevronRight className="h-3 w-3 rotate-90" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                isCurrentMonth
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid — single grid with gap-px for perfect alignment
            Day headers and day cells are ALL in the same 7-col grid.
            bg-border fills the 1px gaps to create seamless borders. */}
        <div className="grid grid-cols-7 gap-px overflow-hidden border-t border-border bg-border">
          {/* Day Headers — same grid, same columns, perfectly aligned */}
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="bg-secondary/50 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days — continues the same grid */}
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMeetings = meetingsByDate.get(dateKey) || [];
            const isCurrentMonthDay = isSameMonth(day, currentDate);
            const isCurrentDay = isTodayInTz(day);
            const isExpanded = expandedDay === dateKey;

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  onDateSelect?.(day);
                  setExpandedDay(isExpanded ? null : dateKey);
                }}
                className={cn(
                  'group relative flex h-24 cursor-pointer flex-col bg-card p-2 transition-colors hover:bg-secondary/50',
                  !isCurrentMonthDay && 'bg-card/50'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isCurrentDay && 'bg-primary text-primary-foreground',
                    !isCurrentMonthDay && 'text-muted-foreground/40',
                    isCurrentMonthDay && !isCurrentDay && 'text-foreground group-hover:bg-secondary'
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Meeting dots */}
                {dayMeetings.length > 0 && isCurrentMonthDay && !isExpanded && (
                  <div className="mt-1 flex items-center gap-0.5">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <span
                        key={m.id}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          m.client ? 'bg-accent' : 'bg-primary'
                        )}
                      />
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{dayMeetings.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Expanded meeting list */}
                {isExpanded && dayMeetings.length > 0 && (
                  <div className="mt-1 w-full space-y-0.5">
                    {dayMeetings.map((meeting) => {
                      const hasLink = !!meeting.meeting_link;
                      return (
                        <div
                          key={meeting.id}
                          className="group/item relative flex items-center gap-1 truncate rounded bg-accent/20 px-1 py-0.5 text-[11px] text-accent transition-colors hover:bg-accent/30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasLink ? (
                            <Video className="h-2.5 w-2.5 flex-shrink-0 text-emerald-400" />
                          ) : (
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{meeting.title}</span>

                          {/* Hover actions */}
                          <div className="absolute right-0 top-0 flex gap-0.5 rounded bg-card/90 px-0.5 py-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/item:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(meeting);
                              }}
                              className="rounded p-0.5 text-muted-foreground hover:bg-accent/20 hover:text-accent"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(meeting.id);
                              }}
                              disabled={isPending}
                              className="rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Meetings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>Client meetings</span>
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
