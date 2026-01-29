'use client';

import React, {
  useTransition,
  useState,
  useOptimistic,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Circle,
  Clock,
  EyeOff,
  FolderOpen,
  Edit2,
  Plus,
  Check,
  Inbox,
  Filter,
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, toggleTaskInbox, createTask, type Task } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface InboxViewProps {
  initialTasks: Task[];
}

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done';
type FilterPriority = 'all' | 'urgent' | 'high' | 'medium' | 'low';

const PRIORITY_CONFIG = {
  Urgent: { color: 'fill-red-500 text-red-500', bg: 'bg-red-500/10', label: 'Urgent' },
  High: { color: 'fill-orange-500 text-orange-500', bg: 'bg-orange-500/10', label: 'High' },
  Medium: { color: 'fill-amber-500 text-amber-500', bg: 'bg-amber-500/10', label: 'Medium' },
  Low: { color: 'fill-emerald-500 text-emerald-500', bg: 'bg-emerald-500/10', label: 'Low' },
  'No Priority': {
    color: 'fill-muted-foreground/30 text-muted-foreground/30',
    bg: 'bg-muted/30',
    label: 'None',
  },
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
  style,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onEdit: (task: Task) => void;
  style?: React.CSSProperties;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      style={style}
      className={cn(
        'group flex items-center gap-4 border-b border-white/[0.04] px-6 py-4 transition-all',
        'hover:bg-white/[0.02]',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
          isCompleted
            ? 'border-emerald-500/50 bg-emerald-500 text-white'
            : 'border-zinc-600 hover:border-emerald-500/50 hover:bg-emerald-500/10'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-sm font-medium',
            isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-100'
          )}
        >
          {task.title}
        </span>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{task.description}</p>
        )}
      </div>

      {/* Project */}
      <div className="hidden w-40 shrink-0 md:block">
        {task.project ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <FolderOpen className="h-3 w-3" />
            <span className="truncate">{task.project.name}</span>
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </div>

      {/* Due Date */}
      <div className="hidden w-24 shrink-0 sm:block">
        {task.due_date && !isCompleted ? (
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs',
              overdue && 'bg-red-500/10 text-red-400',
              dueToday && !overdue && 'bg-amber-500/10 text-amber-400',
              !overdue && !dueToday && 'text-zinc-500'
            )}
          >
            <Clock className="h-3 w-3" />
            {overdue ? 'Overdue' : formatDueTime(task.due_date)}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="w-20 shrink-0">
        {task.priority !== 'No Priority' ? (
          <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', priorityConfig.bg)}>
            <Circle className={cn('h-2 w-2', priorityConfig.color)} />
            <span className="text-xs text-zinc-300">{priorityConfig.label}</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-20 shrink-0 items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            <TooltipContent>Remove from inbox</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export function InboxView({ initialTasks }: InboxViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(initialTasks, tasksReducer);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const parentRef = useRef<HTMLDivElement>(null);

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

      // Status filter
      if (statusFilter !== 'all') {
        const statusMap: Record<FilterStatus, string> = {
          all: '',
          todo: 'Todo',
          in_progress: 'In Progress',
          done: 'Done',
        };
        if (task.status !== statusMap[statusFilter]) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const priorityMap: Record<FilterPriority, string> = {
          all: '',
          urgent: 'Urgent',
          high: 'High',
          medium: 'Medium',
          low: 'Low',
        };
        if (task.priority !== priorityMap[priorityFilter]) return false;
      }

      return true;
    });
  }, [optimisticTasks, searchQuery, statusFilter, priorityFilter]);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Estimated row height
    overscan: 5,
  });

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title) return;

    // Optimistic add
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N for new task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('quick-add-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stats = useMemo(() => {
    const todo = optimisticTasks.filter((t) => t.status === 'Todo').length;
    const inProgress = optimisticTasks.filter((t) => t.status === 'In Progress').length;
    const done = optimisticTasks.filter((t) => t.status === 'Done').length;
    const overdue = optimisticTasks.filter(
      (t) => isOverdue(t.due_date) && t.status !== 'Done'
    ).length;
    return { todo, inProgress, done, overdue };
  }, [optimisticTasks]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-white/10">
              <Inbox className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Inbox</h1>
              <p className="text-xs text-zinc-500">{optimisticTasks.length} tasks</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-amber-400">{stats.todo}</span>
            <span className="text-xs text-amber-400/70">todo</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-blue-400">
              {stats.inProgress}
            </span>
            <span className="text-xs text-blue-400/70">in progress</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-emerald-400">
              {stats.done}
            </span>
            <span className="text-xs text-emerald-400/70">done</span>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-sm font-semibold tabular-nums text-red-400">
                {stats.overdue}
              </span>
              <span className="text-xs text-red-400/70">overdue</span>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-white/[0.06] px-6 py-3">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 bg-zinc-900 pl-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="h-9 w-32 bg-zinc-900 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as FilterPriority)}
          >
            <SelectTrigger className="h-9 w-32 bg-zinc-900 text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Add */}
        <div className="flex items-center gap-2">
          <Input
            id="quick-add-input"
            placeholder="Add task... (⌘N)"
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
            className="h-9 w-64 bg-zinc-900 text-sm"
          />
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={!quickAddValue.trim() || isPending}
            className="h-9 bg-amber-500 text-black hover:bg-amber-400"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center border-b border-white/[0.06] bg-zinc-900/50 px-6 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <div className="w-5 shrink-0" /> {/* Checkbox space */}
        <div className="ml-4 flex-1">Task</div>
        <div className="hidden w-40 shrink-0 md:block">Project</div>
        <div className="hidden w-24 shrink-0 sm:block">Due</div>
        <div className="w-20 shrink-0">Priority</div>
        <div className="w-20 shrink-0" /> {/* Actions space */}
      </div>

      {/* Task List - Virtualized */}
      <div
        ref={parentRef}
        className={cn('min-h-0 flex-1 overflow-auto', isPending && 'opacity-70')}
      >
        {filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-white">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'No matching tasks'
                : 'Inbox zero!'}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'All tasks are complete'}
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
