'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.1] hover:text-foreground"
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
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

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'relative min-h-[80px] rounded-lg p-1 text-left transition-all duration-200',
                isCurrentMonth ? 'hover:bg-white/[0.05]' : 'opacity-40',
                isCurrentDay && 'bg-qualia-500/5 ring-1 ring-qualia-500/50'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isCurrentDay ? 'bg-qualia-500 font-semibold text-white' : 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Meeting indicators */}
              <div className="mt-1 space-y-0.5">
                {dayMeetings.slice(0, 2).map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-1 truncate rounded bg-qualia-500/20 px-1 py-0.5 text-[10px] text-qualia-300"
                    title={meeting.title}
                  >
                    <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">{meeting.title}</span>
                  </div>
                ))}
                {dayMeetings.length > 2 && (
                  <div className="px-1 text-[10px] text-muted-foreground">
                    +{dayMeetings.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
