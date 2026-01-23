'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';

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
  return format(parseISO(startTime), 'h:mm a');
}

function getDuration(startTime: string, endTime: string): string {
  const minutes = Math.round((parseISO(endTime).getTime() - parseISO(startTime).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function getMeetingStatus(startTime: string, endTime: string): 'current' | 'upcoming' | 'past' {
  const now = new Date();
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  if (now >= start && now <= end) return 'current';
  if (now < start) return 'upcoming';
  return 'past';
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

interface MeetingGroup {
  label: string;
  date: Date;
  meetings: Meeting[];
}

export function MeetingsTimeline({ meetings, onMeetingCreated }: MeetingsTimelineProps) {
  const [showModal, setShowModal] = useState(false);

  const groupedMeetings = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, 7);

    const futureMeetings = meetings
      .filter((m) => {
        const meetingDate = parseISO(m.start_time);
        return meetingDate >= startOfDay(now) && meetingDate <= endDate;
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

    const groups: MeetingGroup[] = [];
    let currentGroup: MeetingGroup | null = null;

    for (const meeting of futureMeetings) {
      const meetingDate = startOfDay(parseISO(meeting.start_time));
      if (!currentGroup || !isSameDay(currentGroup.date, meetingDate)) {
        currentGroup = { label: getDayLabel(meetingDate), date: meetingDate, meetings: [] };
        groups.push(currentGroup);
      }
      currentGroup.meetings.push(meeting);
    }

    return groups;
  }, [meetings]);

  const handleMeetingCreated = (meeting: Meeting) => {
    onMeetingCreated?.(meeting);
    setShowModal(false);
  };

  const totalMeetings = groupedMeetings.reduce((sum, g) => sum + g.meetings.length, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Meetings</h3>
          <p className="text-xs text-muted-foreground">{totalMeetings} this week</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {totalMeetings === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Clock className="h-5 w-5 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No meetings scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMeetings.map((group) => (
              <div key={group.label}>
                {/* Day header */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-[11px] font-medium uppercase tracking-wide',
                      isToday(group.date) ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Meetings */}
                <div className="space-y-1">
                  {group.meetings.map((meeting) => {
                    const status = getMeetingStatus(meeting.start_time, meeting.end_time);
                    const isCurrent = status === 'current';
                    const isPast = status === 'past';

                    return (
                      <div
                        key={meeting.id}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
                          isCurrent && 'bg-foreground/5',
                          isPast && 'opacity-40',
                          !isCurrent && !isPast && 'hover:bg-muted/30'
                        )}
                      >
                        {/* Time */}
                        <div className="w-14 shrink-0">
                          <p className="text-sm tabular-nums">
                            {formatMeetingTime(meeting.start_time)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {getDuration(meeting.start_time, meeting.end_time)}
                          </p>
                        </div>

                        {/* Current indicator */}
                        {isCurrent && (
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        )}

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            {meeting.client?.display_name || meeting.title}
                          </p>
                          {meeting.project && (
                            <p className="truncate text-xs text-muted-foreground">
                              {meeting.project.name}
                            </p>
                          )}
                        </div>

                        {/* Join link */}
                        {meeting.meeting_link && !isPast && (
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
                              isCurrent
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewMeetingModalInline
        open={showModal}
        onOpenChange={setShowModal}
        onMeetingCreated={handleMeetingCreated}
      />
    </div>
  );
}
