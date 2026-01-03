'use client';

import { memo, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, Clock, HelpCircle, Loader2, MoreHorizontal, Play } from 'lucide-react';
import { USER_COLORS } from '@/lib/color-constants';
import { quickUpdateTask } from '@/app/actions/inbox';
import { invalidateDailyFlow } from '@/lib/swr';
import type { Task } from '@/app/actions/inbox';
import type { TeamMember } from '@/app/actions/daily-flow';

interface TeamMemberLaneProps {
  member: TeamMember;
  currentTask: Task | null;
  upcomingTasks: Task[];
  isCurrentUser: boolean;
  onTaskClick?: (task: Task) => void;
  onAssignTask?: () => void;
  onNeedHelp?: () => void;
}

/**
 * Calculate time elapsed since task started (In Progress)
 */
function getElapsedTime(task: Task): string {
  // Use updated_at as proxy for when task moved to In Progress
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
 * Work item card component
 */
const WorkItemCard = memo(function WorkItemCard({
  task,
  isCurrentTask,
  colorKey,
  onComplete,
  onClick,
  isCompleting,
}: {
  task: Task;
  isCurrentTask: boolean;
  colorKey: 'fawzi' | 'moayad';
  onComplete: () => void;
  onClick: () => void;
  isCompleting: boolean;
}) {
  const colors = USER_COLORS[colorKey];
  const isInProgress = task.status === 'In Progress';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border p-3 transition-all',
        'hover:border-border hover:bg-muted/30',
        isCurrentTask ? `${colors.bg} ${colors.border}` : 'border-border/50 bg-background/50'
      )}
    >
      {/* Checkbox / Status */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        disabled={isCompleting}
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
          'hover:border-emerald-500 hover:bg-emerald-500/10',
          isInProgress ? `${colors.border} ${colors.bg}` : 'border-muted-foreground/30'
        )}
      >
        {isCompleting ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : isInProgress ? (
          <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
        ) : null}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'cursor-pointer truncate text-sm font-medium hover:text-foreground',
              isCurrentTask ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {task.title}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          {/* Project badge */}
          {task.project && (
            <span className="max-w-[120px] truncate text-xs text-muted-foreground">
              {task.project.name}
            </span>
          )}

          {/* Time elapsed for In Progress tasks */}
          {isInProgress && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {getElapsedTime(task)}
            </span>
          )}

          {/* Priority badge */}
          {task.priority !== 'No Priority' && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                task.priority === 'Urgent' && 'bg-red-500/10 text-red-500',
                task.priority === 'High' && 'bg-orange-500/10 text-orange-500'
              )}
            >
              {task.priority}
            </span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <button className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100">
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
});

/**
 * Team member lane showing their current task and upcoming work
 */
export const TeamMemberLane = memo(function TeamMemberLane({
  member,
  currentTask,
  upcomingTasks,
  isCurrentUser,
  onTaskClick,
  onAssignTask,
  onNeedHelp,
}: TeamMemberLaneProps) {
  const [isPending, startTransition] = useTransition();
  const colors = USER_COLORS[member.colorKey];

  const handleCompleteTask = async (taskId: string) => {
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: 'Done' });
      invalidateDailyFlow(true);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('h-3 w-3 rounded-full', colors.dot)} />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {member.full_name || member.email.split('@')[0]}
          </h3>
          <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
        </div>
        {isCurrentUser && (
          <span className="rounded-full bg-qualia-500/10 px-2 py-0.5 text-[10px] font-medium text-qualia-500">
            You
          </span>
        )}
      </div>

      {/* Current Task */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Play className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Now Working On
          </span>
        </div>

        {currentTask ? (
          <WorkItemCard
            task={currentTask}
            isCurrentTask={true}
            colorKey={member.colorKey}
            onComplete={() => handleCompleteTask(currentTask.id)}
            onClick={() => onTaskClick?.(currentTask)}
            isCompleting={isPending}
          />
        ) : (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground">
            <Circle className="mr-2 h-4 w-4 opacity-50" />
            No active task
          </div>
        )}
      </div>

      {/* Up Next */}
      <div className="flex-1">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Up Next
          </span>
        </div>

        {upcomingTasks.length > 0 ? (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <WorkItemCard
                key={task.id}
                task={task}
                isCurrentTask={false}
                colorKey={member.colorKey}
                onComplete={() => handleCompleteTask(task.id)}
                onClick={() => onTaskClick?.(task)}
                isCompleting={isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground">
            No upcoming tasks
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 border-t border-border/50 pt-4">
        {member.role === 'lead' ? (
          <button
            onClick={onAssignTask}
            className="w-full rounded-lg border border-dashed border-border/50 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/30"
          >
            + Assign Task
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onNeedHelp}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
            >
              <HelpCircle className="h-4 w-4" />
              Need Help?
            </button>
            {currentTask && (
              <button
                onClick={() => currentTask && handleCompleteTask(currentTask.id)}
                disabled={isPending || !currentTask}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
              >
                <Check className="h-4 w-4" />
                Done!
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default TeamMemberLane;
