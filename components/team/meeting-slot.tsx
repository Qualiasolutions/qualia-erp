'use client';

import * as React from 'react';
import { memo } from 'react';
import { Calendar, Clock, ExternalLink } from 'lucide-react';
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
        'group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
        'border-purple-500/30 bg-purple-500/10',
        'cursor-pointer hover:bg-purple-500/20'
      )}
    >
      {/* Calendar icon */}
      <Calendar className="h-4 w-4 shrink-0 text-purple-500" />

      {/* Time */}
      <div className="flex shrink-0 items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
        <Clock className="h-3 w-3" />
        <span>{format(startTime, 'h:mm a')}</span>
        {!compact && (
          <>
            <span>-</span>
            <span>{format(endTime, 'h:mm a')}</span>
          </>
        )}
      </div>

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium">{meeting.title}</span>

      {/* Project/Client badge */}
      {!compact && (meeting.project || meeting.client) && (
        <span className="shrink-0 truncate rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {meeting.project?.name || meeting.client?.display_name}
        </span>
      )}

      {/* Meeting link */}
      {meeting.meeting_link && (
        <button
          onClick={handleLinkClick}
          className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-purple-500/20 group-hover:opacity-100"
          title="Join meeting"
        >
          <ExternalLink className="h-3 w-3 text-purple-500" />
        </button>
      )}
    </div>
  );
});

MeetingSlot.displayName = 'MeetingSlot';
