'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, Plus } from 'lucide-react';
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

// Time slots from 8:30 AM to 6:00 PM
const TIME_SLOTS = [
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
];

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
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours}h ${remainingMinutes}m`;
}

function isCurrentTimeSlot(slot: string): boolean {
  const now = new Date();
  const [time, period] = slot.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr || '0', 10);

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if current time is within 30 min of this slot
  const slotMinutes = hour * 60 + minute;
  const currentMinutes = currentHour * 60 + currentMinute;

  return currentMinutes >= slotMinutes && currentMinutes < slotMinutes + 30;
}

export function MeetingsTimeline({ meetings, onMeetingCreated }: MeetingsTimelineProps) {
  const [showModal, setShowModal] = useState(false);

  // Filter to today's meetings only
  const todayMeetings = useMemo(() => {
    return meetings.filter((m) => isToday(parseISO(m.start_time)));
  }, [meetings]);

  // Handle meeting creation
  const handleMeetingCreated = (meeting: Meeting) => {
    onMeetingCreated?.(meeting);
    setShowModal(false);
  };

  // Map meetings to their time slots
  const meetingsBySlot = useMemo(() => {
    const map = new Map<string, Meeting>();
    todayMeetings.forEach((meeting) => {
      const time = formatMeetingTime(meeting.start_time);
      // Find closest slot
      const closestSlot = TIME_SLOTS.find((slot) => {
        const slotTime = slot.toLowerCase();
        const meetingTimeStr = time.toLowerCase();
        return slotTime === meetingTimeStr;
      });
      if (closestSlot) {
        map.set(closestSlot, meeting);
      } else {
        // Try to match just hour
        const meetingHour = time.split(':')[0];
        const meetingPeriod = time.includes('PM') ? 'PM' : 'AM';
        const matchingSlot = TIME_SLOTS.find(
          (s) => s.startsWith(meetingHour) && s.includes(meetingPeriod)
        );
        if (matchingSlot) {
          map.set(matchingSlot, meeting);
        }
      }
    });
    return map;
  }, [todayMeetings]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4 text-muted-foreground" />
          Today&apos;s Meetings
          <div className="ml-auto flex items-center gap-2">
            {todayMeetings.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {todayMeetings.length} scheduled
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-violet-400"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-[52px] top-0 w-px bg-border" />

          <div className="space-y-0">
            {TIME_SLOTS.map((slot) => {
              const meeting = meetingsBySlot.get(slot);
              const isCurrent = isCurrentTimeSlot(slot);

              return (
                <div key={slot} className="flex items-start gap-2 py-1.5">
                  {/* Time label */}
                  <span
                    className={cn(
                      'w-[44px] shrink-0 pt-0.5 text-xs',
                      isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {slot}
                  </span>

                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isCurrent
                          ? 'bg-red-500 ring-4 ring-red-500/20'
                          : meeting
                            ? 'bg-violet-500'
                            : 'bg-muted'
                      )}
                    />
                  </div>

                  {/* Meeting card or empty slot */}
                  {meeting ? (
                    <div className="flex-1 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 shadow-sm transition-colors hover:bg-violet-500/15">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {getDuration(meeting.start_time, meeting.end_time)}
                          </span>
                          {meeting.client && (
                            <span className="truncate text-sm font-medium text-violet-400">
                              {meeting.client.display_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {meeting.attendees?.[0]?.profile && (
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="bg-violet-500/20 text-[10px] text-violet-400">
                                {getInitials(meeting.attendees[0].profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {meeting.meeting_link && (
                            <a
                              href={meeting.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1 text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-5 flex-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* New Meeting Modal */}
      <NewMeetingModalInline
        open={showModal}
        onOpenChange={setShowModal}
        onMeetingCreated={handleMeetingCreated}
      />
    </Card>
  );
}
