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
  ListTodo,
  Filter,
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Menu,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  quickUpdateTask,
  toggleTaskInbox,
  createTask,
  deleteTask,
  getTasks,
  bulkAssignTasks,
  bulkMarkDone,
  bulkDelete,
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

export type TasksMode = 'inbox' | 'all-tasks' | 'client';

interface TasksViewProps {
  mode: TasksMode;
  initialTasks: Task[];
  /** Admin-only — populates the bulk-assign dropdown. Required when mode === 'all-tasks'. */
  assignableMembers?: Array<{ id: string; full_name: string | null; email: string | null }>;
}

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

type OptimisticAction =
  | { type: 'toggle'; taskId: string; completed: boolean }
  | { type: 'hide'; taskId: string }
  | { type: 'delete'; taskId: string }
  | { type: 'bulkDelete'; taskIds: string[] }
  | { type: 'bulkDone'; taskIds: string[] }
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
    case 'delete':
      return state.filter((t) => t.id !== action.taskId);
    case 'bulkDelete': {
      const ids = new Set(action.taskIds);
      return state.filter((t) => !ids.has(t.id));
    }
    case 'bulkDone': {
      const ids = new Set(action.taskIds);
      const now = new Date().toISOString();
      return state.map((t) => (ids.has(t.id) ? { ...t, status: 'Done', completed_at: now } : t));
    }
    case 'add':
      return [action.task, ...state];
    default:
      return state;
  }
}

const TaskRow = React.memo(function TaskRow({
  task,
  mode,
  selected,
  onToggleSelect,
  onToggle,
  onHide,
  onDelete,
  onEdit,
  showAssignee,
}: {
  task: Task;
  mode: TasksMode;
  selected: boolean;
  onToggleSelect: (taskId: string) => void;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  showAssignee: boolean;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);
  const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];
  const isAdminAll = mode === 'all-tasks';
  const isClient = mode === 'client';

  return (
    <div
      className={cn(
        'group flex items-center gap-4 border-b border-border px-6 py-4 transition-colors',
        'hover:bg-accent/50',
        isCompleted && 'opacity-50',
        selected && 'bg-primary/5'
      )}
    >
      {isAdminAll && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(task.id)}
          aria-label={selected ? `Deselect "${task.title}"` : `Select "${task.title}"`}
          className="size-4 shrink-0 rounded border-muted-foreground/40 text-primary focus:ring-2 focus:ring-primary/30"
        />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id, !isCompleted);
        }}
        aria-label={isCompleted ? `Mark "${task.title}" as todo` : `Mark "${task.title}" as done`}
        disabled={isClient}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
          isCompleted
            ? 'border-emerald-500/50 bg-emerald-500 text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-emerald-500/50 hover:bg-emerald-500/10',
          isClient &&
            'cursor-default opacity-60 hover:border-muted-foreground/40 hover:bg-transparent'
        )}
      >
        {isCompleted && <Check className="size-3" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={() => !isClient && onEdit(task)}
        className={cn(
          'min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
          !isClient && 'cursor-pointer'
        )}
        aria-label={isClient ? task.title : `Edit task: ${task.title}`}
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

      {showAssignee && (
        <div className="hidden w-32 shrink-0 lg:block">
          {task.assignee ? (
            <span className="truncate text-xs text-muted-foreground">
              {task.assignee.full_name || task.assignee.email}
            </span>
          ) : (
            <span className="text-xs italic text-muted-foreground/50">Unassigned</span>
          )}
        </div>
      )}

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

      {!isClient && (
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
            {mode === 'inbox' && (
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
            )}
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
      )}
    </div>
  );
});

export function TasksView({ mode, initialTasks, assignableMembers = [] }: TasksViewProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  // SWR + realtime are only useful in inbox mode; the other modes refresh via router.refresh().
  const inboxLive = useInboxTasks();
  const { workspaceId } = useCurrentWorkspaceId();
  useRealtimeTasks(mode === 'inbox' ? (workspaceId ?? null) : null);

  const baseTasks = mode === 'inbox' && inboxLive.tasks.length > 0 ? inboxLive.tasks : initialTasks;
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(baseTasks, tasksReducer);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const parentRef = useRef<HTMLDivElement>(null);

  const isAdminAll = mode === 'all-tasks';
  const isClient = mode === 'client';
  const canQuickAdd = mode === 'inbox';
  const canBulkAct = isAdminAll;
  const headerLabel = isClient ? 'Tasks' : isAdminAll ? 'All Tasks' : 'Inbox';

  const handleToggleCompleted = useCallback(async () => {
    const next = !showCompleted;
    setShowCompleted(next);
    if (next && mode === 'inbox') {
      setLoadingCompleted(true);
      try {
        const done = await getTasks(null, { inboxOnly: true, status: ['Done'] });
        setCompletedTasks(done);
      } catch {
        toast.error('Failed to load completed tasks');
      } finally {
        setLoadingCompleted(false);
      }
    }
  }, [showCompleted, mode]);

  const allTasks = useMemo(() => {
    if (mode === 'inbox' && showCompleted) {
      const ids = new Set(optimisticTasks.map((t) => t.id));
      const extra = completedTasks.filter((t) => !ids.has(t.id));
      return [...optimisticTasks, ...extra];
    }
    return optimisticTasks;
  }, [optimisticTasks, completedTasks, showCompleted, mode]);

  const filteredTasks = useMemo(() => {
    const PRIORITY_ORDER: Record<string, number> = {
      Urgent: 0,
      High: 1,
      Medium: 2,
      Low: 3,
      'No Priority': 4,
    };
    const priorityMap: Record<FilterPriority, string> = {
      all: '',
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    return allTasks
      .filter((task) => {
        if (!isAdminAll && !showCompleted && task.status === 'Done') return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesProject = task.project?.name.toLowerCase().includes(q);
          const matchesAssignee = task.assignee?.full_name?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesProject && !matchesAssignee) return false;
        }

        if (priorityFilter !== 'all' && task.priority !== priorityMap[priorityFilter]) {
          return false;
        }

        if (isAdminAll && assigneeFilter !== 'all') {
          if (assigneeFilter === 'unassigned' && task.assignee_id) return false;
          if (assigneeFilter !== 'unassigned' && task.assignee_id !== assigneeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === 'Done' && b.status !== 'Done') return 1;
        if (a.status !== 'Done' && b.status === 'Done') return -1;
        const aPriority = PRIORITY_ORDER[a.priority ?? 'No Priority'] ?? 4;
        const bPriority = PRIORITY_ORDER[b.priority ?? 'No Priority'] ?? 4;
        return aPriority - bPriority;
      });
  }, [allTasks, searchQuery, priorityFilter, assigneeFilter, isAdminAll, showCompleted]);

  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73,
    overscan: 5,
  });

  // Drop selections that no longer exist after filter or refresh
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredTasks.map((t) => t.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id);
      else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredTasks, selectedIds]);

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title) return;

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
      if (isClient) return;
      startTransition(async () => {
        dispatchOptimistic({ type: 'toggle', taskId, completed });
        const result = await quickUpdateTask(taskId, { status: completed ? 'Done' : 'Todo' });
        if (!result.success) toast.error(result.error ?? 'Failed to update task');
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic, isClient]
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

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const allVisibleSelected =
    filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleBulkAssign = () => {
    if (selectedIds.size === 0 || !bulkAssignee) return;
    const ids = Array.from(selectedIds);
    const assigneeId = bulkAssignee === '__unassign__' ? null : bulkAssignee;
    startTransition(async () => {
      const result = await bulkAssignTasks(ids, assigneeId);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to assign tasks');
        return;
      }
      const count = (result.data as { count?: number } | undefined)?.count ?? ids.length;
      toast.success(`Reassigned ${count} task${count === 1 ? '' : 's'}`);
      setSelectedIds(new Set());
      setBulkAssignee('');
      router.refresh();
    });
  };

  const handleBulkDone = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      dispatchOptimistic({ type: 'bulkDone', taskIds: ids });
      const result = await bulkMarkDone(ids);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to mark tasks done');
        return;
      }
      const count = (result.data as { count?: number } | undefined)?.count ?? ids.length;
      toast.success(`Marked ${count} task${count === 1 ? '' : 's'} done`);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setPendingBulkDelete(false);
    startTransition(async () => {
      dispatchOptimistic({ type: 'bulkDelete', taskIds: ids });
      const result = await bulkDelete(ids);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete tasks');
        return;
      }
      const count = (result.data as { count?: number } | undefined)?.count ?? ids.length;
      toast.success(`Deleted ${count} task${count === 1 ? '' : 's'}`);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  useEffect(() => {
    if (!canQuickAdd) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('quick-add-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canQuickAdd]);

  const stats = useMemo(() => {
    const todo = allTasks.filter((t) => t.status === 'Todo').length;
    const inProgress = allTasks.filter((t) => t.status === 'In Progress').length;
    const done = allTasks.filter((t) => t.status === 'Done').length;
    const overdue = allTasks.filter((t) => isOverdue(t.due_date) && t.status !== 'Done').length;
    return { todo, inProgress, done, overdue };
  }, [allTasks]);

  return (
    <div className="flex h-full flex-col bg-background">
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
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-border">
              <ListTodo className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {headerLabel}
              </h1>
              <p className="text-xs text-muted-foreground">{optimisticTasks.length} tasks</p>
            </div>
          </div>
        </div>

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

      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <div className="relative w-full max-w-md flex-1 sm:w-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          {!isAdminAll && (
            <Button
              variant={showCompleted ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1.5 text-sm"
              onClick={handleToggleCompleted}
              disabled={loadingCompleted}
            >
              <CheckCircle2 className="size-3.5" />
              {loadingCompleted
                ? 'Loading...'
                : showCompleted
                  ? 'Hide completed'
                  : 'Show completed'}
            </Button>
          )}
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
          {isAdminAll && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {canQuickAdd && (
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
        )}
      </div>

      {canBulkAct && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-primary/5 px-6 py-2.5">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder="Reassign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassign__">Unassign</SelectItem>
                {assignableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={handleBulkAssign}
              disabled={!bulkAssignee || isPending}
            >
              <UserPlus className="size-3.5" />
              Assign
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={handleBulkDone}
            disabled={isPending}
          >
            <CheckCircle2 className="size-3.5" />
            Mark done
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setPendingBulkDelete(true)}
            disabled={isPending}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-8 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="flex items-center border-b border-border bg-muted/50 px-6 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {isAdminAll ? (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
            className="size-4 shrink-0 rounded border-muted-foreground/40 text-primary focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <div className="w-5 shrink-0" />
        )}
        <div className="ml-4 flex-1">Task</div>
        {isAdminAll && <div className="hidden w-32 shrink-0 lg:block">Assignee</div>}
        <div className="hidden w-40 shrink-0 md:block">Project</div>
        <div className="hidden w-24 shrink-0 sm:block">Due</div>
        <div className="w-20 shrink-0">Priority</div>
        {!isClient && <div className="w-24 shrink-0" />}
      </div>

      <div
        ref={parentRef}
        className={cn('min-h-0 flex-1 overflow-auto', isPending && 'opacity-70')}
      >
        {mode === 'inbox' && inboxLive.isError && filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-medium text-foreground">Couldn&apos;t load tasks</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong fetching your inbox.
            </p>
            <Button
              onClick={() => inboxLive.revalidate()}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {searchQuery || priorityFilter !== 'all' || assigneeFilter !== 'all'
                ? 'No matching tasks'
                : isClient
                  ? 'No tasks yet'
                  : 'All caught up!'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || priorityFilter !== 'all' || assigneeFilter !== 'all'
                ? 'Try adjusting your filters'
                : isClient
                  ? 'Your team will share tasks here'
                  : 'Nothing to do right now'}
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
                    mode={mode}
                    selected={selectedIds.has(task.id)}
                    onToggleSelect={handleToggleSelect}
                    onToggle={handleToggleTask}
                    onHide={handleHideTask}
                    onDelete={handleDeleteTask}
                    onEdit={setEditingTask}
                    showAssignee={isAdminAll}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingTask && !isClient && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        title="Delete task"
        description="Permanently delete this task? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteTask}
      />

      <ConfirmDialog
        open={pendingBulkDelete}
        onOpenChange={(open) => !open && setPendingBulkDelete(false)}
        title={`Delete ${selectedIds.size} task${selectedIds.size === 1 ? '' : 's'}?`}
        description="Permanently delete the selected tasks? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
