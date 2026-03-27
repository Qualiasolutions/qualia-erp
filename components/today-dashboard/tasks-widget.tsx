'use client';

import React, { useTransition, useState, useOptimistic, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Circle,
  Clock,
  EyeOff,
  Edit2,
  Plus,
  Check,
  Trash2,
  Globe,
  Bot,
  Phone,
  Sparkles,
  TrendingUp,
  Smartphone,
  Megaphone,
  Folder,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  quickUpdateTask,
  toggleTaskInbox,
  createTask,
  deleteTask,
  clearCompletedFromInbox,
  type Task,
} from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { useAdminContext } from '@/components/admin-provider';

// Optimistic action types for instant UI feedback
type OptimisticAction =
  | { type: 'toggle'; taskId: string; completed: boolean }
  | { type: 'hide'; taskId: string }
  | { type: 'delete'; taskId: string }
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
    case 'delete':
      return state.filter((t) => t.id !== action.taskId);
    case 'add':
      return [action.task, ...state];
    default:
      return state;
  }
}

interface TasksWidgetProps {
  tasks: Task[];
}

const PRIORITY_CONFIG = {
  Urgent: 'fill-red-500 text-red-500',
  High: 'fill-orange-500 text-orange-500',
  Medium: 'fill-amber-500 text-amber-500',
  Low: 'fill-emerald-500 text-emerald-500',
  'No Priority': 'fill-muted-foreground/30 text-muted-foreground/30',
};

const PROJECT_TYPE_COLORS: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
  ai_agent: { icon: Bot, color: 'text-violet-500', bg: 'bg-violet-500/15' },
  voice_agent: { icon: Phone, color: 'text-pink-500', bg: 'bg-pink-500/15' },
  ai_platform: { icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-500/15' },
  web_design: { icon: Globe, color: 'text-sky-500', bg: 'bg-sky-500/15' },
  seo: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
  app: { icon: Smartphone, color: 'text-teal-500', bg: 'bg-teal-500/15' },
  ads: { icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-500/15' },
};

function formatDueTime(dueDate: string): string {
  const date = parseISO(dueDate);
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d');
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(parseISO(dueDate));
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
}

const TaskItem = React.memo(function TaskItem({
  task,
  onToggle,
  onHide,
  onDelete,
  onEdit,
  isPending,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  isPending: boolean;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={cn(
        'card-interactive group mx-1 flex items-start gap-3 px-3 py-3',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        disabled={isPending}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-premium',
          isCompleted
            ? 'animate-checkbox-bounce border-amber-500/50 bg-amber-500 text-primary-foreground'
            : 'border-muted-foreground/30 hover:scale-110 hover:border-amber-500/50 hover:bg-amber-500/10'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-[13px] font-medium leading-tight',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.project &&
            (() => {
              const typeConfig = task.project.project_type
                ? PROJECT_TYPE_COLORS[task.project.project_type]
                : null;
              const TypeIcon = typeConfig?.icon || Folder;
              return (
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-0.5',
                    typeConfig?.bg || 'bg-muted/30'
                  )}
                >
                  <TypeIcon
                    className={cn('h-3 w-3', typeConfig?.color || 'text-muted-foreground')}
                  />
                  <span className="max-w-[120px] truncate">{task.project.name}</span>
                </span>
              );
            })()}
          {task.due_date && !isCompleted && (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-0.5',
                overdue && 'bg-red-500/10 text-red-400',
                dueToday && !overdue && 'bg-amber-500/10 text-amber-400',
                !overdue && !dueToday && 'bg-muted/30'
              )}
            >
              <Clock className="h-3 w-3" />
              {overdue ? 'Overdue' : formatDueTime(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                {task.assignee.full_name?.split(' ')[0]}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {task.priority !== 'No Priority' && (
          <div
            className={cn(
              'flex h-6 items-center rounded-md px-1.5',
              task.priority === 'Urgent' && 'bg-red-500/10',
              task.priority === 'High' && 'bg-orange-500/10',
              task.priority === 'Medium' && 'bg-amber-500/10',
              task.priority === 'Low' && 'bg-emerald-500/10'
            )}
          >
            <Circle className={cn('h-2 w-2', PRIORITY_CONFIG[task.priority])} />
          </div>
        )}
        <div className="flex items-center gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  onClick={() => onEdit(task)}
                  disabled={isPending}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  onClick={() => onHide(task.id)}
                  disabled={isPending}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Hide</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
                  onClick={() => onDelete(task.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </m.div>
  );
});

export function TasksWidget({ tasks }: TasksWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(tasks, tasksReducer);
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title) return;

    // Optimistic add - create temp task for instant feedback
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

    setQuickAddValue('');
    setIsAddingTask(true);

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
      setIsAddingTask(false);
    });
  };

  // Get current user ID for "My Tasks" filter
  const { userId: currentUserId } = useAdminContext();

  // Use optimistic tasks for filtering to show instant updates
  const allFilteredTasks = optimisticTasks.filter((t) => {
    if (hiddenTasks.has(t.id)) return false;
    if (selectedUserId && t.assignee?.id !== selectedUserId) return false;
    return true;
  });

  const pendingTasks = allFilteredTasks.filter((t) => t.status !== 'Done').length;
  const completedTasks = allFilteredTasks.filter((t) => t.status === 'Done').length;

  // Show either active or completed based on toggle
  const visibleTasks = showCompleted
    ? allFilteredTasks.filter((t) => t.status === 'Done')
    : allFilteredTasks.filter((t) => t.status !== 'Done');

  // Optimistic toggle - instant feedback, then sync with server
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

  // Optimistic hide - instant feedback, then sync with server
  const handleHideTask = useCallback(
    (taskId: string) => {
      setHiddenTasks((prev) => new Set(prev).add(taskId));
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

  // Optimistic delete - instant feedback, then sync with server
  const handleDeleteTask = useCallback(
    (taskId: string) => {
      startTransition(async () => {
        dispatchOptimistic({ type: 'delete', taskId });
        await deleteTask(taskId);
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic]
  );

  // Clear all completed tasks from inbox
  const handleClearCompleted = useCallback(() => {
    startTransition(async () => {
      await clearCompletedFromInbox();
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      setShowCompleted(false);
      router.refresh();
    });
  }, [router]);

  // Virtualization for performance with large task lists
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: visibleTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
    overscan: 5,
  });

  return (
    <div className={cn('flex h-full flex-col', isPending && 'pointer-events-none opacity-70')}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
              <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendingTasks} pending{completedTasks > 0 && ` · ${completedTasks} done`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Completed view toggle */}
          {completedTasks > 0 && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      showCompleted
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    )}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {completedTasks}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {showCompleted ? 'Show active tasks' : 'Show completed tasks'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* User filter */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            <button
              onClick={() => setSelectedUserId(null)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                !selectedUserId
                  ? 'bg-muted/50 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All Tasks
            </button>
            <button
              onClick={() => setSelectedUserId(currentUserId)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                selectedUserId === currentUserId
                  ? 'bg-muted/50 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              My Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add - hidden in completed view */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border px-5 py-3',
          showCompleted && 'hidden'
        )}
      >
        <input
          type="text"
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAddingTask) {
              e.preventDefault();
              handleQuickAdd();
            }
          }}
          placeholder="Add a new task..."
          disabled={isAddingTask}
          className="h-9 flex-1 rounded-lg bg-muted/30 px-3 text-sm text-foreground outline-none ring-1 ring-border transition-all placeholder:text-muted-foreground focus:ring-primary/50"
        />
        <Button
          size="sm"
          onClick={handleQuickAdd}
          disabled={!quickAddValue.trim() || isAddingTask}
          className="h-9 w-9 rounded-lg bg-amber-500/20 p-0 text-amber-400 transition-all hover:bg-amber-500/30 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Completed view header with clear action */}
      {showCompleted && completedTasks > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-emerald-500/5 px-5 py-2.5">
          <span className="text-xs text-emerald-400">
            {completedTasks} completed task{completedTasks !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleClearCompleted}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground"
          >
            <Archive className="h-3 w-3" />
            Clear from inbox
          </button>
        </div>
      )}

      {/* Task List - Virtualized for performance */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {visibleTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 animate-float items-center justify-center rounded-full bg-amber-500/10">
              {showCompleted ? (
                <Archive className="h-6 w-6 text-amber-500" />
              ) : (
                <Check className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <p className="stagger-1 animate-stagger-in text-sm font-medium text-foreground">
              {showCompleted
                ? 'No completed tasks'
                : selectedUserId
                  ? 'Nothing assigned to you'
                  : 'All clear for today'}
            </p>
            <p className="stagger-2 mt-1 animate-stagger-in text-xs text-muted-foreground">
              {showCompleted
                ? 'Completed tasks will show up here'
                : selectedUserId
                  ? 'Switch to All Tasks or add one above'
                  : 'Add a task above to get started'}
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
                const task = visibleTasks[virtualRow.index];
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
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <TaskItem
                      task={task}
                      onToggle={handleToggleTask}
                      onHide={handleHideTask}
                      onDelete={handleDeleteTask}
                      onEdit={setEditingTask}
                      isPending={isPending}
                    />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask as Task}
          open={!!editingTask}
          onOpenChange={(open: boolean) => !open && setEditingTask(null)}
        />
      )}
    </div>
  );
}
