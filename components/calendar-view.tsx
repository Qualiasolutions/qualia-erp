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
import { ChevronLeft, ChevronRight, Clock, Globe, Pencil, Trash2, Video } from 'lucide-react';
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
  meeting_link?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface CalendarViewProps {
  meetings: Meeting[];
  onDateSelect?: (date: Date) => void;
}

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

export function CalendarView({ meetings, onDateSelect }: CalendarViewProps) {
  const { timezone, setTimezone } = useTimezone();
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

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get "today" in the selected timezone
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
      // Convert meeting time to selected timezone for grouping
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

  // Check if a day is today in the selected timezone
  const isTodayInTz = (day: Date) => format(day, 'yyyy-MM-dd') === todayStr;

  return (
    <div className="glass-card rounded-2xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
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
            className="rounded-lg bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isTodayInTz(day);
          const isExpanded = expandedDay === dateKey;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'relative min-h-[80px] rounded-lg p-1 text-left transition-all duration-200',
                isCurrentMonth ? 'hover:bg-muted/30' : 'opacity-40',
                isCurrentDay && 'bg-violet-500/5 ring-1 ring-violet-500/50'
              )}
            >
              <button
                onClick={() => {
                  onDateSelect?.(day);
                  setExpandedDay(isExpanded ? null : dateKey);
                }}
                className="w-full text-left"
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isCurrentDay
                      ? 'bg-violet-500 font-semibold text-white'
                      : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>

              {/* Meeting indicators */}
              <div className="mt-1 space-y-0.5">
                {(isExpanded ? dayMeetings : dayMeetings.slice(0, 2)).map((meeting) => {
                  const hasLink = !!meeting.meeting_link;
                  return (
                    <div
                      key={meeting.id}
                      className="group relative flex items-center gap-1 truncate rounded bg-violet-500/20 px-1 py-0.5 text-[11px] text-violet-300 transition-colors hover:bg-violet-500/30"
                    >
                      {hasLink ? (
                        <Video className="h-2.5 w-2.5 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{meeting.title}</span>

                      {/* Hover action buttons */}
                      <div className="absolute right-0 top-0 flex gap-0.5 rounded bg-card/90 px-0.5 py-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(meeting);
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400"
                          title="Edit meeting"
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
                          title="Delete meeting"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!isExpanded && dayMeetings.length > 2 && (
                  <button
                    onClick={() => setExpandedDay(dateKey)}
                    className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    +{dayMeetings.length - 2} more
                  </button>
                )}
                {isExpanded && dayMeetings.length > 2 && (
                  <button
                    onClick={() => setExpandedDay(null)}
                    className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={editingMeeting}
        open={editingMeeting !== null}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />
    </div>
  );
}
