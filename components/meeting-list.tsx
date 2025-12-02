'use client';

import { format, startOfDay, isBefore, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Clock, User, Folder, Trash2, Inbox, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { useTransition, useMemo, useState, useEffect } from 'react';

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
  creator: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

// Get timezone from localStorage or detect from browser
function useTimezone() {
  const [timezone, setTimezone] = useState(TIMEZONE_CYPRUS);

  useEffect(() => {
    // Try to get stored timezone preference
    const stored = localStorage.getItem('preferred_timezone');
    if (stored && (stored === TIMEZONE_CYPRUS || stored === TIMEZONE_JORDAN)) {
      setTimezone(stored);
    } else {
      // Auto-detect based on browser timezone offset
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Default to Cyprus unless browser suggests Jordan area
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

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  const [isPending, startTransition] = useTransition();
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to keep "today" accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      startTransition(async () => {
        await deleteMeeting(id);
      });
    }
  };

  // Get "today" in the selected timezone
  const todayInTz = useMemo(() => {
    const zonedNow = toZonedTime(currentTime, timezone);
    return format(startOfDay(zonedNow), 'yyyy-MM-dd');
  }, [currentTime, timezone]);

  // Filter and group meetings - show today and future only
  const { groupedMeetings, sortedDates } = useMemo(() => {
    // Filter to today and future meetings
    const todayStart = startOfDay(toZonedTime(currentTime, timezone));

    const filteredMeetings = meetings.filter((meeting) => {
      const meetingDate = toZonedTime(parseISO(meeting.start_time), timezone);
      // Show meetings from today onwards (including past meetings from today)
      return !isBefore(startOfDay(meetingDate), todayStart);
    });

    // Group by date in the selected timezone
    const grouped = filteredMeetings.reduce(
      (groups, meeting) => {
        const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
        const date = format(meetingInTz, 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(meeting);
        return groups;
      },
      {} as Record<string, Meeting[]>
    );

    // Sort dates, ensuring today comes first
    const dates = Object.keys(grouped).sort();

    return { groupedMeetings: grouped, sortedDates: dates };
  }, [meetings, currentTime, timezone]);

  if (sortedDates.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-xl bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No upcoming meetings</p>
        <p className="mt-1 text-sm text-muted-foreground">Schedule a new meeting to get started</p>
        <TimezoneSelector timezone={timezone} setTimezone={setTimezone} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timezone selector and current date display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {formatInTimeZone(currentTime, timezone, 'EEEE, MMMM d, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatInTimeZone(currentTime, timezone, 'h:mm a')})
          </span>
        </div>
        <TimezoneSelector timezone={timezone} setTimezone={setTimezone} />
      </div>

      {sortedDates.map((date) => {
        const isToday = date === todayInTz;
        const dayMeetings = groupedMeetings[date];
        // Parse the date string and format it in the timezone
        const dateForDisplay = toZonedTime(parseISO(date + 'T12:00:00'), timezone);

        return (
          <div key={date}>
            {/* Date Header */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  'text-sm font-medium',
                  isToday ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isToday ? 'Today' : format(dateForDisplay, 'EEEE, MMM d')}
              </div>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Meetings for this date */}
            <div className="space-y-2">
              {dayMeetings.map((meeting, index) => {
                const startDate = toZonedTime(parseISO(meeting.start_time), timezone);
                const endDate = toZonedTime(parseISO(meeting.end_time), timezone);
                const zonedNow = toZonedTime(currentTime, timezone);
                const isPast = isBefore(endDate, zonedNow);

                return (
                  <div
                    key={meeting.id}
                    className={cn(
                      'surface slide-in group relative rounded-lg p-4 transition-all duration-200 hover:bg-secondary/50',
                      isPast && 'opacity-50'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Time Box */}
                        <div
                          className={cn(
                            'flex h-14 w-14 flex-col items-center justify-center rounded-lg',
                            isPast ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                          )}
                        >
                          <span className="text-lg font-semibold">{format(startDate, 'h:mm')}</span>
                          <span className="text-[10px] font-medium uppercase">
                            {format(startDate, 'a')}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {meeting.title}
                          </h3>
                          {meeting.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {meeting.description}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                              </span>
                            </div>
                            {meeting.project && (
                              <div className="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5">
                                <Folder className="h-3 w-3" />
                                <span>{meeting.project.name}</span>
                              </div>
                            )}
                            {meeting.creator && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{meeting.creator.full_name || meeting.creator.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(meeting.id)}
                        disabled={isPending}
                        className="rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                        title="Delete meeting"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Timezone selector component
function TimezoneSelector({
  timezone,
  setTimezone,
}: {
  timezone: string;
  setTimezone: (tz: string) => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
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
  );
}
