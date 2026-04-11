'use client';

import React, { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { STATUS_COLUMNS, PRIORITY_DOT_COLORS, type BoardTask } from './board-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SortKey = 'title' | 'status' | 'priority' | 'assignee' | 'due_date';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: Record<BoardTask['priority'], number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  'No Priority': 4,
};

const STATUS_ORDER: Record<string, number> = {
  Todo: 0,
  'In Progress': 1,
  Done: 2,
};

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

function getStatusBadgeClasses(status: string): string {
  const col = STATUS_COLUMNS.find((c) => c.id === status);
  if (!col) return '';
  return `${col.badgeBg} ${col.badgeText} border-transparent`;
}

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: SortKey;
  label: string;
  className?: string;
}

const columns: ColumnDef[] = [
  { key: 'title', label: 'Title', className: 'w-[40%] min-w-[200px]' },
  { key: 'status', label: 'Status', className: 'w-[120px]' },
  { key: 'priority', label: 'Priority', className: 'w-[120px]' },
  { key: 'assignee', label: 'Assignee', className: 'w-[160px]' },
  { key: 'due_date', label: 'Due Date', className: 'w-[120px]' },
];

// ---------------------------------------------------------------------------
// TableView
// ---------------------------------------------------------------------------

interface TableViewProps {
  tasks: BoardTask[];
}

export function TableView({ tasks }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    const dir = sortDirection === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'status':
          return dir * ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
        case 'priority':
          return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case 'assignee': {
          const nameA = a.assignee?.full_name ?? '';
          const nameB = b.assignee?.full_name ?? '';
          return dir * nameA.localeCompare(nameB);
        }
        case 'due_date': {
          const dateA = a.due_date ?? '9999-12-31';
          const dateB = b.due_date ?? '9999-12-31';
          return dir * dateA.localeCompare(dateB);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [tasks, sortKey, sortDirection]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground',
                  'cursor-pointer select-none transition-colors duration-150 hover:text-foreground',
                  col.className
                )}
                onClick={() => handleSort(col.key)}
                role="columnheader"
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                No tasks to display
              </td>
            </tr>
          ) : (
            sortedTasks.map((task) => {
              const overdue = task.due_date ? isOverdue(task.due_date, task.status) : false;

              return (
                <tr
                  key={task.id}
                  className="border-b border-border/50 transition-colors duration-150 hover:bg-muted/30"
                >
                  {/* Title */}
                  <td className="px-4 py-3 font-medium text-foreground">
                    <span className="line-clamp-1">{task.title}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs', getStatusBadgeClasses(task.status))}>
                      {task.status}
                    </Badge>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          PRIORITY_DOT_COLORS[task.priority]
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{task.priority}</span>
                    </span>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <span className="flex items-center gap-2">
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
                        <span className="truncate text-muted-foreground">
                          {task.assignee.full_name || 'Unknown'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">Unassigned</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3">
                    {task.due_date ? (
                      <span
                        className={cn(
                          'text-xs',
                          overdue
                            ? 'font-medium text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                        )}
                      >
                        {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">-</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
