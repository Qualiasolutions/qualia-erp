'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TimelineTaskCard } from './timeline-task-card';
import type { TimelineTask, TeamMember } from '@/app/actions/timeline-dashboard';

interface TaskListSidebarProps {
  tasks: TimelineTask[];
  memberId: string;
  memberName: string;
  colorKey: 'fawzi' | 'moayad';
  isLead?: boolean;
  teamMembers?: TeamMember[];
  currentUserId?: string | null;
  newAssignments?: string[];
  onAssign?: (taskId: string, assigneeId: string) => void;
  onTaskClick?: (task: TimelineTask) => void;
  className?: string;
}

/**
 * Scrollable task list sidebar for a team member
 * Shows tasks grouped by status (In Progress first, then Todo)
 */
export const TaskListSidebar = memo(function TaskListSidebar({
  tasks,
  memberId,
  memberName,
  colorKey,
  isLead = false,
  teamMembers = [],
  currentUserId,
  newAssignments = [],
  onAssign,
  onTaskClick,
  className,
}: TaskListSidebarProps) {
  // Group tasks by status
  const { activeTasks, queuedTasks } = useMemo(() => {
    const memberTasks = tasks.filter((t) => t.assignee_id === memberId);
    return {
      activeTasks: memberTasks.filter((t) => t.status === 'In Progress'),
      queuedTasks: memberTasks.filter((t) => t.status === 'Todo'),
    };
  }, [tasks, memberId]);

  const totalTasks = activeTasks.length + queuedTasks.length;

  if (totalTasks === 0) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center text-sm text-muted-foreground',
          className
        )}
      >
        No tasks assigned
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{memberName}&apos;s Tasks</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {totalTasks}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  colorKey === 'fawzi' ? 'bg-qualia-500' : 'bg-indigo-500'
                )}
              />
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                In Progress
              </span>
            </div>
            {activeTasks.map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                isHighlighted={newAssignments.includes(task.id)}
                isLead={isLead}
                teamMembers={teamMembers}
                currentUserId={currentUserId}
                onAssign={onAssign}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
          </div>
        )}

        {/* Queued tasks */}
        {queuedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Queue ({queuedTasks.length})
              </span>
            </div>
            {queuedTasks.slice(0, 5).map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                isHighlighted={newAssignments.includes(task.id)}
                isLead={isLead}
                teamMembers={teamMembers}
                currentUserId={currentUserId}
                onAssign={onAssign}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
            {queuedTasks.length > 5 && (
              <div className="text-center text-xs text-muted-foreground">
                +{queuedTasks.length - 5} more tasks
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
