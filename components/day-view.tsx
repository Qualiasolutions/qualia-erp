'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  format,
  addDays,
  subDays,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  isSameDay,
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
  location?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface DayViewProps {
  meetings: Meeting[];
}

const HOUR_HEIGHT = 55; // pixels per hour (optimized to fit on one page)
const START_HOUR = 9; // 9 AM
const END_HOUR = 21; // 8 PM (inclusive, shows 9am-8pm)

// Get timezone from localStorage or detect from browser
function useTimezone() {
  const [timezone, setTimezone] = useState(TIMEZONE_CYPRUS);

  useEffect(() => {
    const loadTimezone = () => {
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
    };

    loadTimezone();

    // Listen for timezone changes from the toggle
    const handleTimezoneChange = () => loadTimezone();
    window.addEventListener('timezone-change', handleTimezoneChange);
    return () => window.removeEventListener('timezone-change', handleTimezoneChange);
  }, []);

  const setAndStoreTimezone = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem('preferred_timezone', tz);
  };

  return { timezone, setTimezone: setAndStoreTimezone };
}

export function DayView({ meetings }: DayViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get the current time in the selected timezone
  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);
  const todayInTz = startOfDay(nowInTz);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Filter meetings for the selected day
  const dayMeetings = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return meetings.filter((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      return isSameDay(meetingInTz, dayStart);
    });
  }, [meetings, currentDate, timezone]);

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getMeetingPosition = (meeting: Meeting) => {
    // Convert to timezone for accurate positioning
    const start = toZonedTime(parseISO(meeting.start_time), timezone);
    const end = toZonedTime(parseISO(meeting.end_time), timezone);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return { top: Math.max(0, topOffset), height: Math.max(30, height) };
  };

  const isToday = isSameDay(currentDate, todayInTz);

  return (
    <div className="surface overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-foreground">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
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
            type="button"
            onClick={goToToday}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPreviousDay}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToNextDay}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Time grid */}
      <div 
        className="grid grid-cols-[80px_1fr]"
        style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
      >
        {/* Time labels */}
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="border-b border-border/50 pr-2 text-right" style={{ height: `${HOUR_HEIGHT}px` }}>
              <span className="relative -top-2 text-xs font-medium text-muted-foreground">
                {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className={cn('relative border-l border-border', isToday && 'bg-primary/[0.02]')}>
          {/* Hour grid lines */}
          {hours.map((hour) => (
            <div key={hour} className="border-b border-border/50" style={{ height: `${HOUR_HEIGHT}px` }} />
          ))}

          {/* Current time indicator */}
          {isToday && (
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

            // Skip if outside visible hours
            if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
              return null;
            }

            return (
              <div
                key={meeting.id}
                className="group absolute left-2 right-2 z-10 cursor-pointer overflow-hidden rounded-lg border border-primary/30 bg-primary/20 p-3 transition-colors hover:bg-primary/30"
                style={{ top: `${top}px`, height: `${height}px` }}
                title={`${meeting.title}\n${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {meeting.title}
                    </div>
                    {height > 50 && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                        </span>
                      </div>
                    )}
                    {height > 80 && meeting.project && (
                      <div className="mt-2 truncate text-xs text-primary/80">
                        {meeting.project.name}
                      </div>
                    )}
                    {height > 100 && meeting.description && (
                      <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {meeting.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

