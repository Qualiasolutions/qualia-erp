'use client';

/**
 * TaskDetailDialog — read-only structured view of a task for employees.
 *
 * Employees can only mark a task done / undone from this dialog. They cannot
 * edit, rename, delete, or create tasks — those are admin-only flows that
 * live in the inline TaskRow actions and the separate EditTaskModal.
 */

import { format, formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle2, Circle, Calendar, FolderOpen, User, AlertCircle, Clock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import type { Task } from '@/app/actions/inbox';

const STATUS_CHIP_STYLES: Record<string, string> = {
  Todo: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  'In Progress': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  Done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Blocked: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  Review: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
};

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleDone: (taskId: string, completed: boolean) => void;
  isPending?: boolean;
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onToggleDone,
  isPending,
}: TaskDetailDialogProps) {
  if (!task) return null;

  const isDone = task.status === 'Done';
  const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];
  const statusStyle = STATUS_CHIP_STYLES[task.status] ?? STATUS_CHIP_STYLES['Todo'];

  const createdStr = task.created_at
    ? formatDistanceToNowStrict(new Date(task.created_at), { addSuffix: true })
    : null;
  const completedStr = task.completed_at
    ? formatDistanceToNowStrict(new Date(task.completed_at), { addSuffix: true })
    : null;
  const dueStr = task.due_date ? format(new Date(task.due_date), 'EEEE, d MMM yyyy') : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        {/* Header — title + status chip */}
        <DialogHeader className="space-y-3 border-b border-border p-6 pb-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'mt-1 inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                statusStyle
              )}
            >
              {task.status}
            </span>
            {task.priority !== 'No Priority' && (
              <span
                className={cn(
                  'mt-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  priorityColors.bg,
                  priorityColors.text
                )}
              >
                <AlertCircle className="h-3 w-3" aria-hidden />
                {task.priority}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
            {task.title}
          </DialogTitle>
          {task.description ? (
            <DialogDescription className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </DialogDescription>
          ) : (
            <DialogDescription className="text-sm italic text-muted-foreground/60">
              No description.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 gap-3 border-b border-border p-6 sm:grid-cols-2">
          <DetailField icon={FolderOpen} label="Project" value={task.project?.name ?? '—'} />
          <DetailField
            icon={User}
            label="Assignee"
            value={task.assignee?.full_name ?? task.assignee?.email ?? '—'}
          />
          <DetailField icon={Calendar} label="Due" value={dueStr ?? '—'} />
          <DetailField
            icon={Clock}
            label={isDone ? 'Completed' : 'Created'}
            value={isDone ? (completedStr ?? '—') : (createdStr ?? '—')}
          />
        </div>

        {/* Footer — single toggle action */}
        <div className="flex items-center justify-end gap-2 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
          {isDone ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleDone(task.id, false)}
              disabled={isPending}
              className="gap-1.5"
            >
              <Circle className="h-4 w-4" />
              Mark as to do
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onToggleDone(task.id, true)}
              disabled={isPending}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
