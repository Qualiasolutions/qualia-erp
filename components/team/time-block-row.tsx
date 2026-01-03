'use client';

import * as React from 'react';
import { memo, useState } from 'react';
import { Sun, Target, Coffee, CheckCircle2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCHEDULE_BLOCK_COLORS } from '@/lib/color-constants';
import type { TimeBlock, TimeBlockType } from '@/lib/schedule-constants';
import { formatMinutesToTime, parseTimeToMinutes } from '@/lib/schedule-constants';
import { TaskSlot } from './task-slot';
import { MeetingSlot } from './meeting-slot';
import type { Task } from '@/app/actions/inbox';

// Icons for each block type
const BLOCK_ICONS: Record<TimeBlockType, React.ElementType> = {
  standup: Sun,
  focus: Target,
  break: Coffee,
  wrapup: CheckCircle2,
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
  progress?: number; // 0-100 for current block
  onTaskComplete?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  onMeetingClick?: (meeting: Meeting) => void;
  onStartTimer?: (blockId: string) => void;
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
  onStartTimer,
}: TimeBlockRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = SCHEDULE_BLOCK_COLORS[block.type];
  const Icon = BLOCK_ICONS[block.type];

  const startMinutes = parseTimeToMinutes(block.start);
  const endMinutes = parseTimeToMinutes(block.end);
  const startTime = formatMinutesToTime(startMinutes);
  const endTime = formatMinutesToTime(endMinutes);

  const hasTasks = tasks.length > 0;
  const hasMeetings = meetings.length > 0;
  const hasContent = hasTasks || hasMeetings;
  const isFocusBlock = block.type === 'focus';

  return (
    <div
      className={cn(
        'relative rounded-lg border transition-all',
        colors.bg,
        colors.border,
        isActive && 'ring-2 ring-offset-2',
        isActive && colors.border.replace('border-', 'ring-')
      )}
    >
      {/* Progress bar for active block */}
      {isActive && progress > 0 && (
        <div
          className={cn('absolute left-0 top-0 h-1 rounded-t-lg transition-all', colors.accent)}
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          hasContent && 'cursor-pointer',
          hasContent && 'border-b',
          hasContent && colors.border
        )}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        {/* Block icon */}
        <div
          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', colors.bg)}
        >
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>

        {/* Block info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('text-sm font-medium', colors.text)}>{block.label}</h3>
            {isActive && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500">
                NOW
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {startTime} - {endTime}
            </span>
            <span>({block.durationMinutes} min)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Start timer button for focus blocks */}
          {isFocusBlock && onStartTimer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer(block.id);
              }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              <Play className="h-3 w-3" />
              Timer
            </button>
          )}

          {/* Task/meeting count */}
          {hasContent && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasTasks && (
                <span>
                  {tasks.length} task{tasks.length > 1 ? 's' : ''}
                </span>
              )}
              {hasTasks && hasMeetings && <span>·</span>}
              {hasMeetings && (
                <span>
                  {meetings.length} meeting{meetings.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Expand/collapse */}
          {hasContent && (
            <button className="rounded p-1 hover:bg-muted">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content (tasks and meetings) */}
      {hasContent && isExpanded && (
        <div className="space-y-2 px-4 py-3">
          {/* Meetings first */}
          {meetings.map((meeting) => (
            <MeetingSlot key={meeting.id} meeting={meeting} onClick={onMeetingClick} />
          ))}

          {/* Then tasks */}
          {tasks.map((task) => (
            <TaskSlot key={task.id} task={task} onComplete={onTaskComplete} onClick={onTaskClick} />
          ))}
        </div>
      )}

      {/* Break block description */}
      {block.type === 'break' && !hasContent && (
        <div className="px-4 pb-3 text-xs text-muted-foreground">{block.description}</div>
      )}
    </div>
  );
});

TimeBlockRow.displayName = 'TimeBlockRow';
