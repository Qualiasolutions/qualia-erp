'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { FocusTaskCard } from './focus-task-card';
import type { Task } from '@/app/actions/inbox';

interface YourFocusSectionProps {
  tasks: Task[];
  currentUserId: string | null;
  selectedTaskId?: string | null;
  onTaskSelect?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
}

type FilterType = 'all' | 'p1' | 'p2' | 'active';

/**
 * Sort tasks by priority then by status
 */
function sortTasks(tasks: Task[]): Task[] {
  const priorityOrder: Record<string, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    'No Priority': 4,
  };

  const statusOrder: Record<string, number> = {
    'In Progress': 0,
    Todo: 1,
  };

  return [...tasks].sort((a, b) => {
    // First sort by status (In Progress first)
    const statusDiff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    if (statusDiff !== 0) return statusDiff;

    // Then by priority
    const priorityDiff =
      (priorityOrder[a.priority || 'No Priority'] ?? 4) -
      (priorityOrder[b.priority || 'No Priority'] ?? 4);
    if (priorityDiff !== 0) return priorityDiff;

    // Finally by due date (earlier first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    return 0;
  });
}

/**
 * Filter tasks by type
 */
function filterTasks(tasks: Task[], filter: FilterType): Task[] {
  switch (filter) {
    case 'p1':
      return tasks.filter((t) => t.priority === 'Urgent');
    case 'p2':
      return tasks.filter((t) => t.priority === 'High' || t.priority === 'Urgent');
    case 'active':
      return tasks.filter((t) => t.status === 'In Progress');
    default:
      return tasks;
  }
}

/**
 * Your Focus Section - Things 3 inspired personal task list
 * Shows current user's tasks with priority hierarchy
 */
export const YourFocusSection = memo(function YourFocusSection({
  tasks,
  currentUserId,
  selectedTaskId,
  onTaskSelect,
  onTaskClick,
  onAddTask,
}: YourFocusSectionProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter to current user's tasks only
  const myTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.assignee_id === currentUserId && (t.status === 'Todo' || t.status === 'In Progress')
    );
  }, [tasks, currentUserId]);

  // Apply filter and sort
  const displayTasks = useMemo(() => {
    const filtered = filterTasks(myTasks, filter);
    return sortTasks(filtered);
  }, [myTasks, filter]);

  // Find active task
  const activeTask = useMemo(() => {
    return myTasks.find((t) => t.status === 'In Progress');
  }, [myTasks]);

  const handleFilterClick = useCallback((newFilter: FilterType) => {
    setFilter((prev) => (prev === newFilter ? 'all' : newFilter));
  }, []);

  // Count by priority for badges
  const counts = useMemo(() => {
    return {
      all: myTasks.length,
      p1: myTasks.filter((t) => t.priority === 'Urgent').length,
      p2: myTasks.filter((t) => t.priority === 'High' || t.priority === 'Urgent').length,
      active: myTasks.filter((t) => t.status === 'In Progress').length,
    };
  }, [myTasks]);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Your Focus</h2>
          <span className="text-xs text-muted-foreground">{counts.all} tasks</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5 dark:border-border">
            <button
              onClick={() => handleFilterClick('all')}
              className={cn(
                'rounded px-2 py-1 text-[11px] font-medium transition-colors',
                filter === 'all'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {counts.p1 > 0 && (
              <button
                onClick={() => handleFilterClick('p1')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  filter === 'p1'
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                P1
                <span className="text-[10px]">{counts.p1}</span>
              </button>
            )}
            {counts.active > 0 && (
              <button
                onClick={() => handleFilterClick('active')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  filter === 'active'
                    ? 'bg-qualia-500/10 text-qualia-500'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Active
              </button>
            )}
          </div>

          {/* Add task button */}
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-border"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      {displayTasks.length > 0 ? (
        <div className="space-y-2">
          {displayTasks.map((task) => (
            <FocusTaskCard
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              isActive={task.id === activeTask?.id}
              onSelect={() => onTaskSelect?.(task)}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 text-center dark:border-border">
          <p className="text-sm text-muted-foreground">
            {filter !== 'all' ? 'No tasks match this filter' : 'No tasks assigned'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-1 text-xs text-qualia-500 hover:underline"
            >
              Show all tasks
            </button>
          )}
        </div>
      )}
    </section>
  );
});

export default YourFocusSection;
