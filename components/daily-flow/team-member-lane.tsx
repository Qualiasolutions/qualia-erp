'use client';

import { memo, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, Loader2, ArrowRight } from 'lucide-react';
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
 * Task card - minimal, professional design
 */
const TaskCard = memo(function TaskCard({
  task,
  isActive,
  colorKey,
  onComplete,
  onClick,
  isCompleting,
}: {
  task: Task;
  isActive: boolean;
  colorKey: 'fawzi' | 'moayad';
  onComplete: () => void;
  onClick: () => void;
  isCompleting: boolean;
}) {
  const colors = USER_COLORS[colorKey];

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded border p-3 transition-colors',
        isActive
          ? `${colors.border} ${colors.bg}`
          : 'border-border/50 bg-background hover:border-border'
      )}
    >
      {/* Completion checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        disabled={isCompleting}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          'hover:border-foreground hover:bg-muted',
          isActive ? colors.border : 'border-border'
        )}
      >
        {isCompleting ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
        ) : (
          <Check className="h-2.5 w-2.5 opacity-0 group-hover:opacity-30" />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <p
          className={cn(
            'truncate text-sm',
            isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}
        >
          {task.title}
        </p>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {task.project && <span className="max-w-[100px] truncate">{task.project.name}</span>}
          {isActive && task.status === 'In Progress' && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getElapsedTime(task)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Team member lane - clean, professional layout
 */
export const TeamMemberLane = memo(function TeamMemberLane({
  member,
  currentTask,
  upcomingTasks,
  isCurrentUser,
  onTaskClick,
  onAssignTask,
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
          <h3 className="text-sm font-semibold text-foreground">
            {member.full_name || member.email.split('@')[0]}
          </h3>
        </div>
        {isCurrentUser && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">You</span>
        )}
      </div>

      {/* Current Task */}
      <div className="mb-4">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Active
        </div>

        {currentTask ? (
          <TaskCard
            task={currentTask}
            isActive={true}
            colorKey={member.colorKey}
            onComplete={() => handleCompleteTask(currentTask.id)}
            onClick={() => onTaskClick?.(currentTask)}
            isCompleting={isPending}
          />
        ) : (
          <div className="flex h-14 items-center justify-center rounded border border-dashed border-border/60 text-xs text-muted-foreground dark:border-border">
            No active task
          </div>
        )}
      </div>

      {/* Up Next */}
      <div className="flex-1">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Queue ({upcomingTasks.length})
        </div>

        {upcomingTasks.length > 0 ? (
          <div className="space-y-1.5">
            {upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={false}
                colorKey={member.colorKey}
                onComplete={() => handleCompleteTask(task.id)}
                onClick={() => onTaskClick?.(task)}
                isCompleting={isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-10 items-center justify-center rounded border border-dashed border-border/60 text-xs text-muted-foreground dark:border-border">
            Empty
          </div>
        )}
      </div>

      {/* Action */}
      {member.role === 'lead' && (
        <div className="mt-4 border-t border-border/60 pt-3 dark:border-border">
          <button
            onClick={onAssignTask}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-border"
          >
            Assign Task
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
});

export default TeamMemberLane;
