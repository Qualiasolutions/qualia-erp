'use client';

import { memo, useTransition, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, Clock, Loader2, MoreHorizontal, Calendar, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { quickUpdateTask } from '@/app/actions/inbox';
import { invalidateDailyFlow } from '@/lib/swr';
import type { Task } from '@/app/actions/inbox';

// Priority configuration - Things 3 inspired colors
const PRIORITY_CONFIG = {
  Urgent: {
    label: 'P1',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    dot: 'bg-red-500',
  },
  High: {
    label: 'P2',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  Medium: {
    label: 'P3',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  Low: {
    label: '',
    bg: '',
    border: '',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/30',
  },
  'No Priority': {
    label: '',
    bg: '',
    border: '',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/30',
  },
} as const;

interface FocusTaskCardProps {
  task: Task;
  isSelected?: boolean;
  isActive?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onComplete?: () => void;
}

/**
 * Calculate time elapsed since task started
 */
function getElapsedTime(task: Task): string {
  const startTime = new Date(task.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Focus Task Card - Things 3 inspired design
 * Large checkbox, priority badges, project chips, quick actions on hover
 */
export const FocusTaskCard = memo(function FocusTaskCard({
  task,
  isSelected = false,
  isActive = false,
  onSelect,
  onClick,
  onComplete: externalOnComplete,
}: FocusTaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  const priority = (task.priority as keyof typeof PRIORITY_CONFIG) || 'No Priority';
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['No Priority'];
  const hasPriority = priority !== 'No Priority' && priority !== 'Low';

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (externalOnComplete) {
      externalOnComplete();
    } else {
      startTransition(async () => {
        await quickUpdateTask(task.id, { status: 'Done' });
        invalidateDailyFlow(true);
      });
    }
  };

  const handleSnooze = async (days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    startTransition(async () => {
      await quickUpdateTask(task.id, { due_date: newDate.toISOString() });
      invalidateDailyFlow(true);
    });
  };

  const handleSetPriority = async (
    newPriority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low'
  ) => {
    startTransition(async () => {
      await quickUpdateTask(task.id, { priority: newPriority });
      invalidateDailyFlow(true);
    });
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-3.5 transition-all duration-150',
        isSelected
          ? 'border-qualia-500/50 bg-qualia-500/5 ring-1 ring-qualia-500/20'
          : isActive
            ? 'border-qualia-500/30 bg-qualia-500/5'
            : 'border-border/60 bg-card hover:border-border hover:shadow-sm dark:border-border'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Checkbox - Large, Things 3 style */}
      <button
        onClick={handleComplete}
        disabled={isPending}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
          isActive
            ? 'border-qualia-500 hover:bg-qualia-500/20'
            : hasPriority
              ? `${priorityConfig.border} hover:bg-${priority === 'Urgent' ? 'red' : priority === 'High' ? 'orange' : 'amber'}-500/20`
              : 'border-border hover:border-foreground/50 hover:bg-muted'
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <Check
            className={cn(
              'h-3 w-3 transition-opacity',
              isHovered ? 'opacity-30' : 'opacity-0',
              isActive ? 'text-qualia-500' : 'text-muted-foreground'
            )}
          />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        {/* Title row */}
        <div className="flex items-start gap-2">
          <p
            className={cn(
              'flex-1 text-sm leading-snug',
              isActive ? 'font-medium text-foreground' : 'text-foreground'
            )}
          >
            {task.title}
          </p>

          {/* Priority badge */}
          {hasPriority && (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                priorityConfig.bg,
                priorityConfig.text
              )}
            >
              {priorityConfig.label}
            </span>
          )}
        </div>

        {/* Metadata row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {/* Project chip */}
          {task.project && (
            <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[11px]">
              {task.project.name}
            </span>
          )}

          {/* Active indicator */}
          {isActive && task.status === 'In Progress' && (
            <span className="flex items-center gap-1 text-qualia-500">
              <Circle className="h-1.5 w-1.5 fill-current" />
              <Clock className="h-3 w-3" />
              {getElapsedTime(task)}
            </span>
          )}

          {/* Due date */}
          {task.due_date && !isActive && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions - visible on hover */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity duration-150',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleSnooze(1)}>
              <Calendar className="mr-2 h-4 w-4" />
              Snooze until tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSnooze(7)}>
              <Calendar className="mr-2 h-4 w-4" />
              Snooze 1 week
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetPriority('Urgent')}>
              <Flag className="mr-2 h-4 w-4 text-red-500" />
              Set Priority 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('High')}>
              <Flag className="mr-2 h-4 w-4 text-orange-500" />
              Set Priority 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('Medium')}>
              <Flag className="mr-2 h-4 w-4 text-amber-500" />
              Set Priority 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('No Priority')}>
              <Flag className="mr-2 h-4 w-4 text-muted-foreground" />
              Clear priority
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export default FocusTaskCard;
