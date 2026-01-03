'use client';

import * as React from 'react';
import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_COLORS } from '@/lib/color-constants';
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

  const isCompleted = task.status === 'Done';
  const isInProgress = task.status === 'In Progress';
  const isHighPriority = task.priority === 'Urgent' || task.priority === 'High';

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
        'group flex items-center gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2',
        'cursor-pointer transition-all duration-150',
        'hover:border-border hover:bg-muted/30',
        isCompleted && 'opacity-40'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckClick}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150',
          isCompleted
            ? 'border-foreground/20 bg-foreground/10'
            : isInProgress
              ? 'border-foreground/30 bg-foreground/5'
              : 'border-border hover:border-foreground/30'
        )}
      >
        {isCompleted && <Check className="h-3 w-3 text-foreground/50" />}
        {isInProgress && <div className="h-1.5 w-1.5 rounded-full bg-foreground/40" />}
      </button>

      {/* User indicator */}
      {userColors && <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', userColors.dot)} />}

      {/* Task title */}
      <span
        className={cn(
          'flex-1 truncate text-sm text-foreground/80',
          isCompleted && 'text-foreground/40 line-through'
        )}
      >
        {task.title}
      </span>

      {/* Priority indicator */}
      {!compact && isHighPriority && (
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            task.priority === 'Urgent'
              ? 'bg-foreground/5 text-foreground/50'
              : 'bg-foreground/5 text-foreground/40'
          )}
        >
          {task.priority}
        </span>
      )}

      {/* Assignee initial (compact mode) */}
      {compact && userColorKey && (
        <span className="shrink-0 text-xs font-medium text-muted-foreground/60">
          {userColorKey === 'fawzi' ? 'F' : 'M'}
        </span>
      )}
    </div>
  );
});

TaskSlot.displayName = 'TaskSlot';
