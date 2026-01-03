'use client';

import * as React from 'react';
import { memo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface MeetingSlotProps {
  meeting: Meeting;
  onClick?: (meeting: Meeting) => void;
  compact?: boolean;
}

export const MeetingSlot = memo(function MeetingSlot({
  meeting,
  onClick,
  compact = false,
}: MeetingSlotProps) {
  const startTime = parseISO(meeting.start_time);
  const endTime = parseISO(meeting.end_time);

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, '_blank');
    }
  };

  return (
    <div
      onClick={() => onClick?.(meeting)}
      className={cn(
        'group flex items-center gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2',
        'cursor-pointer transition-all duration-150',
        'hover:border-border hover:bg-muted/30'
      )}
    >
      {/* Time */}
      <div className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground/70">
        {format(startTime, 'h:mm')}
        {!compact && (
          <>
            <span className="text-muted-foreground/40"> – </span>
            {format(endTime, 'h:mm a')}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border/60" />

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium text-foreground/80">
        {meeting.title}
      </span>

      {/* Project/Client */}
      {!compact && (meeting.project || meeting.client) && (
        <span className="shrink-0 truncate rounded bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground/70">
          {meeting.project?.name || meeting.client?.display_name}
        </span>
      )}

      {/* Join link */}
      {meeting.meeting_link && (
        <button
          onClick={handleLinkClick}
          className={cn(
            'shrink-0 rounded-md border border-border/60 bg-background px-2 py-1',
            'text-xs font-medium text-foreground/60',
            'opacity-0 transition-all duration-150 group-hover:opacity-100',
            'hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="flex items-center gap-1">
            Join
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </button>
      )}
    </div>
  );
});

MeetingSlot.displayName = 'MeetingSlot';
