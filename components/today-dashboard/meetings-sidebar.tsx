'use client';

import { useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Video, ExternalLink, Clock, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezone } from '@/lib/schedule-utils';
import type { MeetingWithRelations } from '@/lib/swr';
import { EmptyState } from '@/components/ui/empty-state';

interface MeetingsSidebarProps {
  meetings: MeetingWithRelations[];
}

function getMeetingStatus(startTime: Date, endTime: Date): 'current' | 'upcoming' | 'past' {
  const now = new Date();
  if (now >= startTime && now <= endTime) return 'current';
  if (now < startTime) return 'upcoming';
  return 'past';
}

function getDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function getClientInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function MeetingsSidebar({ meetings }: MeetingsSidebarProps) {
  const { timezone } = useTimezone();

  const todayMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const start = toZonedTime(parseISO(m.start_time), timezone);
        return isToday(start);
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [meetings, timezone]);

  const tomorrowMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const start = toZonedTime(parseISO(m.start_time), timezone);
        return isTomorrow(start);
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [meetings, timezone]);

  const tomorrow = addDays(new Date(), 1);

  const now = new Date();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
          <Video className="size-3.5 text-violet-500" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Meetings</h2>
          <p className="text-[10px] text-muted-foreground/60">
            {format(new Date(), 'EEEE, MMM d')} &middot; {todayMeetings.length} today
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {todayMeetings.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 py-6">
            <EmptyState
              icon={CalendarX}
              title="Free day ahead"
              description="No meetings scheduled. Head to Schedule to add one."
              compact
            />
          </div>
        ) : (
          <div className="space-y-px p-2">
            {todayMeetings.map((meeting, i) => {
              const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
              const endTime = toZonedTime(parseISO(meeting.end_time), timezone);
              const status = getMeetingStatus(startTime, endTime);
              const isCurrent = status === 'current';
              const isPast = status === 'past';
              const client = meeting.client as {
                display_name?: string;
                logo_url?: string | null;
              } | null;

              return (
                <div
                  key={meeting.id}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
                >
                  <div
                    className={cn(
                      'group relative rounded-lg p-3 transition-all duration-200',
                      isCurrent && 'bg-violet-500/8 ring-1 ring-inset ring-violet-500/20',
                      isPast && 'opacity-40',
                      !isCurrent && !isPast && 'hover:bg-muted/30'
                    )}
                  >
                    {/* Current indicator */}
                    {isCurrent && (
                      <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-500" />
                    )}

                    <div className="flex items-start gap-2.5">
                      {/* Avatar / Icon */}
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold',
                          isCurrent
                            ? 'bg-violet-500/15 text-violet-500'
                            : 'bg-muted/40 text-muted-foreground/60'
                        )}
                      >
                        {client?.display_name ? (
                          getClientInitials(client.display_name)
                        ) : (
                          <Video className="size-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title */}
                        <p
                          className={cn(
                            'truncate text-[13px] font-medium leading-tight',
                            isCurrent ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'
                          )}
                        >
                          {client?.display_name || meeting.title}
                        </p>

                        {/* Time + Duration */}
                        <div className="mt-1 flex items-center gap-1.5">
                          <Clock className="size-2.5 text-muted-foreground/40" strokeWidth={1.5} />
                          <span
                            className={cn(
                              'text-[10px] tabular-nums',
                              isCurrent ? 'font-medium text-violet-500' : 'text-muted-foreground/60'
                            )}
                          >
                            {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
                          </span>
                          <span className="text-[10px] text-muted-foreground/30">
                            {getDuration(startTime, endTime)}
                          </span>
                        </div>

                        {/* Project tag */}
                        {meeting.project && (
                          <span className="mt-1 inline-block truncate rounded bg-muted/30 px-1.5 py-px text-[9px] font-medium text-muted-foreground/50">
                            {(meeting.project as { name: string }).name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Join button for current/upcoming */}
                    {meeting.meeting_link && !isPast && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-all',
                          isCurrent
                            ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20 hover:bg-violet-600'
                            : 'bg-muted/30 text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <ExternalLink className="size-3" />
                        {isCurrent ? 'Join Now' : 'Join'}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tomorrow's meetings */}
            {tomorrowMeetings.length > 0 && (
              <>
                <div className="mx-1 mb-1 mt-3 border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {format(tomorrow, 'EEEE, MMM d')}
                  </p>
                </div>
                {tomorrowMeetings.map((meeting, i) => {
                  const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
                  const endTime = toZonedTime(parseISO(meeting.end_time), timezone);
                  const client = meeting.client as {
                    display_name?: string;
                    logo_url?: string | null;
                  } | null;

                  return (
                    <div
                      key={meeting.id}
                      className="animate-stagger-in"
                      style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
                    >
                      <div className="group relative rounded-lg p-3 opacity-60 transition-all duration-200 hover:bg-muted/30 hover:opacity-80">
                        <div className="flex items-start gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-[10px] font-bold text-muted-foreground/60">
                            {client?.display_name ? (
                              getClientInitials(client.display_name)
                            ) : (
                              <Video className="size-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                              {client?.display_name || meeting.title}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Clock
                                className="size-2.5 text-muted-foreground/40"
                                strokeWidth={1.5}
                              />
                              <span className="text-[10px] tabular-nums text-muted-foreground/60">
                                {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
                              </span>
                              <span className="text-[10px] text-muted-foreground/30">
                                {getDuration(startTime, endTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom summary */}
      <div className="shrink-0 border-t border-border bg-muted/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            {
              todayMeetings.filter((m) => {
                const end = toZonedTime(parseISO(m.end_time), timezone);
                return end > now;
              }).length
            }{' '}
            remaining
          </span>
          {(() => {
            const next = todayMeetings.find((m) => {
              const start = toZonedTime(parseISO(m.start_time), timezone);
              return start > now;
            });
            if (!next) return null;
            const nextStart = toZonedTime(parseISO(next.start_time), timezone);
            const minsUntil = Math.round((nextStart.getTime() - now.getTime()) / 60000);
            if (minsUntil < 0 || minsUntil > 480) return null;
            return (
              <span className="text-[9px] font-medium tabular-nums text-violet-500/60">
                Next in{' '}
                {minsUntil < 60
                  ? `${minsUntil}m`
                  : `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
