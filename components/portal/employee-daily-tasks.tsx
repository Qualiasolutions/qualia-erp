'use client';

import { Calendar, Flag, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMyInboxTasks, type InboxTask } from '@/lib/swr';

interface EmployeeDailyTasksProps {
  userId: string;
  maxItems?: number;
  className?: string;
}

function priorityVariant(priority: string): 'destructive' | 'secondary' {
  if (priority === 'High' || priority === 'Urgent') return 'destructive';
  return 'secondary';
}

export function EmployeeDailyTasks({ userId, maxItems = 5, className }: EmployeeDailyTasksProps) {
  const { tasks, isLoading } = useMyInboxTasks(userId);
  const active = tasks.slice(0, maxItems);

  return (
    <section
      className={cn('rounded-2xl border border-border bg-card p-5 shadow-elevation-1', className)}
    >
      <header className="mb-4 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Today&apos;s Tasks
        </h3>
      </header>
      {isLoading && active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading tasks...</p>
      ) : active.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="All clear"
          description="Nothing on your plate right now."
          compact
          minimal
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((t: InboxTask) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {t.project ? <span className="truncate">{t.project.name}</span> : null}
                  {t.due_date ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(t.due_date), 'd MMM')}
                    </span>
                  ) : null}
                </div>
              </div>
              <Badge variant={priorityVariant(t.priority)}>
                <Flag className="mr-1 h-3 w-3" />
                {t.priority}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
