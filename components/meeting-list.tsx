'use client';

import { format, startOfDay, isBefore, parseISO, isWithinInterval } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Clock, Trash2, Globe, CalendarDays, Video, ChevronRight } from 'lucide-react';
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

// Calculate duration in minutes
function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Format duration
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Get time until meeting
function getTimeUntil(now: Date, start: Date): string {
  const diffMs = start.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 0) return 'Started';
  if (diffMins === 0) return 'Starting now';
  if (diffMins < 60) return `in ${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours < 24) return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
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
  const { todayMeetings, upcomingMeetings, currentMeeting, nextMeeting } = useMemo<{
    todayMeetings: Meeting[];
    upcomingMeetings: Meeting[];
    currentMeeting: Meeting | undefined;
    nextMeeting: Meeting | undefined;
  }>(() => {
    const todayStart = startOfDay(toZonedTime(currentTime, timezone));
    const zonedNow = toZonedTime(currentTime, timezone);

    const filteredMeetings = meetings
      .filter((meeting) => {
        const meetingDate = toZonedTime(parseISO(meeting.start_time), timezone);
        return !isBefore(startOfDay(meetingDate), todayStart);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const today: Meeting[] = [];
    const upcoming: Meeting[] = [];
    let current: Meeting | undefined = undefined;
    let next: Meeting | undefined = undefined;

    filteredMeetings.forEach((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      const endInTz = toZonedTime(parseISO(meeting.end_time), timezone);
      const date = format(meetingInTz, 'yyyy-MM-dd');

      // Check if currently happening
      if (
        isWithinInterval(zonedNow, { start: meetingInTz, end: endInTz }) ||
        (isBefore(meetingInTz, zonedNow) && isBefore(zonedNow, endInTz))
      ) {
        current = meeting;
      }

      // Find next upcoming meeting
      if (!next && !isBefore(meetingInTz, zonedNow) && meeting !== current) {
        next = meeting;
      }

      if (date === todayInTz) {
        today.push(meeting);
      } else {
        upcoming.push(meeting);
      }
    });

    return {
      todayMeetings: today,
      upcomingMeetings: upcoming,
      currentMeeting: current,
      nextMeeting: next,
    };
  }, [meetings, currentTime, timezone, todayInTz]);

  const zonedNow = toZonedTime(currentTime, timezone);

  if (todayMeetings.length === 0 && upcomingMeetings.length === 0) {
    return (
      <div className="space-y-6">
        {/* Hero empty state */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-8 text-center">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <CalendarDays className="h-8 w-8 text-violet-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Your day is clear</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No meetings scheduled. Enjoy your focus time!
            </p>
            <div className="mt-4">
              <TimezoneSelector timezone={timezone} setTimezone={setTimezone} compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Today's Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative">
          {/* Date and timezone */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {formatInTimeZone(currentTime, timezone, 'EEEE')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatInTimeZone(currentTime, timezone, 'MMMM d, yyyy')} &middot;{' '}
                {formatInTimeZone(currentTime, timezone, 'h:mm a')}
              </p>
            </div>
            <TimezoneSelector timezone={timezone} setTimezone={setTimezone} compact />
          </div>

          {/* Current or Next Meeting Highlight */}
          {(currentMeeting || nextMeeting) && (
            <div className="mb-4">
              {currentMeeting ? (
                <CurrentMeetingCard
                  meeting={currentMeeting}
                  timezone={timezone}
                  now={zonedNow}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              ) : nextMeeting ? (
                <NextMeetingCard
                  meeting={nextMeeting}
                  timezone={timezone}
                  now={zonedNow}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              ) : null}
            </div>
          )}

          {/* Today's summary */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''} today
            </span>
            {todayMeetings.length > 0 && (
              <>
                <span className="text-muted-foreground">&middot;</span>
                <span className="text-muted-foreground">
                  {formatDuration(
                    todayMeetings.reduce((acc, m) => {
                      const start = toZonedTime(parseISO(m.start_time), timezone);
                      const end = toZonedTime(parseISO(m.end_time), timezone);
                      return acc + getDurationMinutes(start, end);
                    }, 0)
                  )}{' '}
                  total
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All Meetings - Combined Today + Upcoming */}
      {(() => {
        // Combine today's remaining meetings (excluding highlighted one) with upcoming
        const highlightedId = currentMeeting?.id || nextMeeting?.id;
        const remainingTodayMeetings = todayMeetings.filter((m) => m.id !== highlightedId);
        const allUpcoming = [...remainingTodayMeetings, ...upcomingMeetings];

        if (allUpcoming.length === 0) return null;

        return (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Coming Up</h3>
              <span className="text-xs text-muted-foreground">
                {allUpcoming.length} meeting{allUpcoming.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {allUpcoming.slice(0, 8).map((meeting, index) => {
                const startDate = toZonedTime(parseISO(meeting.start_time), timezone);
                const endDate = toZonedTime(parseISO(meeting.end_time), timezone);
                const duration = getDurationMinutes(startDate, endDate);
                const isPast = isBefore(endDate, zonedNow);
                const isToday = format(startDate, 'yyyy-MM-dd') === todayInTz;

                return (
                  <div
                    key={meeting.id}
                    className={cn(
                      'group rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-violet-500/30 hover:bg-secondary/50',
                      isPast && 'opacity-50'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Date */}
                        <div className="mb-2 flex items-center gap-2">
                          {isToday ? (
                            <>
                              <Clock className="h-3.5 w-3.5 text-violet-500" />
                              <span className="text-xs font-medium text-violet-500">Today</span>
                            </>
                          ) : (
                            <>
                              <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
                              <span className="text-xs font-medium text-violet-500">
                                {format(startDate, 'EEE, MMM d')}
                              </span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(startDate, 'h:mm a')}
                          </span>
                          {!isPast && isToday && (
                            <span className="text-xs text-muted-foreground">
                              {getTimeUntil(zonedNow, startDate)}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-violet-500">
                          {meeting.title}
                        </h4>

                        {/* Meta */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDuration(duration)}</span>
                          {meeting.project && (
                            <>
                              <span>&middot;</span>
                              <span className="truncate">{meeting.project.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(meeting.id)}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {allUpcoming.length > 8 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                +{allUpcoming.length - 8} more meetings
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// Current meeting highlight card
function CurrentMeetingCard({
  meeting,
  timezone,
  now,
  onDelete,
  isPending,
}: {
  meeting: Meeting;
  timezone: string;
  now: Date;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const startDate = toZonedTime(parseISO(meeting.start_time), timezone);
  const endDate = toZonedTime(parseISO(meeting.end_time), timezone);
  const duration = getDurationMinutes(startDate, endDate);
  const elapsed = getDurationMinutes(startDate, now);
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));

  return (
    <div className="rounded-xl border border-violet-500/50 bg-violet-500/10 p-4 shadow-lg shadow-violet-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500">
            <Video className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="animate-pulse rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                In Progress
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDuration(duration - elapsed)} remaining
              </span>
            </div>
            <h3 className="mt-1 text-base font-semibold text-foreground">{meeting.title}</h3>
            <p className="text-xs text-muted-foreground">
              {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(meeting.id)}
          disabled={isPending}
          className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
          title="Delete meeting"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-violet-500/20">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Next meeting card
function NextMeetingCard({
  meeting,
  timezone,
  now,
  onDelete,
  isPending,
}: {
  meeting: Meeting;
  timezone: string;
  now: Date;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const startDate = toZonedTime(parseISO(meeting.start_time), timezone);
  const endDate = toZonedTime(parseISO(meeting.end_time), timezone);
  const duration = getDurationMinutes(startDate, endDate);
  const timeUntil = getTimeUntil(now, startDate);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Clock className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-violet-500">Up Next</span>
              <span className="text-xs text-muted-foreground">{timeUntil}</span>
            </div>
            <h3 className="mt-1 text-base font-semibold text-foreground">{meeting.title}</h3>
            <p className="text-xs text-muted-foreground">
              {format(startDate, 'h:mm a')} &middot; {formatDuration(duration)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(meeting.id)}
          disabled={isPending}
          className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
          title="Delete meeting"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Timezone selector component
function TimezoneSelector({
  timezone,
  setTimezone,
  compact = false,
}: {
  timezone: string;
  setTimezone: (tz: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2 py-1">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="cursor-pointer bg-transparent text-xs text-muted-foreground hover:text-foreground focus:outline-none"
        >
          <option value={TIMEZONE_CYPRUS}>Cyprus</option>
          <option value={TIMEZONE_JORDAN}>Jordan</option>
        </select>
      </div>
    );
  }

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
