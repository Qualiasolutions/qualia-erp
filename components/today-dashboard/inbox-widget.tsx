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
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, toggleTaskInbox, createTask, type Task } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminContext } from '@/components/admin-provider';

interface InboxWidgetProps {
  tasks: Task[];
}

type FilterMode = 'all' | 'mine' | 'todo' | 'done';

const PRIORITY_CONFIG = {
  Urgent: { color: 'fill-red-500 text-red-500', bg: 'bg-red-500/10' },
  High: { color: 'fill-orange-500 text-orange-500', bg: 'bg-orange-500/10' },
  Medium: { color: 'fill-amber-500 text-amber-500', bg: 'bg-amber-500/10' },
  Low: { color: 'fill-emerald-500 text-emerald-500', bg: 'bg-emerald-500/10' },
  'No Priority': { color: 'fill-zinc-500 text-zinc-500', bg: 'bg-zinc-500/10' },
};

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
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 transition-all',
        'hover:bg-white/[0.02]',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
          isCompleted
            ? 'border-emerald-500/50 bg-emerald-500 text-white'
            : 'border-zinc-600 hover:border-emerald-500/50 hover:bg-emerald-500/10'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm font-medium',
            isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-100'
          )}
        >
          {task.title}
        </span>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {task.project && (
            <span className="flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5">
              <FolderOpen className="h-3 w-3" />
              <span className="max-w-[80px] truncate">{task.project.name}</span>
            </span>
          )}
          {task.due_date && !isCompleted && (
            <span
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-0.5',
                overdue && 'bg-red-500/10 text-red-400',
                dueToday && !overdue && 'bg-amber-500/10 text-amber-400'
              )}
            >
              <Clock className="h-3 w-3" />
              {overdue ? 'Overdue' : formatDueTime(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-qualia-500" />
              <span className="text-zinc-400">{task.assignee.full_name?.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Priority */}
      {task.priority !== 'No Priority' && (
        <div className={cn('flex h-6 items-center rounded-md px-1.5', priorityConfig.bg)}>
          <Circle className={cn('h-2 w-2', priorityConfig.color)} />
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
                className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                onClick={() => onEdit(task)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                onClick={() => onHide(task.id)}
              >
                <EyeOff className="h-3.5 w-3.5" />
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
  const [quickAddValue, setQuickAddValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const { userId: currentUserId } = useAdminContext();

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return optimisticTasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
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
  }, [optimisticTasks, searchQuery, filterMode, currentUserId]);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 5,
  });

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title) return;

    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      status: 'Todo',
      priority: 'No Priority',
      show_in_inbox: true,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project: null,
      assignee: null,
    };

    setQuickAddValue('');

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
    <div className={cn('flex h-full flex-col', isPending && 'pointer-events-none opacity-70')}>
      {/* Header with filters */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Inbox className="h-4 w-4 text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Inbox</h2>
          {stats.overdue > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
              {stats.overdue} overdue
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Filter tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800/50 p-1">
          {(['all', 'mine', 'todo', 'done'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all',
                filterMode === mode ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {mode === 'mine' ? 'My Tasks' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Quick Add */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 bg-zinc-900/50 pl-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Add task..."
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className="h-8 w-48 bg-zinc-900/50 text-sm"
          />
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={!quickAddValue.trim() || isPending}
            className="h-8 w-8 bg-amber-500 p-0 text-black hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-white">
              {searchQuery
                ? 'No matching tasks'
                : filterMode === 'done'
                  ? 'No completed tasks'
                  : 'All clear!'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {searchQuery ? 'Try a different search' : 'Add a task to get started'}
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
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
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
                  </motion.div>
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
