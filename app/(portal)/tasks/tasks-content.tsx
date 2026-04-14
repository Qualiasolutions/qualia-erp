'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ClipboardList, Calendar, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null;
  project: { id: string; name: string } | null;
}

interface TasksContentProps {
  tasks: TaskItem[];
  projects: Array<{ id: string; name: string }>;
  userRole: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'Todo', label: 'Todo' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
];

const sortOptions = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due date' },
];

const PRIORITY_ORDER: Record<string, number> = {
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

/* ------------------------------------------------------------------ */
/* Badge helpers                                                       */
/* ------------------------------------------------------------------ */

function getStatusColor(status: string): string {
  switch (status) {
    case 'Todo':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-transparent';
    case 'In Progress':
      return 'bg-primary/10 text-primary border-transparent';
    case 'Done':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-transparent';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Urgent':
      return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
    case 'High':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    case 'Medium':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    case 'Low':
      return 'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* TasksContent                                                        */
/* ------------------------------------------------------------------ */

export function TasksContent({ tasks, projects, userRole }: TasksContentProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('status');

  // Count per status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length };
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = [...tasks];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      result = result.filter((t) => t.project_id === projectFilter);
    }

    // Sort
    switch (sortBy) {
      case 'priority':
        result.sort(
          (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
        );
        break;
      case 'due_date':
        result.sort((a, b) => {
          const dateA = a.due_date ?? '9999-12-31';
          const dateB = b.due_date ?? '9999-12-31';
          return dateA.localeCompare(dateB);
        });
        break;
      case 'status':
      default:
        result.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    }

    return result;
  }, [tasks, statusFilter, projectFilter, sortBy]);

  // Empty state — no tasks at all
  if (tasks.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-4">
        <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-base font-medium text-foreground">No tasks yet</h3>
        <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
          {userRole === 'client'
            ? 'Tasks for your projects will appear here once work begins.'
            : 'Tasks from your assigned projects will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar: status tabs + project dropdown + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.value] || 0;
            if (tab.value !== 'all' && count === 0) return null;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'min-h-[44px] cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150',
                  statusFilter === tab.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                aria-pressed={statusFilter === tab.value}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Project filter */}
          {projects.length > 1 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort options */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  'cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                  sortBy === opt.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-[40%] min-w-[200px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </th>
              <th className="w-[120px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Project
              </th>
              <th className="w-[100px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="w-[100px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </th>
              <th className="w-[140px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Assignee
              </th>
              <th className="w-[100px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No tasks match the current filters
                </td>
              </tr>
            ) : (
              filtered.map((task, index) => {
                const overdue = task.due_date ? isOverdue(task.due_date, task.status) : false;

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      'border-b border-border/50 transition-colors duration-150 hover:bg-muted/30',
                      'animate-fade-in fill-mode-both'
                    )}
                    style={index < 20 ? { animationDelay: `${index * 20}ms` } : undefined}
                  >
                    {/* Title */}
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span
                        className={cn(
                          'line-clamp-1',
                          task.status === 'Done' && 'text-muted-foreground line-through'
                        )}
                      >
                        {task.title}
                      </span>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3">
                      {task.project ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {task.project.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px]', getStatusColor(task.status))}>
                        {task.status}
                      </Badge>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      {task.priority !== 'No Priority' ? (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', getPriorityColor(task.priority))}
                        >
                          {task.priority}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
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
                          <span className="truncate text-xs text-muted-foreground">
                            {task.assignee.full_name || 'Unknown'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3">
                      {task.due_date ? (
                        <span
                          className={cn(
                            'flex items-center gap-1 text-xs',
                            overdue
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {format(parseISO(task.due_date), 'MMM d')}
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

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
