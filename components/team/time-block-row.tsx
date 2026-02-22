'use client';

import * as React from 'react';
import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCHEDULE_BLOCK_COLORS } from '@/lib/color-constants';
import type { TimeBlock, TimeBlockType } from '@/lib/schedule-constants';
import { formatMinutesToTime, parseTimeToMinutes } from '@/lib/schedule-constants';
import { TaskSlot } from './task-slot';
import { MeetingSlot } from './meeting-slot';
import type { Task } from '@/app/actions/inbox';

// Block type labels for professional display
const BLOCK_TYPE_LABELS: Record<TimeBlockType, string> = {
  standup: 'Sync',
  focus: 'Focus',
  break: 'Break',
  wrapup: 'Review',
};

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

interface TimeBlockRowProps {
  block: TimeBlock;
  tasks?: Task[];
  meetings?: Meeting[];
  isActive?: boolean;
  progress?: number;
  onTaskComplete?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  onMeetingClick?: (meeting: Meeting) => void;
}

export const TimeBlockRow = memo(function TimeBlockRow({
  block,
  tasks = [],
  meetings = [],
  isActive = false,
  progress = 0,
  onTaskComplete,
  onTaskClick,
  onMeetingClick,
}: TimeBlockRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = SCHEDULE_BLOCK_COLORS[block.type];

  const startMinutes = parseTimeToMinutes(block.start);
  const endMinutes = parseTimeToMinutes(block.end);
  const startTime = formatMinutesToTime(startMinutes);
  const endTime = formatMinutesToTime(endMinutes);

  const hasTasks = tasks.length > 0;
  const hasMeetings = meetings.length > 0;
  const hasContent = hasTasks || hasMeetings;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border transition-all duration-200',
        colors.border,
        isActive && 'ring-1 ring-foreground/10 ring-offset-1 ring-offset-background'
      )}
    >
      {/* Progress indicator for active block */}
      {isActive && progress > 0 && (
        <div
          className="absolute left-0 top-0 h-0.5 bg-foreground/20 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3 transition-colors',
          colors.headerBg,
          hasContent && 'cursor-pointer hover:bg-muted/30'
        )}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        {/* Time column */}
        <div className="w-24 shrink-0">
          <div className="font-mono text-sm tabular-nums text-foreground">{startTime}</div>
          <div className="font-mono text-xs tabular-nums text-muted-foreground/60">{endTime}</div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border/60" />

        {/* Block info */}
        <div className="flex flex-1 items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{block.label}</span>
              {isActive && (
                <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-foreground/50">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span>{BLOCK_TYPE_LABELS[block.type]}</span>
              <span>·</span>
              <span>{block.durationMinutes}m</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Content count */}
          {hasContent && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              {hasTasks && <span>{tasks.length}</span>}
              {hasTasks && hasMeetings && <span>·</span>}
              {hasMeetings && (
                <span>
                  {meetings.length} call{meetings.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Expand/collapse indicator */}
          {hasContent && (
            <ChevronRight
              className={cn(
                'h-4 w-4 text-muted-foreground/40 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </div>
      </div>

      {/* Content area */}
      {hasContent && isExpanded && (
        <div className={cn('border-t px-4 py-3', colors.border)}>
          <div className="space-y-2">
            {/* Meetings */}
            {meetings.map((meeting) => (
              <MeetingSlot key={meeting.id} meeting={meeting} onClick={onMeetingClick} />
            ))}

            {/* Tasks */}
            {tasks.map((task) => (
              <TaskSlot
                key={task.id}
                task={task}
                onComplete={onTaskComplete}
                onClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Break description */}
      {block.type === 'break' && !hasContent && (
        <div className="border-t border-border/40 px-4 py-2">
          <p className="text-xs text-muted-foreground/50">{block.description}</p>
        </div>
      )}
    </div>
  );
});

TimeBlockRow.displayName = 'TimeBlockRow';
