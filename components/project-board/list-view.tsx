'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  STATUS_COLUMNS,
  PRIORITY_DOT_COLORS,
  type BoardTask,
  type StatusColumnId,
} from './board-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ListView
// ---------------------------------------------------------------------------

interface ListViewProps {
  tasks: BoardTask[];
  onStatusChange?: (taskId: string, newStatus: StatusColumnId) => void;
  readOnly?: boolean;
}

export function ListView({ tasks, onStatusChange, readOnly }: ListViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<StatusColumnId>>(
    () => new Set(['Todo', 'In Progress', 'Done'])
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusColumnId, BoardTask[]> = {
      Todo: [],
      'In Progress': [],
      Done: [],
    };
    for (const task of tasks) {
      const col = grouped[task.status as StatusColumnId];
      if (col) {
        col.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  const toggleGroup = useCallback((groupId: StatusColumnId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleCheckboxChange = useCallback(
    (task: BoardTask) => {
      if (!onStatusChange) return;
      const newStatus: StatusColumnId = task.status === 'Done' ? 'Todo' : 'Done';
      onStatusChange(task.id, newStatus);
    },
    [onStatusChange]
  );

  return (
    <div className="space-y-2">
      {STATUS_COLUMNS.map((col) => {
        const groupTasks = tasksByStatus[col.id];
        const isExpanded = expandedGroups.has(col.id);

        return (
          <div key={col.id} className="rounded-lg border border-border">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(col.id)}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-3 text-left transition-colors duration-150',
                'cursor-pointer hover:bg-muted/30',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30'
              )}
              aria-expanded={isExpanded}
              aria-controls={`list-group-${col.id}`}
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
                aria-hidden="true"
              />
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', col.dotColor)}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span
                className={cn(
                  'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
                  col.badgeBg,
                  col.badgeText
                )}
              >
                {groupTasks.length}
              </span>
            </button>

            {/* Group items */}
            {isExpanded && (
              <div id={`list-group-${col.id}`} role="group" aria-label={`${col.label} tasks`}>
                {groupTasks.length === 0 ? (
                  <p className="px-4 py-4 text-center text-xs text-muted-foreground">No tasks</p>
                ) : (
                  groupTasks.map((task) => {
                    const overdue = task.due_date ? isOverdue(task.due_date, task.status) : false;

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 border-t border-border/50 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/20"
                      >
                        {/* Checkbox — hidden in readOnly mode */}
                        {!readOnly && (
                          <input
                            type="checkbox"
                            checked={task.status === 'Done'}
                            onChange={() => handleCheckboxChange(task)}
                            className={cn(
                              'h-4 w-4 shrink-0 cursor-pointer rounded border-border',
                              'accent-primary focus-visible:ring-2 focus-visible:ring-primary/30'
                            )}
                            aria-label={`Mark "${task.title}" as ${task.status === 'Done' ? 'todo' : 'done'}`}
                          />
                        )}

                        {/* Title */}
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm',
                            task.status === 'Done'
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          )}
                        >
                          {task.title}
                        </span>

                        {/* Priority dot */}
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            PRIORITY_DOT_COLORS[task.priority]
                          )}
                          title={task.priority}
                          aria-label={`Priority: ${task.priority}`}
                        />

                        {/* Due date */}
                        {task.due_date && (
                          <span
                            className={cn(
                              'flex shrink-0 items-center gap-1 text-xs',
                              overdue
                                ? 'font-medium text-red-600 dark:text-red-400'
                                : 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}

                        {/* Assignee */}
                        {task.assignee && (
                          <Avatar className="h-6 w-6 shrink-0">
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
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
