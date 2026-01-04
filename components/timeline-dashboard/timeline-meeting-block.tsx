'use client';

import { memo } from 'react';
import { Video, ExternalLink, Users } from 'lucide-react';
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
 * Polished meeting block positioned on the timeline
 * Clean design with elegant live state and interactions
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
        'group absolute bottom-2 top-4 rounded-lg border transition-all duration-150',
        isLive
          ? 'border-qualia-500/50 bg-card shadow-sm shadow-qualia-500/10 ring-1 ring-qualia-500/20'
          : 'border-border/60 bg-card hover:border-border hover:bg-muted hover:shadow-sm',
        className
      )}
      style={{
        left: `${startPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '70px',
      }}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden px-2.5 py-1.5">
        {/* Title row */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
              isLive ? 'bg-qualia-500/20' : 'bg-muted'
            )}
          >
            <Video
              className={cn('h-3 w-3', isLive ? 'text-qualia-500' : 'text-muted-foreground')}
            />
          </div>
          <span
            className={cn(
              'truncate text-xs font-medium leading-tight',
              isLive ? 'text-qualia-700 dark:text-qualia-300' : 'text-foreground'
            )}
          >
            {meeting.title}
          </span>
        </div>

        {/* Time row */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-muted-foreground/80">
            {formatMinutesToDisplay(startMinutes).replace(' AM', '').replace(' PM', '')}
            {' - '}
            {formatMinutesToDisplay(endMinutes).replace(' AM', '').replace(' PM', '')}
          </span>

          {/* Join button */}
          {meeting.meeting_link && (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                isLive
                  ? 'bg-qualia-500 text-white hover:bg-qualia-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              Join
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Project name if available - shown on hover */}
        {meeting.project?.name && (
          <div className="mt-0.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Users className="h-2.5 w-2.5 text-muted-foreground/60" />
            <span className="truncate text-[9px] text-muted-foreground/70">
              {meeting.project.name}
            </span>
          </div>
        )}
      </div>

      {/* Live indicator - more elegant */}
      {isLive && (
        <div className="absolute right-2 top-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qualia-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-qualia-500 shadow-sm shadow-qualia-500/40" />
          </span>
        </div>
      )}

      {/* Live text badge - inside container */}
      {isLive && (
        <div className="absolute left-2 top-1">
          <span className="rounded bg-qualia-500 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white shadow-sm">
            Live
          </span>
        </div>
      )}
    </div>
  );
});
