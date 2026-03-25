'use client';

import { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock, Video, Calendar } from 'lucide-react';
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

  const todaysMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const mDate = toZonedTime(parseISO(m.start_time), timezone);
        return isSameDay(mDate, now);
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [meetings, timezone, now]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today
          </h3>
          <span className="text-xs text-muted-foreground/60">{format(now, 'EEE, MMM d')}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {todaysMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-xl bg-muted/30 p-3">
              <Calendar className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No meetings today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysMeetings.map((m) => {
              const start = toZonedTime(parseISO(m.start_time), timezone);
              const end = toZonedTime(parseISO(m.end_time), timezone);
              const hasLink = !!m.meeting_link;
              const isClient = !!m.client;
              const nowTime = new Date();
              const isCurrent =
                nowTime >= parseISO(m.start_time) && nowTime <= parseISO(m.end_time);
              const isPast = nowTime > parseISO(m.end_time);

              return (
                <div
                  key={m.id}
                  onClick={() => hasLink && window.open(m.meeting_link!, '_blank')}
                  className={cn(
                    'rounded-lg border-l-2 px-3 py-2.5 transition-all',
                    isCurrent &&
                      'border-l-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20',
                    isPast && 'opacity-40',
                    !isCurrent && !isPast && isClient
                      ? 'border-l-violet-400 bg-violet-500/5 hover:bg-violet-500/10'
                      : !isCurrent && !isPast
                        ? 'border-l-primary bg-primary/5 hover:bg-primary/10'
                        : '',
                    hasLink && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{m.title}</p>
                    <div className="flex items-center gap-1">
                      {isCurrent && (
                        <span className="flex h-2 w-2">
                          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      {hasLink && <Video className="size-3 shrink-0 text-emerald-500/70" />}
                    </div>
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
        )}
      </div>
    </div>
  );
}
