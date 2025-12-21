'use client';

import { useState, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Calendar, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getInitials } from '@/lib/utils';
import type { Task } from '@/app/actions/inbox';
import { EditTaskModal } from '@/components/edit-task-modal';
import {
  ISSUE_STATUS_COLORS,
  ISSUE_PRIORITY_COLORS,
  type IssueStatusKey,
  type IssuePriorityKey,
} from '@/lib/color-constants';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

// Get status colors with fallback
const getStatusColors = (status: string) => {
  const colors = ISSUE_STATUS_COLORS[status as IssueStatusKey];
  return colors || { bg: 'bg-muted', text: 'text-muted-foreground' };
};

// Get priority colors with fallback for 'No Priority'
const getPriorityColors = (priority: string) => {
  if (priority === 'No Priority') {
    return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
  const colors = ISSUE_PRIORITY_COLORS[priority as IssuePriorityKey];
  return colors || { bg: 'bg-muted', text: 'text-muted-foreground' };
};

function TaskCardComponent({ task, onDelete }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Memoize derived values to prevent recalculation on every render
  const priorityColors = useMemo(() => getPriorityColors(task.priority), [task.priority]);
  const statusColors = useMemo(() => getStatusColors(task.status), [task.status]);
  const isOverdue = useMemo(
    () => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done',
    [task.due_date, task.status]
  );

  return (
    <>
      <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{task.title}</h3>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {task.description && (
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                  statusColors.text,
                  statusColors.bg
                )}
              >
                {task.status}
              </span>
              {task.priority !== 'No Priority' && (
                <span
                  className={cn(
                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                    priorityColors.text,
                    priorityColors.bg
                  )}
                >
                  {task.priority}
                </span>
              )}
              {task.due_date && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                </div>
              )}
              {task.assignee && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="ml-auto">
                        <Avatar className="h-6 w-6">
                          {task.assignee.avatar_url ? (
                            <AvatarImage
                              src={task.assignee.avatar_url}
                              alt={task.assignee.full_name || 'Assignee'}
                            />
                          ) : null}
                          <AvatarFallback className="bg-qualia-600 text-[10px] text-white">
                            {getInitials(task.assignee.full_name || task.assignee.email || 'U')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{task.assignee.full_name || task.assignee.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!task.assignee && (
                <div className="ml-auto">
                  <Avatar className="h-6 w-6 opacity-40">
                    <AvatarFallback className="text-[10px]">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditTaskModal task={task} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
    </>
  );
}

// Memoize TaskCard to prevent re-renders when parent list changes but this task hasn't
export const TaskCard = memo(TaskCardComponent);
