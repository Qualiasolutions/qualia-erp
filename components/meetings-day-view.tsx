'use client';

import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { Clock, Video, ExternalLink, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { MeetingWithRelations } from '@/lib/swr';

interface MeetingsDayViewProps {
  meetings: MeetingWithRelations[];
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
}

export function MeetingsDayView({ meetings }: MeetingsDayViewProps) {
  const today = new Date();

  const todaysMeetings = meetings
    .filter((m) => {
      const meetingDate = parseISO(m.start_time);
      return isSameDay(meetingDate, today);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  if (todaysMeetings.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border/40 bg-card">
        <div className="text-center">
          <Clock className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No meetings today</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Your schedule is clear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todaysMeetings.map((meeting) => {
        const startTime = parseISO(meeting.start_time);
        const endTime = meeting.end_time ? parseISO(meeting.end_time) : null;
        const isPast = startTime < today && !isToday(startTime);
        const isNow = startTime <= today && endTime && endTime > today;

        return (
          <div
            key={meeting.id}
            className={`group flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors ${
              isNow
                ? 'border-qualia-500/30 bg-qualia-500/5'
                : isPast
                  ? 'border-border/30 bg-muted/30 opacity-60'
                  : 'border-border/40 bg-card hover:bg-accent/30'
            }`}
          >
            {/* Time column */}
            <div className="flex w-16 shrink-0 flex-col items-end pt-0.5">
              <span className="text-sm font-medium tabular-nums text-foreground">
                {format(startTime, 'HH:mm')}
              </span>
              {endTime && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {format(endTime, 'HH:mm')}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex flex-col items-center self-stretch">
              <div className={`size-2.5 rounded-full ${isNow ? 'bg-qualia-500' : 'bg-border'}`} />
              <div className="w-px flex-1 bg-border/40" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{meeting.title}</h3>
                {isNow && (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-qualia-500/30 bg-qualia-500/10 text-[10px] text-qualia-600"
                  >
                    Now
                  </Badge>
                )}
              </div>

              {meeting.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{meeting.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {meeting.meeting_link && (
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-qualia-500 hover:underline"
                  >
                    <Video className="size-3" />
                    Join meeting
                    <ExternalLink className="size-2.5" />
                  </a>
                )}

                {meeting.client && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {meeting.client.display_name}
                  </span>
                )}

                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {meeting.attendees.slice(0, 4).map((a) => (
                      <Avatar key={a.id} className="size-5 border border-background">
                        <AvatarFallback className="text-[8px]">
                          {a.profile?.full_name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {meeting.attendees.length > 4 && (
                      <div className="flex size-5 items-center justify-center rounded-full border border-background bg-muted text-[8px] text-muted-foreground">
                        +{meeting.attendees.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
