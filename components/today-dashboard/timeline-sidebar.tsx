'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, setHours, setMinutes, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MeetingWithRelations } from '@/lib/swr';
import { NewMeetingModalControlled } from '@/components/new-meeting-modal';

interface TimelineSidebarProps {
  meetings: MeetingWithRelations[];
}

// Working hours: 9 AM to 6 PM
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9, 10, 11, ..., 18

interface TimeSlot {
  hour: number;
  label: string;
  meeting?: MeetingWithRelations;
  isCurrent: boolean;
  isPast: boolean;
}

export function TimelineSidebar({ meetings }: TimelineSidebarProps) {
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const now = new Date();
  const currentHour = now.getHours();

  // Filter today's meetings and create time slots
  const timeSlots = useMemo(() => {
    const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));

    return HOURS.map((hour): TimeSlot => {
      const isPast = hour < currentHour;
      const isCurrent = hour === currentHour;

      // Find meeting that starts in this hour
      const meeting = todaysMeetings.find((m) => {
        const meetingHour = parseISO(m.start_time).getHours();
        return meetingHour === hour;
      });

      return {
        hour,
        label: format(setMinutes(setHours(new Date(), hour), 0), 'h a'),
        meeting,
        isCurrent,
        isPast,
      };
    });
  }, [meetings, currentHour]);

  const meetingsCount = timeSlots.filter((s) => s.meeting).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header - Unified with other sections */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-4">
        <div className="flex items-center gap-2.5">
          <Clock className="size-4 text-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Today</h2>
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-violet-600 dark:text-violet-400">
            {meetingsCount}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setShowMeetingModal(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Current time indicator */}
          {currentHour >= 9 && currentHour <= 18 && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
              style={{
                top: `${(currentHour - 9 + now.getMinutes() / 60) * 64}px`,
              }}
            >
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="h-px flex-1 bg-red-500/50" />
            </div>
          )}

          {/* Time slots */}
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className={cn(
                'group relative flex h-16 border-b border-border/40',
                slot.isPast && 'opacity-40'
              )}
            >
              {/* Hour label */}
              <div className="flex w-14 shrink-0 items-start justify-end pr-3 pt-1">
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    slot.isCurrent ? 'text-violet-600 dark:text-violet-400' : 'text-foreground/60'
                  )}
                >
                  {slot.label}
                </span>
              </div>

              {/* Slot content */}
              <div className="relative flex-1 pr-3">
                {slot.meeting && (
                  // Meeting card
                  <div
                    className={cn(
                      'absolute inset-x-0 top-1 rounded-lg border p-2 transition-all',
                      slot.isCurrent
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : 'border-border/60 bg-muted/50 hover:bg-muted'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {slot.meeting.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-foreground/60">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {format(parseISO(slot.meeting.start_time), 'h:mm')} -{' '}
                            {format(parseISO(slot.meeting.end_time), 'h:mm a')}
                          </span>
                        </div>
                        {slot.meeting.client && (
                          <p className="mt-0.5 truncate text-[11px] text-foreground/50">
                            {slot.meeting.client.display_name}
                          </p>
                        )}
                      </div>
                      {slot.meeting.meeting_link && !slot.isPast && (
                        <a
                          href={slot.meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all',
                            slot.isCurrent
                              ? 'bg-violet-500 text-white hover:bg-violet-400'
                              : 'bg-muted text-foreground/70 hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <Video className="h-3 w-3" />
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <NewMeetingModalControlled open={showMeetingModal} onOpenChange={setShowMeetingModal} />
    </div>
  );
}
