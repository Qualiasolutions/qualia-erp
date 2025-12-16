'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/app/actions/inbox';
import { TaskCard } from '@/components/task-card';
import { deleteTask } from '@/app/actions/inbox';
import { cn } from '@/lib/utils';

interface InboxKanbanViewProps {
  tasks: Task[];
}

const statusColumns = [
  { id: 'Todo', label: 'Todo', color: 'border-slate-300 dark:border-slate-700' },
  { id: 'In Progress', label: 'In Progress', color: 'border-blue-300 dark:border-blue-700' },
  { id: 'Done', label: 'Done', color: 'border-emerald-300 dark:border-emerald-700' },
  { id: 'Canceled', label: 'Canceled', color: 'border-red-300 dark:border-red-700' },
] as const;

export function InboxKanbanView({ tasks }: InboxKanbanViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      await deleteTask(taskId);
      router.refresh();
    });
  };

  const groupedTasks = statusColumns.reduce(
    (acc, column) => {
      acc[column.id] = tasks
        .filter((task) => task.status === column.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full overflow-y-auto">
      {statusColumns.map((column) => {
        const columnTasks = groupedTasks[column.id] || [];
        return (
          <div key={column.id} className="flex flex-col h-full">
            <div className={cn('px-3 py-2 border-b-2 bg-card rounded-t-lg', column.color)}>
              <h3 className="font-semibold text-sm text-foreground">
                {column.label}
                <span className="ml-2 text-xs text-muted-foreground">({columnTasks.length})</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-b-lg">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
