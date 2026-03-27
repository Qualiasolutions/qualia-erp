'use client';

import React, { useTransition, useState, useOptimistic, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Circle,
  Clock,
  EyeOff,
  FolderOpen,
  Edit2,
  Plus,
  Check,
  Inbox,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, toggleTaskInbox, createTask, type Task } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { useAdminContext } from '@/components/admin-provider';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';

interface InboxWidgetProps {
  tasks: Task[];
}

type FilterMode = 'all' | 'mine' | 'todo' | 'done';

function formatDueTime(dueDate: string): string {
  const date = parseISO(dueDate);
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d');
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(parseISO(dueDate));
}

// Optimistic action types
type OptimisticAction =
  | { type: 'toggle'; taskId: string; completed: boolean }
  | { type: 'hide'; taskId: string }
  | { type: 'add'; task: Task };

function tasksReducer(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case 'toggle':
      return state.map((t) =>
        t.id === action.taskId
          ? {
              ...t,
              status: action.completed ? 'Done' : 'Todo',
              completed_at: action.completed ? new Date().toISOString() : null,
            }
          : t
      );
    case 'hide':
      return state.filter((t) => t.id !== action.taskId);
    case 'add':
      return [action.task, ...state];
    default:
      return state;
  }
}

const TaskRow = React.memo(function TaskRow({
  task,
  onToggle,
  onHide,
  onEdit,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onEdit: (task: Task) => void;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);
  const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];

  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b border-border px-4 py-3 transition-colors',
        'hover:bg-accent/50',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-premium',
          isCompleted
            ? 'animate-checkbox-bounce border-emerald-500/50 bg-emerald-500 text-white'
            : 'border-foreground/30 hover:scale-110 hover:border-emerald-500/50 hover:bg-emerald-500/10'
        )}
      >
        {isCompleted && <Check className="size-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm font-medium',
            isCompleted ? 'text-foreground/50 line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
          {task.project && (
            <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
              <FolderOpen className="size-3" />
              <span className="max-w-[80px] truncate">{task.project.name}</span>
            </span>
          )}
          {task.due_date && !isCompleted && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5',
                overdue && 'bg-red-500/10 text-red-600 dark:text-red-400',
                dueToday && !overdue && 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              )}
            >
              <Clock className="size-3" />
              {overdue ? 'Overdue' : formatDueTime(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-foreground/60">{task.assignee.full_name?.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Priority */}
      {task.priority !== 'No Priority' && (
        <div className={cn('flex h-6 items-center rounded-md px-1.5', priorityColors.bg)}>
          <Circle className={cn('size-2 fill-current', priorityColors.text)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg"
                onClick={() => onEdit(task)}
              >
                <Edit2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg"
                onClick={() => onHide(task.id)}
              >
                <EyeOff className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export function InboxWidget({ tasks }: InboxWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(tasks, tasksReducer);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { userId: currentUserId } = useAdminContext();

  // Check if input looks like a search (matches existing tasks)
  const matchingTasks = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase();
    return optimisticTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) || task.project?.name.toLowerCase().includes(query)
    );
  }, [optimisticTasks, inputValue]);

  const isSearchMode = inputValue.trim() && matchingTasks.length > 0;

  // Filter tasks based on input and filter mode
  const filteredTasks = useMemo(() => {
    return optimisticTasks.filter((task) => {
      // Search filter - only apply if there's input
      if (inputValue.trim()) {
        const query = inputValue.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesProject = task.project?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesProject) return false;
      }

      // Filter mode
      switch (filterMode) {
        case 'mine':
          if (task.assignee?.id !== currentUserId) return false;
          break;
        case 'todo':
          if (task.status === 'Done') return false;
          break;
        case 'done':
          if (task.status !== 'Done') return false;
          break;
      }

      return true;
    });
  }, [optimisticTasks, inputValue, filterMode, currentUserId]);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  const handleSubmit = async () => {
    const title = inputValue.trim();
    if (!title) return;

    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      status: 'Todo',
      priority: 'No Priority',
      show_in_inbox: true,
      requires_attachment: null,
      item_type: 'task',
      workspace_id: '',
      creator_id: null,
      assignee_id: null,
      project_id: null,
      phase_name: null,
      description: null,
      sort_order: 0,
      due_date: null,
      completed_at: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project: null,
      assignee: null,
    };

    setInputValue('');

    startTransition(async () => {
      dispatchOptimistic({ type: 'add', task: tempTask });

      const formData = new FormData();
      formData.set('title', title);
      formData.set('status', 'Todo');
      formData.set('show_in_inbox', 'true');

      await createTask(formData);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  const handleToggleTask = useCallback(
    (taskId: string, completed: boolean) => {
      startTransition(async () => {
        dispatchOptimistic({ type: 'toggle', taskId, completed });
        await quickUpdateTask(taskId, { status: completed ? 'Done' : 'Todo' });
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic]
  );

  const handleHideTask = useCallback(
    (taskId: string) => {
      startTransition(async () => {
        dispatchOptimistic({ type: 'hide', taskId });
        await toggleTaskInbox(taskId, false);
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic]
  );

  const stats = useMemo(() => {
    const todo = optimisticTasks.filter((t) => t.status !== 'Done').length;
    const done = optimisticTasks.filter((t) => t.status === 'Done').length;
    const overdue = optimisticTasks.filter(
      (t) => isOverdue(t.due_date) && t.status !== 'Done'
    ).length;
    return { todo, done, overdue };
  }, [optimisticTasks]);

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-background',
        isPending && 'pointer-events-none opacity-70'
      )}
    >
      {/* Header - Unified with other sections */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
        <div className="flex items-center gap-2.5">
          <Inbox className="size-4 text-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Inbox</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-600 dark:text-amber-400">
            {stats.todo}
          </span>
          {stats.overdue > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
              {stats.overdue} overdue
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {(['all', 'mine', 'todo', 'done'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium capitalize transition-all',
                filterMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/60 hover:text-foreground'
              )}
            >
              {mode === 'mine' ? 'Mine' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Input - Search or Add */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative flex-1">
          <Plus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
          <Input
            ref={inputRef}
            placeholder="Type to search or add task... Press Enter to create"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                setInputValue('');
                inputRef.current?.blur();
              }
            }}
            className="h-9 pl-10 pr-10 text-sm"
          />
          {inputValue && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isPending}
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 dark:text-amber-400"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hint when typing */}
      {inputValue.trim() && (
        <div className="border-b border-border bg-muted/30 px-4 py-1.5">
          <p className="text-xs text-foreground/60">
            {isSearchMode ? (
              <>
                <span className="font-medium">{matchingTasks.length}</span> matching tasks.{' '}
                <span className="text-amber-600 dark:text-amber-400">Press Enter</span> to create
                &quot;{inputValue.trim()}&quot;
              </>
            ) : (
              <>
                <span className="text-amber-600 dark:text-amber-400">Press Enter</span> to create
                task
              </>
            )}
          </p>
        </div>
      )}

      {/* Task List */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {inputValue.trim()
                ? 'No matching tasks'
                : filterMode === 'done'
                  ? 'Nothing completed yet'
                  : filterMode === 'mine'
                    ? 'Nothing assigned to you'
                    : 'Inbox is empty'}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              {inputValue.trim()
                ? 'Press Enter to create this task'
                : filterMode === 'done'
                  ? 'Complete a task and it will show here'
                  : filterMode === 'mine'
                    ? 'Switch to All or add a task above'
                    : 'Type above to capture anything on your mind'}
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <AnimatePresence mode="popLayout">
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const task = filteredTasks[virtualRow.index];
                return (
                  <m.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(virtualRow.index * 0.03, 0.24),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <TaskRow
                      task={task}
                      onToggle={handleToggleTask}
                      onHide={handleHideTask}
                      onEdit={setEditingTask}
                    />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}
    </div>
  );
}
