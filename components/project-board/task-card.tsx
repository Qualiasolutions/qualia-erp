'use client';

import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardTask } from './board-types';
import { PRIORITY_DOT_COLORS } from './board-types';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'Done') return false;
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
}

interface TaskCardProps {
  task: BoardTask;
  onClick?: (task: BoardTask) => void;
  isDragging?: boolean;
}

export const TaskCard = React.memo(function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const dotColor = PRIORITY_DOT_COLORS[task.priority];
  const overdue = task.due_date ? isOverdue(task.due_date, task.status) : false;
  // Only render as an interactive button when a handler is actually wired.
  // Previously the card always claimed role="button" + tabIndex=0 even in
  // KanbanBoard (which doesn't pass onClick) — screen readers focused an
  // inert button. See OPTIMIZE.md H8.
  const interactive = typeof onClick === 'function';

  return (
    <div
      {...(interactive
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: () => onClick(task),
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(task);
              }
            },
          }
        : {})}
      className={cn(
        'rounded-lg border border-border bg-card p-3 transition-all duration-200',
        'hover:border-primary/20 hover:shadow-sm',
        interactive &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        isDragging && 'rotate-[1deg] scale-[1.02] opacity-90 shadow-md'
      )}
    >
      {/* Title */}
      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{task.title}</p>

      {/* Meta row */}
      <div className="mt-2 flex items-center gap-2">
        {/* Priority dot */}
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)}
          title={task.priority}
          aria-label={`Priority: ${task.priority}`}
        />

        {/* Due date */}
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'
            )}
          >
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Assignee avatar */}
        {task.assignee && (
          <Avatar className="h-6 w-6">
            {task.assignee.avatar_url && (
              <AvatarImage
                src={task.assignee.avatar_url}
                alt={task.assignee.full_name || 'Assignee'}
              />
            )}
            <AvatarFallback className="text-[10px] font-medium">
              {getInitials(task.assignee.full_name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
});
