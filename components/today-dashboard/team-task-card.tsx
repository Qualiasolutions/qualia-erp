'use client';

import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { Clock, Calendar } from 'lucide-react';
import { ISSUE_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/lib/color-constants';
import type { TeamMemberTask } from '@/app/actions/team-dashboard';

interface TeamTaskCardProps {
  task: TeamMemberTask;
}

export function TeamTaskCard({ task }: TeamTaskCardProps) {
  const priorityColor = ISSUE_PRIORITY_COLORS[task.priority as keyof typeof ISSUE_PRIORITY_COLORS];
  const statusColors = TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS];

  const isOverdue =
    task.due_date &&
    !['Done'].includes(task.status) &&
    isPast(new Date(task.due_date + 'T23:59:59'));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const timeSpent =
    task.time_log?.time_spent_minutes != null
      ? task.time_log.time_spent_minutes >= 60
        ? `${Math.floor(task.time_log.time_spent_minutes / 60)}h ${task.time_log.time_spent_minutes % 60}m`
        : `${task.time_log.time_spent_minutes}m`
      : null;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 transition-colors duration-100',
        'hover:bg-muted/40'
      )}
    >
      {/* Priority dot */}
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          priorityColor ? priorityColor.icon.replace('text-', 'bg-') : 'bg-slate-300'
        )}
        title={task.priority}
      />

      {/* Status circle */}
      <span
        className={cn(
          'size-3.5 shrink-0 rounded-full border-2',
          statusColors
            ? `${statusColors.border} ${task.status === 'In Progress' ? 'border-blue-500' : ''}`
            : 'border-muted-foreground/30',
          task.status === 'Done' && 'border-emerald-500 bg-emerald-500',
          task.status === 'In Progress' && 'border-blue-500',
          task.status === 'Todo' && 'border-muted-foreground/40'
        )}
        title={task.status}
      >
        {task.status === 'In Progress' && (
          <span className="block size-full scale-[0.4] rounded-full bg-blue-500" />
        )}
      </span>

      {/* Title + project */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium leading-tight text-foreground',
            task.status === 'Done' && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </span>
        {task.project && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {task.project.name}
          </span>
        )}
      </div>

      {/* Right side: due date + time spent */}
      <div className="flex shrink-0 items-center gap-2">
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums',
              isOverdue
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                : isDueToday
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            <Calendar className="size-3" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}

        {timeSpent && (
          <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            <Clock className="size-3" />
            {timeSpent}
          </span>
        )}
      </div>
    </div>
  );
}
