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
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, Clock, Globe, Trash2, Pencil, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';

// Cyprus timezone (for Fawzi) - UTC+2 (EET) / UTC+3 (EEST in summer)
const TIMEZONE_CYPRUS = 'Europe/Nicosia';
// Jordan timezone (for Moayad) - UTC+3 (Arabia Standard Time)
const TIMEZONE_JORDAN = 'Asia/Amman';

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

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 7; // 7 AM
const END_HOUR = 21; // 9 PM

// Get timezone from localStorage or detect from browser
function useTimezone() {
  const [timezone, setTimezone] = useState(TIMEZONE_CYPRUS);

  useEffect(() => {
    const stored = localStorage.getItem('preferred_timezone');
    if (stored && (stored === TIMEZONE_CYPRUS || stored === TIMEZONE_JORDAN)) {
      setTimezone(stored);
    } else {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (
        browserTz.includes('Amman') ||
        browserTz.includes('Jerusalem') ||
        browserTz.includes('Beirut')
      ) {
        setTimezone(TIMEZONE_JORDAN);
      }
    }
  }, []);

  const setAndStoreTimezone = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem('preferred_timezone', tz);
  };

  return { timezone, setTimezone: setAndStoreTimezone };
}

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

  // Get the current time in the selected timezone
  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    meetings.forEach((meeting) => {
      // Convert meeting time to selected timezone for grouping
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      const dateKey = format(meetingInTz, 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, meeting]);
    });
    return map;
  }, [meetings, timezone]);

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getMeetingPosition = useCallback(
    (meeting: Meeting) => {
      // Convert to timezone for accurate positioning
      const start = toZonedTime(parseISO(meeting.start_time), timezone);
      const end = toZonedTime(parseISO(meeting.end_time), timezone);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

      return { top: Math.max(0, topOffset), height: Math.max(30, height) };
    },
    [timezone]
  );

  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMM');
    const endMonth = format(weekEnd, 'MMM');
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekEnd, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  // Check if a day is today in the selected timezone
  const isTodayInTz = (day: Date) => {
    const todayStr = format(nowInTz, 'yyyy-MM-dd');
    const dayStr = format(day, 'yyyy-MM-dd');
    return todayStr === dayStr;
  };

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

  const handleEdit = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-foreground">{formatWeekRange()}</h2>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={TIMEZONE_CYPRUS}>Cyprus (Fawzi)</option>
                <option value={TIMEZONE_JORDAN}>Jordan (Moayad)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              Today
            </button>
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/50">
          <div className="p-2" /> {/* Time column header */}
          {days.map((day) => {
            const isCurrentDay = isTodayInTz(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-l border-border p-2 text-center',
                  isCurrentDay && 'bg-primary/5'
                )}
              >
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div
                  className={cn(
                    'mt-0.5 text-lg font-semibold',
                    isCurrentDay ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid max-h-[600px] grid-cols-[60px_repeat(7,1fr)] overflow-y-auto">
          {/* Time labels */}
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-border/50 pr-2 text-right">
                <span className="relative -top-2 text-[10px] text-muted-foreground">
                  {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMeetings = meetingsByDate.get(dateKey) || [];
            const isCurrentDay = isTodayInTz(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative border-l border-border',
                  isCurrentDay && 'bg-primary/[0.02]'
                )}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-border/50" />
                ))}

                {/* Current time indicator */}
                {isCurrentDay && (
                  <div
                    className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                    style={{
                      top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                    }}
                  >
                    <div className="-ml-1 -mt-1 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}

                {/* Meetings */}
                {dayMeetings.map((meeting) => {
                  const { top, height } = getMeetingPosition(meeting);
                  const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
                  const endTime = toZonedTime(parseISO(meeting.end_time), timezone);
                  const hasLink = !!meeting.meeting_link;

                  // Skip if outside visible hours
                  if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                    return null;
                  }

                  return (
                    <div
                      key={meeting.id}
                      onClick={() => hasLink && window.open(meeting.meeting_link!, '_blank')}
                      className={cn(
                        'group absolute left-1 right-1 z-10 overflow-hidden rounded-md border border-violet-500/30 bg-violet-500/10 p-1.5 transition-colors hover:bg-violet-500/20',
                        hasLink ? 'cursor-pointer' : 'cursor-default'
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${meeting.title}\n${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}${hasLink ? '\nClick to join' : ''}`}
                    >
                      {/* Live/Link indicator */}
                      {hasLink && (
                        <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-emerald-500 group-hover:opacity-0">
                          <Video className="h-2.5 w-2.5" />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="absolute right-0.5 top-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(meeting);
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-violet-500/20 hover:text-foreground"
                          title="Edit meeting"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(meeting.id);
                          }}
                          disabled={isPending}
                          className="rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                          title="Delete meeting"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="truncate text-[11px] font-medium text-foreground">
                        {meeting.title}
                      </div>
                      {height > 40 && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{format(startTime, 'h:mm a')}</span>
                        </div>
                      )}
                      {height > 60 && meeting.project && (
                        <div className="mt-1 truncate text-[10px] text-primary/80">
                          {meeting.project.name}
                        </div>
                      )}
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
