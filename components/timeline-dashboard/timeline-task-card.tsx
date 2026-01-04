'use client';

import { memo, useTransition } from 'react';
import { Check, Clock, Folder, MoreHorizontal, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_PRIORITY_COLORS, USER_COLORS } from '@/lib/color-constants';
import { PhaseBadge } from './phase-badge';
import type { TimelineTask, TeamMember } from '@/app/actions/timeline-dashboard';
import { quickUpdateTask } from '@/app/actions/inbox';
import { invalidateTimeline } from '@/lib/swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimelineTaskCardProps {
  task: TimelineTask;
  isHighlighted?: boolean;
  isLead?: boolean;
  teamMembers?: TeamMember[];
  currentUserId?: string | null;
  onAssign?: (taskId: string, assigneeId: string) => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Task card for the timeline dashboard
 * Shows title, project, phase badge, priority, and quick actions
 */
export const TimelineTaskCard = memo(function TimelineTaskCard({
  task,
  isHighlighted = false,
  isLead = false,
  teamMembers = [],
  onAssign,
  onClick,
  className,
}: TimelineTaskCardProps) {
  const [isPending, startTransition] = useTransition();

  const isActive = task.status === 'In Progress';
  const priorityColors = TASK_PRIORITY_COLORS[task.priority] || TASK_PRIORITY_COLORS['No Priority'];

  // Get assignee color
  const assigneeColorKey = task.assignee?.email?.includes('info@qualia') ? 'fawzi' : 'moayad';
  const assigneeColor = USER_COLORS[assigneeColorKey];

  // Calculate elapsed time for active tasks
  const getElapsedTime = () => {
    if (!isActive || !task.updated_at) return null;
    const start = new Date(task.updated_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleComplete = () => {
    startTransition(async () => {
      await quickUpdateTask(task.id, { status: 'Done' });
      invalidateTimeline(true);
    });
  };

  const handleAssign = (assigneeId: string) => {
    if (onAssign) {
      onAssign(task.id, assigneeId);
    }
  };

  // Other team members (for assign dropdown)
  const otherMembers = teamMembers.filter((m) => m.id !== task.assignee_id);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-3 transition-all',
        isActive && 'border-qualia-500/50 bg-qualia-500/5',
        isHighlighted &&
          'animate-pulse ring-2 ring-indigo-500 ring-offset-2 ring-offset-background',
        !isActive && !isHighlighted && 'border-border hover:border-border/80 hover:bg-muted/30',
        isPending && 'opacity-50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
          disabled={isPending}
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isActive
              ? 'border-qualia-500 bg-qualia-500/10 hover:bg-qualia-500/20'
              : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted'
          )}
        >
          <Check
            className={cn(
              'h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100',
              isActive ? 'text-qualia-500' : 'text-muted-foreground'
            )}
          />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                isActive ? 'text-foreground' : 'text-foreground/90'
              )}
            >
              {task.title}
            </span>

            {/* Priority badge */}
            {task.priority !== 'No Priority' && (
              <span
                className={cn(
                  'flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-medium',
                  priorityColors.bg,
                  priorityColors.text
                )}
              >
                {task.priority === 'Urgent' ? 'P1' : task.priority === 'High' ? 'P2' : 'P3'}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Project */}
            {task.project?.name && (
              <span className="flex items-center gap-1">
                <Folder className="h-3 w-3" />
                <span className="truncate">{task.project.name}</span>
              </span>
            )}

            {/* Phase badge */}
            {task.phase && <PhaseBadge phase={task.phase} />}

            {/* Active indicator */}
            {isActive && (
              <span className="flex items-center gap-1 text-qualia-500">
                <Clock className="h-3 w-3" />
                <span>{getElapsedTime()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Assign button (lead only) */}
          {isLead && otherMembers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Assign to
                </div>
                <DropdownMenuSeparator />
                {otherMembers.map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssign(member.id);
                    }}
                  >
                    <div
                      className={cn('mr-2 h-2 w-2 rounded-full', USER_COLORS[member.colorKey].dot)}
                    />
                    {member.full_name || member.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(async () => {
                    await quickUpdateTask(task.id, {
                      status: isActive ? 'Todo' : 'In Progress',
                    });
                    invalidateTimeline(true);
                  });
                }}
              >
                {isActive ? 'Pause' : 'Start'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleComplete();
                }}
              >
                Mark Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Assignee indicator */}
      {task.assignee && (
        <div className="absolute -right-1 -top-1">
          <div
            className={cn('h-3 w-3 rounded-full border-2 border-background', assigneeColor.dot)}
            title={task.assignee.full_name || task.assignee.email || undefined}
          />
        </div>
      )}
    </div>
  );
});
