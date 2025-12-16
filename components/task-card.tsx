'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task } from '@/app/actions/inbox';
import { EditTaskModal } from '@/components/edit-task-modal';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  'No Priority': { color: 'text-muted-foreground', bg: 'bg-muted', label: 'None' },
  Low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Low' },
  Medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Medium' },
  High: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'High' },
  Urgent: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Urgent' },
};

const statusConfig = {
  Todo: { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900/30', label: 'Todo' },
  'In Progress': { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Progress' },
  Done: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Done' },
  Canceled: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Canceled' },
};

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  return (
    <>
      <div className="group relative rounded-lg border border-border bg-card p-4 hover:shadow-md transition-all">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm text-foreground line-clamp-2">{task.title}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  status.color,
                  status.bg
                )}
              >
                {status.label}
              </span>
              {task.priority !== 'No Priority' && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    priority.color,
                    priority.bg
                  )}
                >
                  {priority.label}
                </span>
              )}
              {task.due_date && (
                <div className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                )}>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
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
