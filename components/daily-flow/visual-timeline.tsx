'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Video, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { DailyMeeting } from '@/app/actions/daily-flow';

// Working hours: 8:30 AM - 2:30 PM (6 hours = 360 minutes)
const WORK_START_MINUTES = 8 * 60 + 30; // 8:30 AM
const WORK_END_MINUTES = 14 * 60 + 30; // 2:30 PM
const TOTAL_WORK_MINUTES = WORK_END_MINUTES - WORK_START_MINUTES;

// Time markers to display
const TIME_MARKERS = [
  { time: '8:30', minutes: WORK_START_MINUTES },
  { time: '9:00', minutes: 9 * 60 },
  { time: '10:00', minutes: 10 * 60 },
  { time: '11:00', minutes: 11 * 60 },
  { time: '12:00', minutes: 12 * 60 },
  { time: '1:00', minutes: 13 * 60 },
  { time: '2:00', minutes: 14 * 60 },
  { time: '2:30', minutes: WORK_END_MINUTES },
];

interface VisualTimelineProps {
  meetings: DailyMeeting[];
  onMeetingClick?: (meeting: DailyMeeting) => void;
}

/**
 * Get position percentage for a time within working hours
 */
function getTimePosition(minutes: number): number {
  if (minutes < WORK_START_MINUTES) return 0;
  if (minutes > WORK_END_MINUTES) return 100;
  return ((minutes - WORK_START_MINUTES) / TOTAL_WORK_MINUTES) * 100;
}

/**
 * Get meeting duration as percentage of timeline
 */
function getMeetingWidth(startMinutes: number, endMinutes: number): number {
  const clampedStart = Math.max(startMinutes, WORK_START_MINUTES);
  const clampedEnd = Math.min(endMinutes, WORK_END_MINUTES);
  return ((clampedEnd - clampedStart) / TOTAL_WORK_MINUTES) * 100;
}

/**
 * Check if meeting is currently happening
 */
function isMeetingLive(meeting: DailyMeeting): boolean {
  const now = new Date();
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  return now >= start && now <= end;
}

/**
 * NOW indicator component
 */
const NowIndicator = memo(function NowIndicator({
  position,
  isVisible,
}: {
  position: number;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div
      className="absolute bottom-0 top-0 z-10 flex flex-col items-center"
      style={{ left: `${position}%` }}
    >
      {/* Top triangle */}
      <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-qualia-500" />
      {/* Line */}
      <div className="w-0.5 flex-1 bg-qualia-500" />
      {/* Pulse dot */}
      <div className="relative">
        <div className="absolute -inset-1 animate-ping rounded-full bg-qualia-500/30" />
        <div className="h-2 w-2 rounded-full bg-qualia-500" />
      </div>
    </div>
  );
});

/**
 * Meeting block on timeline
 */
const TimelineMeeting = memo(function TimelineMeeting({
  meeting,
  left,
  width,
  onClick,
}: {
  meeting: DailyMeeting;
  left: number;
  width: number;
  onClick?: () => void;
}) {
  const isLive = isMeetingLive(meeting);
  const startTime = format(new Date(meeting.start_time), 'h:mm a');

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-8 flex h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all',
        'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-background',
        'min-w-[60px] overflow-hidden whitespace-nowrap',
        isLive
          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:ring-violet-400'
          : 'border border-violet-500/30 bg-violet-500/15 text-violet-600 hover:ring-violet-500/50 dark:text-violet-400'
      )}
      style={{
        left: `${left}%`,
        width: `${Math.max(width, 8)}%`,
      }}
      title={`${meeting.title} at ${startTime}`}
    >
      {isLive && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
      <Video className="h-3 w-3 shrink-0" />
      <span className="truncate">{meeting.title}</span>
      {meeting.meeting_link && <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />}
    </button>
  );
});

/**
 * Visual Timeline component showing 8:30 AM - 2:30 PM with meetings
 */
export const VisualTimeline = memo(function VisualTimeline({
  meetings,
  onMeetingClick,
}: VisualTimelineProps) {
  const [nowPosition, setNowPosition] = useState(0);
  const [isWithinHours, setIsWithinHours] = useState(false);

  // Update NOW position every minute
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const position = getTimePosition(currentMinutes);
      setNowPosition(position);
      setIsWithinHours(currentMinutes >= WORK_START_MINUTES && currentMinutes <= WORK_END_MINUTES);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Process meetings for positioning
  const positionedMeetings = useMemo(() => {
    return meetings.map((meeting) => {
      const start = new Date(meeting.start_time);
      const end = new Date(meeting.end_time);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      return {
        meeting,
        left: getTimePosition(startMinutes),
        width: getMeetingWidth(startMinutes, endMinutes),
      };
    });
  }, [meetings]);

  return (
    <div className="relative">
      {/* Timeline container */}
      <div className="relative h-24 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50">
        {/* Time markers */}
        <div className="absolute inset-x-0 top-0 flex h-6 items-center px-1">
          {TIME_MARKERS.map((marker) => {
            const position = getTimePosition(marker.minutes);
            return (
              <div
                key={marker.time}
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%` }}
              >
                <span className="-translate-x-1/2 text-[10px] font-medium text-muted-foreground/70">
                  {marker.time}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grid lines */}
        <div className="absolute inset-x-0 bottom-0 top-6">
          {TIME_MARKERS.slice(0, -1).map((marker) => {
            const position = getTimePosition(marker.minutes);
            return (
              <div
                key={marker.time}
                className="absolute bottom-0 top-0 w-px bg-border/30"
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>

        {/* Progress bar (elapsed time) */}
        {isWithinHours && (
          <div
            className="absolute bottom-0 left-0 top-6 bg-qualia-500/5"
            style={{ width: `${nowPosition}%` }}
          />
        )}

        {/* Meetings */}
        <div className="absolute inset-x-2 bottom-2 top-0">
          {positionedMeetings.map(({ meeting, left, width }) => (
            <TimelineMeeting
              key={meeting.id}
              meeting={meeting}
              left={left}
              width={width}
              onClick={() => {
                if (meeting.meeting_link) {
                  window.open(meeting.meeting_link, '_blank');
                } else {
                  onMeetingClick?.(meeting);
                }
              }}
            />
          ))}
        </div>

        {/* NOW indicator */}
        <div className="absolute inset-x-2 bottom-0 top-6">
          <NowIndicator position={nowPosition} isVisible={isWithinHours} />
        </div>
      </div>

      {/* Timeline label */}
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">8:30 AM</span>
        <span className="text-xs font-medium text-muted-foreground">
          {isWithinHours ? 'Working Hours' : 'Outside Working Hours'}
        </span>
        <span className="text-xs text-muted-foreground">2:30 PM</span>
      </div>
    </div>
  );
});

export default VisualTimeline;
