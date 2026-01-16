'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, isSameDay } from 'date-fns';
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

// Group meetings by day
interface MeetingGroup {
  label: string;
  date: Date;
  meetings: Meeting[];
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

export function MeetingsTimeline({ meetings, onMeetingCreated }: MeetingsTimelineProps) {
  const [showModal, setShowModal] = useState(false);

  // Group meetings by day - today and next 7 days
  const groupedMeetings = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, 7);

    // Filter future meetings within range and sort
    const futureMeetings = meetings
      .filter((m) => {
        const meetingDate = parseISO(m.start_time);
        return meetingDate >= startOfDay(now) && meetingDate <= endDate;
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

    // Group by day
    const groups: MeetingGroup[] = [];
    let currentGroup: MeetingGroup | null = null;

    for (const meeting of futureMeetings) {
      const meetingDate = startOfDay(parseISO(meeting.start_time));

      if (!currentGroup || !isSameDay(currentGroup.date, meetingDate)) {
        currentGroup = {
          label: getDayLabel(meetingDate),
          date: meetingDate,
          meetings: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.meetings.push(meeting);
    }

    return groups;
  }, [meetings]);

  // Handle meeting creation
  const handleMeetingCreated = (meeting: Meeting) => {
    onMeetingCreated?.(meeting);
    setShowModal(false);
  };

  const totalMeetings = groupedMeetings.reduce((sum, g) => sum + g.meetings.length, 0);

  return (
    <div className="widget">
      {/* Header */}
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon bg-violet-500/10">
            <Video className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Meetings</h3>
            <p className="text-xs text-muted-foreground">{totalMeetings} scheduled</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="btn-icon text-muted-foreground hover:bg-violet-500/10 hover:text-violet-500"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Meeting List */}
      <div className="widget-content overflow-y-auto p-3">
        {totalMeetings === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-lg bg-muted p-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No meetings scheduled</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {groupedMeetings.map((group, groupIndex) => (
                <div key={group.label}>
                  {/* Day Header */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        isToday(group.date) ? 'text-violet-500' : 'text-muted-foreground'
                      )}
                    >
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

                  {/* Meetings for this day */}
                  <div className="space-y-1">
                    {group.meetings.map((meeting, index) => {
                      const status = isCurrentOrUpcoming(meeting.start_time, meeting.end_time);
                      const isCurrent = status === 'current';
                      const isPast = status === 'past';

                      return (
                        <motion.div
                          key={meeting.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{
                            delay: (groupIndex * group.meetings.length + index) * 0.03,
                          }}
                          className={cn(
                            'group relative rounded-lg px-2 py-2 transition-all duration-200',
                            isCurrent
                              ? 'border border-violet-500/30 bg-violet-500/10'
                              : isPast
                                ? 'opacity-50'
                                : 'hover:bg-muted/50'
                          )}
                        >
                          {/* Time indicator for current meeting */}
                          {isCurrent && (
                            <div className="absolute -left-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-500 ring-2 ring-violet-500/20" />
                          )}

                          <div className="flex items-start gap-3">
                            {/* Time - Left aligned */}
                            <div className="w-16 shrink-0">
                              <p
                                className={cn(
                                  'text-sm font-medium tabular-nums',
                                  isCurrent ? 'text-violet-500' : 'text-foreground'
                                )}
                              >
                                {formatMeetingTime(meeting.start_time)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {getDuration(meeting.start_time, meeting.end_time)}
                              </p>
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'truncate text-sm font-medium',
                                  isCurrent ? 'text-violet-500' : 'text-foreground'
                                )}
                              >
                                {meeting.client?.display_name || meeting.title}
                              </p>
                              {meeting.project && (
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {meeting.project.name}
                                </p>
                              )}
                            </div>

                            {/* Join button */}
                            {meeting.meeting_link && (
                              <a
                                href={meeting.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
                                  isCurrent
                                    ? 'bg-violet-500/20 text-violet-500 hover:bg-violet-500/30'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
