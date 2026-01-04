'use client';

import { memo, useMemo } from 'react';
import { Clock, ListTodo, ChevronDown } from 'lucide-react';
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
 * Polished task list for team members
 * Clean grouping with refined visual hierarchy
 */
export const TaskListSidebar = memo(function TaskListSidebar({
  tasks,
  memberId,
  // colorKey is used by parent for styling but not needed here
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
      <div className={cn('flex flex-col items-center justify-center py-8', className)}>
        <ListTodo className="mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground/60">No tasks assigned</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Task list - cleaner spacing */}
      <div className="max-h-[320px] space-y-4 overflow-y-auto p-3">
        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Active
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {activeTasks.length}
              </span>
            </div>
            <div className="space-y-2">
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
          </div>
        )}

        {/* Queued tasks */}
        {queuedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
                <ListTodo className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Queue
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {queuedTasks.length}
              </span>
            </div>
            <div className="space-y-2">
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
            </div>

            {/* Show more indicator */}
            {queuedTasks.length > 5 && (
              <button className="flex w-full items-center justify-center gap-1 rounded-md py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Show {queuedTasks.length - 5} more</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
