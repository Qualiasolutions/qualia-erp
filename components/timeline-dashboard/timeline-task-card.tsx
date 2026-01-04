'use client';

import { memo, useTransition } from 'react';
import {
  Check,
  Clock,
  Folder,
  MoreHorizontal,
  UserPlus,
  Play,
  Pause,
  CheckCircle2,
} from 'lucide-react';
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
 * Polished task card for the timeline dashboard
 * Clean design with subtle interactions and clear visual hierarchy
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
        'group relative rounded-lg border bg-card transition-all duration-150',
        isActive && 'border-blue-500/40 bg-blue-500/5 shadow-sm shadow-blue-500/5',
        isHighlighted && 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-background',
        !isActive &&
          !isHighlighted &&
          'border-border/60 hover:border-border hover:bg-muted/40 hover:shadow-sm',
        isPending && 'pointer-events-none opacity-50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox - refined */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
          disabled={isPending}
          className={cn(
            'mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150',
            isActive
              ? 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
              : 'border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted'
          )}
        >
          <Check
            className={cn(
              'h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100',
              isActive ? 'text-blue-500' : 'text-muted-foreground'
            )}
            strokeWidth={2.5}
          />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'flex-1 truncate text-[13px] font-medium leading-tight',
                isActive ? 'text-foreground' : 'text-foreground/90'
              )}
            >
              {task.title}
            </span>

            {/* Priority badge - more subtle */}
            {task.priority !== 'No Priority' && (
              <span
                className={cn(
                  'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  priorityColors.bg,
                  priorityColors.text
                )}
              >
                {task.priority === 'Urgent'
                  ? 'P1'
                  : task.priority === 'High'
                    ? 'P2'
                    : task.priority === 'Medium'
                      ? 'P3'
                      : 'P4'}
              </span>
            )}
          </div>

          {/* Meta row - cleaner */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {/* Project */}
            {task.project?.name && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Folder className="h-3 w-3" />
                <span className="max-w-[100px] truncate">{task.project.name}</span>
              </span>
            )}

            {/* Phase badge */}
            {task.phase && <PhaseBadge phase={task.phase} />}

            {/* Active indicator - refined */}
            {isActive && (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <Clock className="h-2.5 w-2.5" />
                <span>{getElapsedTime()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions - refined */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Assign button (lead only) */}
          {isLead && otherMembers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <UserPlus className="h-3.5 w-3.5" />
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

          {/* More actions - refined icons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
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
                {isActive ? (
                  <>
                    <Pause className="mr-2 h-3.5 w-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Start
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleComplete();
                }}
              >
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active left accent */}
      {isActive && (
        <div className="absolute bottom-0 left-0 top-0 w-0.5 rounded-l-lg bg-blue-500" />
      )}
    </div>
  );
});
