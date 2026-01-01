'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { Trash2, User, Circle, Loader2, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials } from '@/lib/utils';
import { renderTextWithLinks } from '@/lib/render-links';
import type { Task } from '@/app/actions/inbox';
import { quickUpdateTask } from '@/app/actions/inbox';
import { InlineText, InlineSelect, InlineDate } from '@/components/ui/inline-edit';
import { invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

// Status options for inline select
const statusOptions = [
  { value: 'Todo', label: 'Todo', icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" /> },
  {
    value: 'In Progress',
    label: 'In Progress',
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-500" />,
  },
  { value: 'Done', label: 'Done', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
];

function TaskCardComponent({ task, onDelete }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const isOverdue = useMemo(
    () => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done',
    [task.due_date, task.status]
  );

  const showPriority = task.priority === 'High' || task.priority === 'Urgent';

  // Inline update handlers
  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, { title: newTitle });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  const handleStatusSave = useCallback(
    async (newStatus: string) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, {
          status: newStatus as 'Todo' | 'In Progress' | 'Done',
        });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  const handleDueDateSave = useCallback(
    async (newDate: Date | null) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, {
          due_date: newDate ? newDate.toISOString().split('T')[0] : null,
        });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  return (
    <div
      className={cn(
        'group relative rounded-md border border-border bg-card p-3 transition-colors duration-150 hover:border-border/80',
        isUpdating && 'opacity-70'
      )}
    >
      {/* Title row with actions */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <InlineText
          value={task.title}
          onSave={handleTitleSave}
          className="line-clamp-2 flex-1 text-[13px] font-medium text-foreground"
          disabled={isUpdating}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => onDelete(task.id)}
              className="text-red-500 focus:text-red-500"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description - only if exists */}
      {task.description && (
        <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">
          {renderTextWithLinks(task.description)}
        </p>
      )}

      {/* Single-line metadata with dot separators */}
      <div className="flex items-center gap-1.5 text-[13px]">
        {/* Status - inline select */}
        <InlineSelect
          value={task.status}
          options={statusOptions}
          onSave={handleStatusSave}
          disabled={isUpdating}
          className="text-muted-foreground"
        />

        {/* Project name */}
        {task.project && (
          <>
            <span className="text-border">·</span>
            <span className="max-w-[100px] truncate text-muted-foreground">
              {task.project.name}
            </span>
          </>
        )}

        {/* Due date - inline date picker */}
        <span className="text-border">·</span>
        <InlineDate
          value={task.due_date ? new Date(task.due_date) : null}
          onSave={handleDueDateSave}
          placeholder="No date"
          disabled={isUpdating}
          className={cn(isOverdue && 'text-red-500')}
        />

        {/* Priority - only show if High or Urgent */}
        {showPriority && (
          <>
            <span className="text-border">·</span>
            <span
              className={cn(
                'font-medium',
                task.priority === 'Urgent' ? 'text-red-500' : 'text-orange-500'
              )}
            >
              {task.priority}
            </span>
          </>
        )}

        {/* Assignee avatar - pushed to end */}
        <div className="ml-auto">
          {task.assignee ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    {task.assignee.avatar_url ? (
                      <AvatarImage
                        src={task.assignee.avatar_url}
                        alt={task.assignee.full_name || 'Assignee'}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary text-[9px] text-primary-foreground">
                      {getInitials(task.assignee.full_name || task.assignee.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.assignee.full_name || task.assignee.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Avatar className="h-5 w-5 opacity-30">
              <AvatarFallback className="text-[9px]">
                <User className="h-2.5 w-2.5" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize TaskCard to prevent re-renders when parent list changes but this task hasn't
export const TaskCard = memo(TaskCardComponent);
