'use client';

import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CheckCircle2, Circle, Clock, CalendarDays, FolderOpen, User, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTimezone } from '@/lib/schedule-utils';
import { RichText } from '@/components/ui/rich-text';
import type { Task } from '@/app/actions/inbox';

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  isDone?: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Low: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  'No Priority': '',
};

const STATUS_STYLES: Record<string, string> = {
  Todo: 'bg-muted text-muted-foreground',
  'In Progress': 'bg-qualia-500/10 text-qualia-600 dark:text-qualia-400',
  Done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onEdit,
  onToggleDone,
  isDone: isDoneProp,
}: TaskDetailDialogProps) {
  const { timezone } = useTimezone();

  if (!task) return null;

  const done = isDoneProp ?? task.status === 'Done';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-[440px]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{task.title}</DialogTitle>
        {/* Header */}
        <div className="px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onToggleDone(task)}
              className="group/check mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-all hover:bg-muted/60 active:scale-90"
              aria-label={done ? 'Mark incomplete' : 'Mark complete'}
            >
              {done ? (
                <CheckCircle2 className="size-5 text-emerald-500" strokeWidth={2} />
              ) : (
                <Circle
                  className="size-5 text-border transition-colors group-hover/check:text-qualia-400"
                  strokeWidth={1.5}
                />
              )}
            </button>
            <h2
              className={cn(
                'flex-1 text-base font-semibold leading-snug text-foreground',
                done && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </h2>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3 border-t border-border/50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                STATUS_STYLES[done ? 'Done' : task.status] || STATUS_STYLES.Todo
              )}
            >
              {done ? 'Done' : task.status}
            </span>
            {task.priority !== 'No Priority' && (
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                  PRIORITY_STYLES[task.priority]
                )}
              >
                {task.priority}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {task.assignee && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">{task.assignee.full_name || 'Unassigned'}</span>
              </div>
            )}
            {task.project && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="truncate">{task.project.name}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" />
                <span>{format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {task.scheduled_start_time && task.scheduled_end_time && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                <span>
                  {format(toZonedTime(parseISO(task.scheduled_start_time), timezone), 'h:mm a')}
                  {' \u2013 '}
                  {format(toZonedTime(parseISO(task.scheduled_end_time), timezone), 'h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="border-t border-border/50 px-6 py-4">
            <RichText className="text-foreground/80">{task.description}</RichText>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-border/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit(task);
            }}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant={done ? 'outline' : 'default'}
            size="sm"
            onClick={() => onToggleDone(task)}
            className={cn(
              'ml-auto gap-1.5',
              !done && 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            {done ? (
              <>
                <Circle className="size-3.5" />
                Reopen
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Mark Done
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
