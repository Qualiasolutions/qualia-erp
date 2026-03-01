'use client';

import { memo, useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InlineText } from '@/components/ui/inline-edit';
import { Calendar, Trash2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { isPast, isToday, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sort_order: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string, currentStatus: string) => void;
  onUpdate: (taskId: string, title: string) => Promise<void>;
  onDelete: (taskId: string) => void;
  disabled?: boolean;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  try {
    const date = parseISO(dueDate);
    return isPast(date) && !isToday(date);
  } catch {
    return false;
  }
}

function TaskItemComponent({
  task,
  onToggle,
  onUpdate,
  onDelete,
  disabled = false,
}: TaskItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isDone = task.status === 'Done';
  const overdue = isOverdue(task.due_date);

  const handleTitleSave = async (newTitle: string) => {
    setIsUpdating(true);
    try {
      await onUpdate(task.id, newTitle);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: isDone ? 0.5 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, x: -16, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
        isDone ? 'bg-transparent' : 'hover:bg-muted/30',
        isUpdating && 'pointer-events-none opacity-70'
      )}
    >
      {/* Checkbox - larger */}
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(task.id, task.status)}
        className="mt-0.5 h-[18px] w-[18px] rounded-md border-border/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        disabled={disabled || isUpdating}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <InlineText
          value={task.title}
          onSave={handleTitleSave}
          className={cn(
            'text-sm font-medium leading-snug',
            isDone && 'text-muted-foreground line-through'
          )}
          disabled={disabled || isDone || isUpdating}
          placeholder="Task title"
        />

        {/* Helper text / instructions */}
        {task.description && !isDone && (
          <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary/50" />
            <span className="leading-relaxed">{task.description}</span>
          </div>
        )}

        {/* Meta - due date & assignee */}
        {(task.due_date || task.assignee) && !isDone && (
          <div className="mt-1.5 flex items-center gap-3">
            {task.due_date && (
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs',
                  overdue ? 'bg-red-500/10 text-red-500' : 'text-muted-foreground'
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {task.assignee.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>

      {/* Delete - appears on hover */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 w-7 shrink-0 p-0 text-muted-foreground/50',
          'opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100'
        )}
        onClick={() => onDelete(task.id)}
        disabled={disabled || isUpdating}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}

export const TaskItem = memo(TaskItemComponent);
