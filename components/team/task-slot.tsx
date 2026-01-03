'use client';

import * as React from 'react';
import { memo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_COLORS, TASK_PRIORITY_COLORS } from '@/lib/color-constants';
import { getUserColorKey } from '@/lib/schedule-utils';
import type { Task } from '@/app/actions/inbox';

interface TaskSlotProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  compact?: boolean;
}

export const TaskSlot = memo(function TaskSlot({
  task,
  onComplete,
  onClick,
  compact = false,
}: TaskSlotProps) {
  const userColorKey = getUserColorKey(task.assignee?.email);
  const userColors = userColorKey ? USER_COLORS[userColorKey] : null;
  const priorityColors = TASK_PRIORITY_COLORS[task.priority] || TASK_PRIORITY_COLORS['No Priority'];

  const isCompleted = task.status === 'Done';
  const isInProgress = task.status === 'In Progress';

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComplete && !isCompleted) {
      onComplete(task.id);
    }
  };

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
        'cursor-pointer hover:bg-muted/50',
        userColors ? userColors.bg : 'bg-muted/30',
        userColors ? userColors.border : 'border-border',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckClick}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          isCompleted
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : isInProgress
              ? 'border-blue-500 bg-blue-500/20'
              : 'border-muted-foreground/40 hover:border-muted-foreground'
        )}
      >
        {isCompleted ? (
          <Check className="h-3 w-3" />
        ) : isInProgress ? (
          <Circle className="h-2 w-2 fill-blue-500" />
        ) : null}
      </button>

      {/* User color dot */}
      {userColors && <div className={cn('h-2 w-2 shrink-0 rounded-full', userColors.dot)} />}

      {/* Task title */}
      <span
        className={cn(
          'flex-1 truncate text-sm',
          isCompleted && 'text-muted-foreground line-through'
        )}
      >
        {task.title}
      </span>

      {/* Priority badge (only show for high/urgent) */}
      {!compact && (task.priority === 'Urgent' || task.priority === 'High') && (
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
            priorityColors.bg,
            priorityColors.text
          )}
        >
          {task.priority}
        </span>
      )}

      {/* Assignee name (compact mode) */}
      {compact && userColorKey && (
        <span className={cn('shrink-0 text-xs', userColors?.text)}>
          {userColorKey === 'fawzi' ? 'F' : 'M'}
        </span>
      )}
    </div>
  );
});

TaskSlot.displayName = 'TaskSlot';
