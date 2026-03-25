'use client';

import { useMemo } from 'react';
import {
  format,
  parseISO,
  isToday,
  isBefore,
  startOfDay,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezone } from '@/lib/schedule-utils';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  meeting_link?: string | null;
  client?: { id: string; display_name?: string | null } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface MeetingDaySidebarProps {
  meetings: Meeting[];
}

export function MeetingDaySidebar({ meetings }: MeetingDaySidebarProps) {
  const { timezone } = useTimezone();

  const now = useMemo(() => toZonedTime(new Date(), timezone), [timezone]);

  const weekDays = useMemo(() => {
    const ws = startOfWeek(now);
    const we = endOfWeek(now);
    return eachDayOfInterval({ start: ws, end: we });
  }, [now]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();

    for (const m of meetings) {
      const mDate = toZonedTime(parseISO(m.start_time), timezone);
      const key = format(mDate, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      map.set(key, [...existing, m]);
    }

    for (const [key, dayMeetings] of map) {
      map.set(
        key,
        dayMeetings.sort(
          (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
        )
      );
    }

    return map;
  }, [meetings, timezone]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-3 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This Week
        </h3>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDay.get(dateKey) || [];
          const dayIsToday = isToday(day);
          const dayIsPast = isBefore(day, startOfDay(now)) && !dayIsToday;

          return (
            <div key={dateKey} className="group">
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
                  dayIsToday && 'bg-primary/10',
                  dayIsPast && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                      dayIsToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span
                    className={cn('font-medium', dayIsToday ? 'text-primary' : 'text-foreground')}
                  >
                    {format(day, 'EEEE')}
                  </span>
                </div>
                {dayMeetings.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-400">
                    {dayMeetings.length}
                  </span>
                )}
              </div>

              {dayMeetings.length > 0 ? (
                <div className="ml-11 space-y-2 py-2">
                  {dayMeetings.map((m) => {
                    const start = toZonedTime(parseISO(m.start_time), timezone);
                    const end = toZonedTime(parseISO(m.end_time), timezone);
                    const hasLink = !!m.meeting_link;
                    const isClient = !!m.client;

                    return (
                      <div
                        key={m.id}
                        onClick={() => hasLink && window.open(m.meeting_link!, '_blank')}
                        className={cn(
                          'rounded-lg border-l-2 px-3 py-2.5 transition-all',
                          isClient
                            ? 'border-l-violet-400 bg-violet-500/5 hover:bg-violet-500/10'
                            : 'border-l-primary bg-primary/5 hover:bg-primary/10',
                          hasLink && 'cursor-pointer'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">
                            {m.title}
                          </p>
                          {hasLink && (
                            <Video className="mt-0.5 size-3 shrink-0 text-emerald-500/70" />
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(start, 'h:mm')} – {format(end, 'h:mm a')}
                        </p>
                        {m.project && (
                          <p className="mt-0.5 truncate text-[10px] font-medium text-violet-500/50">
                            {m.project.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="ml-11 py-1 text-xs text-muted-foreground/60">No meetings</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
