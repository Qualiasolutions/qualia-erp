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
import { toast } from 'sonner';
import { useSidebar } from '@/components/sidebar-provider';
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
  Menu,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  quickUpdateTask,
  toggleTaskInbox,
  createTask,
  deleteTask,
  type Task,
} from '@/app/actions/inbox';
import {
  invalidateInboxTasks,
  invalidateDailyFlow,
  useInboxTasks,
  useCurrentWorkspaceId,
} from '@/lib/swr';
import { useRealtimeTasks } from '@/lib/hooks/use-realtime-tasks';
import { EditTaskModal } from '@/components/edit-task-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import Link from 'next/link';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';

interface InboxViewProps {
  initialTasks: Task[];
}

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done';
type FilterPriority = 'all' | 'urgent' | 'high' | 'medium' | 'low';

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

const TaskRow = React.memo(function TaskRow({
  task,
  onToggle,
  onHide,
  onDelete,
  onEdit,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);
  const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];

  return (
    <div
      className={cn(
        'group flex items-center gap-4 border-b border-border px-6 py-4 transition-colors',
        'hover:bg-accent/50',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox — stops propagation so ticking done doesn't also open edit */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id, !isCompleted);
        }}
        aria-label={isCompleted ? `Mark "${task.title}" as todo` : `Mark "${task.title}" as done`}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
          isCompleted
            ? 'border-emerald-500/50 bg-emerald-500 text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-emerald-500/50 hover:bg-emerald-500/10'
        )}
      >
        {isCompleted && <Check className="size-3" strokeWidth={3} />}
      </button>

      {/* Title — clickable opens edit modal. Using a <button> inside the row
          so the entire title area is a proper interactive element for
          keyboard + screen readers. Previous version was inert. */}
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
        aria-label={`Edit task: ${task.title}`}
      >
        <span
          className={cn(
            'text-sm font-medium',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
        )}
      </button>

      {/* Project */}
      <div className="hidden w-40 shrink-0 md:block">
        {task.project ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderOpen className="size-3" />
            <span className="truncate">{task.project.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>

      {/* Due Date */}
      <div className="hidden w-24 shrink-0 sm:block">
        {task.due_date && !isCompleted ? (
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs',
              overdue && 'bg-red-500/10 text-red-600 dark:text-red-400',
              dueToday && !overdue && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              !overdue && !dueToday && 'text-muted-foreground'
            )}
          >
            <Clock className="size-3" />
            {overdue ? 'Overdue' : formatDueTime(task.due_date)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="w-20 shrink-0">
        {task.priority !== 'No Priority' ? (
          <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', priorityColors.bg)}>
            <Circle className={cn('size-2 fill-current', priorityColors.text)} />
            <span className={cn('text-xs', priorityColors.text)}>{priorityColors.label}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>

      {/* Actions — always visible on mobile/tablet (touch devices can't hover),
          reveal on hover only at md+. Previously action icons were invisible
          on touch devices entirely (OPTIMIZE.md H7). */}
      <div className="flex w-24 shrink-0 items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
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
            <TooltipContent>Remove from inbox</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg text-muted-foreground/50 hover:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete task</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export function InboxView({ initialTasks }: InboxViewProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  // SWR keeps data fresh across tabs/background refetch (45s interval)
  const { tasks: liveTasks, isError: isTaskError, revalidate: revalidateTasks } = useInboxTasks();
  const { workspaceId } = useCurrentWorkspaceId();
  // Realtime: auto-refresh when any task changes
  useRealtimeTasks(workspaceId ?? null);
  const baseTasks = liveTasks.length > 0 ? liveTasks : initialTasks;
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(baseTasks, tasksReducer);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const PRIORITY_ORDER: Record<string, number> = {
      Urgent: 0,
      High: 1,
      Medium: 2,
      Low: 3,
      'No Priority': 4,
    };

    return optimisticTasks
      .filter((task) => {
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
      })
      .sort((a, b) => {
        const aPriority = PRIORITY_ORDER[a.priority ?? 'No Priority'] ?? 4;
        const bPriority = PRIORITY_ORDER[b.priority ?? 'No Priority'] ?? 4;
        return aPriority - bPriority;
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
      requires_attachment: null,
      submission_text: null,
      submitted_at: null,
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

    startTransition(async () => {
      dispatchOptimistic({ type: 'add', task: tempTask });

      const formData = new FormData();
      formData.set('title', title);
      formData.set('status', 'Todo');
      formData.set('show_in_inbox', 'true');

      const result = await createTask(formData);
      if (!result.success) toast.error(result.error ?? 'Failed to create task');
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  const handleToggleTask = useCallback(
    (taskId: string, completed: boolean) => {
      startTransition(async () => {
        dispatchOptimistic({ type: 'toggle', taskId, completed });
        const result = await quickUpdateTask(taskId, { status: completed ? 'Done' : 'Todo' });
        if (!result.success) toast.error(result.error ?? 'Failed to update task');
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
        const result = await toggleTaskInbox(taskId, false);
        if (!result.success) toast.error(result.error ?? 'Failed to hide task');
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic]
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    setDeleteTaskId(taskId);
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (!deleteTaskId) return;
    const id = deleteTaskId;
    setDeleteTaskId(null);
    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', taskId: id });
      const result = await deleteTask(id);
      if (!result.success) toast.error(result.error ?? 'Failed to delete task');
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  }, [deleteTaskId, router, dispatchOptimistic]);

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
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleMobile}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <Link
            href="/"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-border">
              <Inbox className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Inbox
              </h1>
              <p className="text-xs text-muted-foreground">{optimisticTasks.length} tasks</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {stats.todo}
            </span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70">todo</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {stats.inProgress}
            </span>
            <span className="text-xs text-blue-600/70 dark:text-blue-400/70">in progress</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.done}
            </span>
            <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">done</span>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
              <AlertCircle className="size-3.5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                {stats.overdue}
              </span>
              <span className="text-xs text-red-600/70 dark:text-red-400/70">overdue</span>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        {/* Search */}
        <div className="relative w-full max-w-md flex-1 sm:w-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="h-9 w-32 text-sm">
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
            <SelectTrigger className="h-9 w-32 text-sm">
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
        <div className="flex w-full items-center gap-2 sm:w-auto">
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
            className="h-9 w-full text-sm sm:w-64"
          />
          <Button
            size="sm"
            onClick={handleQuickAdd}
            disabled={!quickAddValue.trim() || isPending}
            className="h-9"
          >
            <Plus className="mr-1.5 size-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center border-b border-border bg-muted/50 px-6 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <div className="w-5 shrink-0" /> {/* Checkbox space */}
        <div className="ml-4 flex-1">Task</div>
        <div className="hidden w-40 shrink-0 md:block">Project</div>
        <div className="hidden w-24 shrink-0 sm:block">Due</div>
        <div className="w-20 shrink-0">Priority</div>
        <div className="w-24 shrink-0" /> {/* Actions space */}
      </div>

      {/* Task List - Virtualized */}
      <div
        ref={parentRef}
        className={cn('min-h-0 flex-1 overflow-auto', isPending && 'opacity-70')}
      >
        {isTaskError && filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-medium text-foreground">Couldn&apos;t load tasks</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong fetching your inbox.
            </p>
            <Button onClick={() => revalidateTasks()} variant="outline" size="sm" className="mt-4">
              Retry
            </Button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'No matching tasks'
                : 'Inbox zero!'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
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
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const task = filteredTasks[virtualRow.index];
              return (
                <div
                  key={task.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TaskRow
                    task={task}
                    onToggle={handleToggleTask}
                    onHide={handleHideTask}
                    onDelete={handleDeleteTask}
                    onEdit={setEditingTask}
                  />
                </div>
              );
            })}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        title="Delete task"
        description="Permanently delete this task? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
}
