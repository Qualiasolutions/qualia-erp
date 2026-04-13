'use client';

import { useMemo, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  Check,
  Circle,
  Clock,
  Inbox as InboxIcon,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { parseISO, isPast, isToday, format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { quickUpdateTask } from '@/app/actions/inbox';
import { useInboxTasks, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';

interface InboxWidgetProps {
  /** Max number of tasks to show in the preview (default: 5) */
  limit?: number;
}

const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  'No Priority': 4,
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  return isPast(d) && !isToday(d);
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(parseISO(dueDate));
}

function formatDue(dueDate: string): string {
  const d = parseISO(dueDate);
  if (isToday(d)) return format(d, 'h:mm a');
  return format(d, 'MMM d');
}

/**
 * Compact inbox preview shown on the home dashboard.
 *
 * Behaviour:
 * - Pulls top-N inbox tasks (sorted by overdue first, then priority) via SWR
 *   so counts stay live alongside the full inbox view.
 * - Lets the user tick off a task inline without leaving the dashboard.
 * - "View all" deep-links to the full inbox.
 */
export function InboxWidget({ limit = 5 }: InboxWidgetProps) {
  const { tasks, isLoading, isError, revalidate } = useInboxTasks();
  const [, startTransition] = useTransition();

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'Done' && t.item_type !== 'note'),
    [tasks]
  );

  const sortedTasks = useMemo(() => {
    return [...openTasks].sort((a, b) => {
      // Overdue first
      const aOverdue = isOverdue(a.due_date) ? 0 : 1;
      const bOverdue = isOverdue(b.due_date) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      // Then priority
      const aPriority = PRIORITY_ORDER[a.priority ?? 'No Priority'] ?? 4;
      const bPriority = PRIORITY_ORDER[b.priority ?? 'No Priority'] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then due date (earlier first)
      if (a.due_date && b.due_date) {
        return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return 0;
    });
  }, [openTasks]);

  const visibleTasks = sortedTasks.slice(0, limit);
  const overdueCount = useMemo(
    () => openTasks.filter((t) => isOverdue(t.due_date)).length,
    [openTasks]
  );

  const handleComplete = useCallback((taskId: string) => {
    startTransition(async () => {
      const result = await quickUpdateTask(taskId, { status: 'Done' });
      if (!result.success) {
        toast.error(result.error ?? 'Failed to complete task');
        return;
      }
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
    });
  }, []);

  return (
    <section aria-labelledby="inbox-widget-heading">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="inbox-widget-heading"
            className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground/60"
          >
            Inbox
          </h2>
          {!isLoading && openTasks.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {openTasks.length}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-red-600 dark:text-red-400">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <Link
          href="/inbox"
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground',
            'transition-colors duration-150 hover:bg-muted/50 hover:text-primary',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          )}
        >
          View all
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="rounded-xl border border-border/50 bg-card">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/30 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load inbox</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Something went wrong fetching your tasks.
            </p>
            <button
              type="button"
              onClick={() => revalidate()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <InboxIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Inbox zero</p>
            <p className="mt-1 text-xs text-muted-foreground">All caught up — nice work.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {visibleTasks.map((task) => {
              const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];
              const overdue = isOverdue(task.due_date);
              const dueToday = isDueToday(task.due_date);

              return (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/30"
                >
                  <button
                    type="button"
                    onClick={() => handleComplete(task.id)}
                    aria-label={`Mark "${task.title}" as done`}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                      'border-muted-foreground/40 text-transparent transition-all duration-150',
                      'hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-600',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    {task.project && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.project.name}
                      </p>
                    )}
                  </div>

                  {task.due_date && (
                    <span
                      className={cn(
                        'hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] sm:inline-flex',
                        overdue && 'bg-red-500/10 text-red-600 dark:text-red-400',
                        dueToday &&
                          !overdue &&
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                        !overdue && !dueToday && 'text-muted-foreground'
                      )}
                    >
                      <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                      {overdue ? 'Overdue' : formatDue(task.due_date)}
                    </span>
                  )}

                  {task.priority !== 'No Priority' && priorityColors && (
                    <span
                      className={cn(
                        'hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] md:inline-flex',
                        priorityColors.bg
                      )}
                    >
                      <Circle
                        className={cn('h-1.5 w-1.5 fill-current', priorityColors.text)}
                        aria-hidden="true"
                      />
                      <span className={priorityColors.text}>{priorityColors.label}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
