'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, Check } from 'lucide-react';
import { ISSUE_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/lib/color-constants';
import type { TeamMemberTask } from '@/app/actions/team-dashboard';
import { TaskTimeTracker } from '@/components/task-time-tracker';
import { updateTask } from '@/app/actions/inbox';
import { invalidateTeamDashboard, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';

interface TeamTaskCardProps {
  task: TeamMemberTask;
  currentUserId?: string | null;
  onTaskUpdate?: () => void;
  workspaceId?: string;
}

export function TeamTaskCard({
  task,
  currentUserId,
  onTaskUpdate,
  workspaceId,
}: TeamTaskCardProps) {
  const [marking, setMarking] = useState(false);
  const priorityColor = ISSUE_PRIORITY_COLORS[task.priority as keyof typeof ISSUE_PRIORITY_COLORS];
  const statusColors = TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS];

  const isOverdue =
    task.due_date &&
    !['Done'].includes(task.status) &&
    isPast(new Date(task.due_date + 'T23:59:59'));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const isOwner = currentUserId != null && currentUserId === task.assignee_id;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 transition-all duration-200',
        'hover:bg-muted/30',
        task.status === 'In Progress' && 'bg-blue-500/[0.02]'
      )}
    >
      {/* Active task left accent */}
      {task.status === 'In Progress' && (
        <div className="absolute inset-y-0 left-0 w-[2px] rounded-r-full bg-blue-500/60" />
      )}

      {/* Priority dot */}
      <span
        className={cn(
          'group-hover:ring-current/10 size-1.5 shrink-0 rounded-full ring-2 ring-transparent transition-all duration-200',
          priorityColor ? priorityColor.icon.replace('text-', 'bg-') : 'bg-slate-300'
        )}
        title={task.priority}
      />

      {/* Status circle — clickable to mark as done */}
      <button
        type="button"
        disabled={marking || task.status === 'Done'}
        onClick={async (e) => {
          e.stopPropagation();
          if (marking || task.status === 'Done') return;
          setMarking(true);
          const fd = new FormData();
          fd.set('id', task.id);
          fd.set('status', 'Done');
          const result = await updateTask(fd);
          if (result.success) {
            if (workspaceId) invalidateTeamDashboard(workspaceId);
            invalidateInboxTasks(true);
            invalidateDailyFlow(true);
            onTaskUpdate?.();
          }
          setMarking(false);
        }}
        className={cn(
          'flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          statusColors
            ? `${statusColors.border} ${task.status === 'In Progress' ? 'border-blue-500' : ''}`
            : 'border-muted-foreground/30',
          task.status === 'Done' && 'border-emerald-500 bg-emerald-500',
          task.status === 'In Progress' && 'border-blue-500',
          task.status === 'Todo' &&
            'border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10 group-hover:border-muted-foreground/50',
          marking && 'animate-pulse border-emerald-500 bg-emerald-500/20'
        )}
        title={task.status === 'Done' ? 'Done' : 'Mark as done'}
      >
        {task.status === 'Done' && <Check className="size-2 text-white" />}
        {task.status === 'In Progress' && !marking && (
          <span className="block size-full scale-[0.4] rounded-full bg-blue-500" />
        )}
      </button>

      {/* Title + project */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13px] font-medium leading-tight text-foreground transition-colors duration-200',
            task.status === 'Done' && 'text-muted-foreground/60 line-through',
            task.status === 'In Progress' && 'text-foreground'
          )}
        >
          {task.title}
        </span>
        {task.project && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/60 transition-colors duration-200 group-hover:text-muted-foreground/80">
            {task.project.name}
          </span>
        )}
      </div>

      {/* Right side: due date + time spent */}
      <div className="flex shrink-0 items-center gap-2 opacity-80 transition-opacity duration-200 group-hover:opacity-100">
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
              isOverdue
                ? 'bg-red-500/8 text-red-600 ring-1 ring-inset ring-red-500/15 dark:bg-red-500/10 dark:text-red-400'
                : isDueToday
                  ? 'bg-amber-500/8 text-amber-700 ring-1 ring-inset ring-amber-500/15 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-muted/60 text-muted-foreground/70'
            )}
          >
            <Calendar className="size-2.5" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}

        {/* Time tracker: interactive for task owner, read-only badge for others */}
        {isOwner ? (
          <TaskTimeTracker
            taskId={task.id}
            timeLog={task.time_log}
            readOnly={false}
            onUpdate={onTaskUpdate}
          />
        ) : (
          <TaskTimeTracker taskId={task.id} timeLog={task.time_log} readOnly />
        )}
      </div>
    </div>
  );
}
