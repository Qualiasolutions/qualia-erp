'use client';

import { useMemo } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock, Video, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezone } from '@/lib/schedule-utils';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  meeting_link?: string | null;
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

  const weekDays = useMemo(() => {
    const now = toZonedTime(new Date(), timezone);
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    return eachDayOfInterval({ start, end });
  }, [timezone]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();

    meetings.forEach((m) => {
      const mDate = toZonedTime(parseISO(m.start_time), timezone);
      const key = format(mDate, 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      map.set(key, [...existing, m]);
    });

    // Sort meetings within each day by start time
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

  const now = toZonedTime(new Date(), timezone);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          This Week
        </h3>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDay.get(dateKey) || [];
          const today = isToday(day);
          const past = isBefore(day, startOfDay(now)) && !today;

          return (
            <div
              key={dateKey}
              className={cn(
                'rounded-lg px-3 py-2.5 transition-colors',
                today && 'bg-qualia-500/[0.06] dark:bg-qualia-500/[0.08]',
                past && !today && 'opacity-50'
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                      today
                        ? 'bg-qualia-500 text-white shadow-sm shadow-qualia-500/30'
                        : 'text-foreground/80'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        today ? 'text-qualia-600 dark:text-qualia-400' : 'text-foreground/80'
                      )}
                    >
                      {format(day, 'EEEE')}
                    </span>
                  </div>
                </div>
                {dayMeetings.length > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      today
                        ? 'bg-qualia-500/15 text-qualia-600 dark:text-qualia-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {dayMeetings.length}
                  </span>
                )}
              </div>

              {/* Meetings list */}
              {dayMeetings.length > 0 ? (
                <div className="mt-2 space-y-1.5 pl-9">
                  {dayMeetings.map((m) => {
                    const start = toZonedTime(parseISO(m.start_time), timezone);
                    const end = toZonedTime(parseISO(m.end_time), timezone);
                    const hasLink = !!m.meeting_link;

                    return (
                      <div
                        key={m.id}
                        onClick={() => hasLink && window.open(m.meeting_link!, '_blank')}
                        className={cn(
                          'group rounded-md border-l-2 border-l-violet-500/60 bg-violet-500/[0.04] px-2.5 py-1.5 transition-colors',
                          'hover:bg-violet-500/[0.08] dark:bg-violet-500/[0.06] dark:hover:bg-violet-500/[0.10]',
                          hasLink && 'cursor-pointer'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-foreground/90">
                            {m.title}
                          </span>
                          {hasLink && (
                            <Video className="mt-0.5 size-3 shrink-0 text-emerald-500/70" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                          <div className="flex items-center gap-0.5">
                            <Clock className="size-2.5" />
                            <span className="tabular-nums">
                              {format(start, 'h:mm')} – {format(end, 'h:mm a')}
                            </span>
                          </div>
                          {m.location && (
                            <div className="flex items-center gap-0.5 truncate">
                              <MapPin className="size-2.5 shrink-0" />
                              <span className="truncate">{m.location}</span>
                            </div>
                          )}
                        </div>
                        {m.project && (
                          <div className="mt-0.5 truncate text-[10px] font-medium text-violet-500/50">
                            {m.project.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 pl-9 text-[11px] text-muted-foreground/40">No meetings</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
