'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Calendar, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getInitials } from '@/lib/utils';
import type { Task } from '@/app/actions/inbox';
import { EditTaskModal } from '@/components/edit-task-modal';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  'No Priority': { color: 'text-muted-foreground', bg: 'bg-muted', label: 'None' },
  Low: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Low',
  },
  Medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Medium',
  },
  High: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'High',
  },
  Urgent: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Urgent',
  },
};

const statusConfig = {
  Todo: {
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    label: 'Todo',
  },
  'In Progress': {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'In Progress',
  },
  Done: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Done',
  },
};

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

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
                  status.color,
                  status.bg
                )}
              >
                {status.label}
              </span>
              {task.priority !== 'No Priority' && (
                <span
                  className={cn(
                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                    priority.color,
                    priority.bg
                  )}
                >
                  {priority.label}
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
