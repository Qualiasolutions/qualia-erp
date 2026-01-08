'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';
import { motion, AnimatePresence } from 'framer-motion';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
  attendees?: Array<{ profile: { id: string; full_name: string | null } }>;
}

interface MeetingsTimelineProps {
  meetings: Meeting[];
  onMeetingCreated?: (meeting: Meeting) => void;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMeetingTime(startTime: string): string {
  const date = parseISO(startTime);
  return format(date, 'h:mm a');
}

function getDuration(startTime: string, endTime: string): string {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function isCurrentOrUpcoming(startTime: string, endTime: string): 'current' | 'upcoming' | 'past' {
  const now = new Date();
  const start = parseISO(startTime);
  const end = parseISO(endTime);

  if (now >= start && now <= end) return 'current';
  if (now < start) return 'upcoming';
  return 'past';
}

export function MeetingsTimeline({ meetings, onMeetingCreated }: MeetingsTimelineProps) {
  const [showModal, setShowModal] = useState(false);

  // Filter to today's meetings only and sort by time
  const todayMeetings = useMemo(() => {
    return meetings
      .filter((m) => isToday(parseISO(m.start_time)))
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [meetings]);

  // Handle meeting creation
  const handleMeetingCreated = (meeting: Meeting) => {
    onMeetingCreated?.(meeting);
    setShowModal(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <Video className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h3 className="font-semibold">Meetings</h3>
            <p className="text-xs text-muted-foreground">{todayMeetings.length} scheduled</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-violet-500/10 hover:text-violet-500"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Meeting List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {todayMeetings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-muted/50 p-4">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 font-medium text-foreground">No meetings today</p>
            <p className="mt-1 text-sm text-muted-foreground">Enjoy your focus time</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {todayMeetings.map((meeting, index) => {
                const status = isCurrentOrUpcoming(meeting.start_time, meeting.end_time);
                const isCurrent = status === 'current';
                const isPast = status === 'past';

                return (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'group relative rounded-xl p-3 transition-all duration-200',
                      isCurrent
                        ? 'border border-violet-500/30 bg-violet-500/10'
                        : isPast
                          ? 'bg-muted/30 opacity-60'
                          : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Time indicator for current meeting */}
                    {isCurrent && (
                      <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-500 ring-4 ring-violet-500/20" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Time */}
                      <div className="w-14 shrink-0 text-center">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isCurrent ? 'text-violet-500' : 'text-foreground'
                          )}
                        >
                          {formatMeetingTime(meeting.start_time)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getDuration(meeting.start_time, meeting.end_time)}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {meeting.client && (
                          <p
                            className={cn(
                              'truncate font-medium',
                              isCurrent ? 'text-violet-500' : 'text-foreground'
                            )}
                          >
                            {meeting.client.display_name}
                          </p>
                        )}
                        {meeting.title && !meeting.client && (
                          <p className="truncate font-medium text-foreground">{meeting.title}</p>
                        )}
                        {meeting.project && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {meeting.project.name}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {meeting.attendees?.[0]?.profile && (
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              className={cn(
                                'text-[10px]',
                                isCurrent
                                  ? 'bg-violet-500/20 text-violet-500'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {getInitials(meeting.attendees[0].profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {meeting.meeting_link && (
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                              isCurrent
                                ? 'bg-violet-500/20 text-violet-500 hover:bg-violet-500/30'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* New Meeting Modal */}
      <NewMeetingModalInline
        open={showModal}
        onOpenChange={setShowModal}
        onMeetingCreated={handleMeetingCreated}
      />
    </div>
  );
}
