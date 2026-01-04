'use client';

import { memo } from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineMeeting } from '@/app/actions/timeline-dashboard';
import {
  getMeetingTimelinePosition,
  formatMinutesToDisplay,
  getMinutesFromMidnight,
} from '@/lib/timeline-utils';

interface TimelineMeetingBlockProps {
  meeting: TimelineMeeting;
  className?: string;
}

/**
 * Meeting block positioned on the timeline
 * Shows title, time, and optional join link
 */
export const TimelineMeetingBlock = memo(function TimelineMeetingBlock({
  meeting,
  className,
}: TimelineMeetingBlockProps) {
  const { startPercent, widthPercent, isLive } = getMeetingTimelinePosition(meeting);
  const startMinutes = getMinutesFromMidnight(meeting.start_time);
  const endMinutes = getMinutesFromMidnight(meeting.end_time);

  return (
    <div
      className={cn(
        'absolute bottom-1 top-1 rounded-md border transition-all',
        isLive
          ? 'border-qualia-500 bg-qualia-500/20 ring-1 ring-qualia-500/30'
          : 'border-border bg-muted/50 hover:bg-muted',
        className
      )}
      style={{
        left: `${startPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '60px',
      }}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        {/* Title */}
        <div className="flex items-center gap-1">
          <Video
            className={cn(
              'h-3 w-3 flex-shrink-0',
              isLive ? 'text-qualia-500' : 'text-muted-foreground'
            )}
          />
          <span
            className={cn(
              'truncate text-xs font-medium',
              isLive ? 'text-qualia-600 dark:text-qualia-400' : 'text-foreground'
            )}
          >
            {meeting.title}
          </span>
        </div>

        {/* Time and link */}
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {formatMinutesToDisplay(startMinutes)} - {formatMinutesToDisplay(endMinutes)}
          </span>

          {meeting.meeting_link && (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[10px] text-qualia-500 hover:text-qualia-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Join
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Project name if available */}
        {meeting.project?.name && (
          <span className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {meeting.project.name}
          </span>
        )}
      </div>

      {/* Live indicator pulse */}
      {isLive && (
        <div className="absolute right-1 top-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qualia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-qualia-500" />
          </span>
        </div>
      )}
    </div>
  );
});
