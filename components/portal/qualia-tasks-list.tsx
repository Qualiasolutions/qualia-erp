'use client';

import React, {
  useTransition,
  useState,
  useOptimistic,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import {
  quickUpdateTask,
  toggleTaskInbox,
  createTask,
  deleteTask,
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
import { TaskDetailDialog } from '@/components/portal/task-detail-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  X,
  Check,
  UserPlus,
  Trash2,
  CheckCircle2,
  Target,
  Zap,
  Clock,
  Flag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

/* ======================================================================
   Types
   ====================================================================== */

export type QualiaTasksMode = 'inbox' | 'all-tasks' | 'client';

export interface QualiaTasksListProps {
  mode: QualiaTasksMode;
  initialTasks: Task[];
  userRole: 'admin' | 'employee' | 'client';
  isAdmin?: boolean;
  assignableMembers?: Array<{ id: string; full_name: string | null; email: string | null }>;
}

/* ======================================================================
   Optimistic reducer (reuse same pattern from existing tasks-view)
   ====================================================================== */

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
              status: action.completed ? ('Done' as const) : ('Todo' as const),
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
      return state.map((t) =>
        ids.has(t.id) ? { ...t, status: 'Done' as const, completed_at: now } : t
      );
    }
    case 'add':
      return [action.task, ...state];
    default:
      return state;
  }
}

/* ======================================================================
   Status color map (per design handoff)
   ====================================================================== */

const STATUS_CHIP_STYLES: Record<string, string> = {
  Todo: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  'In Progress': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  Done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Blocked: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  Review: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
};

/* ======================================================================
   TasksHeader
   ====================================================================== */

function TasksHeader({
  role,
  activeCount,
  blockedCount,
  onNewTask,
  isClient,
}: {
  role: string;
  activeCount: number;
  totalCount: number;
  doneCount: number;
  blockedCount: number;
  onNewTask: () => void;
  isClient: boolean;
}) {
  // Estimate ~1.5h per task for the subtitle
  const estimatedHours = Math.max(1, Math.round(activeCount * 1.5));

  return (
    <header className="mb-5 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {role === 'admin' ? 'Workspace Tasks' : 'Today’s Focus'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} task{activeCount !== 1 ? 's' : ''} &middot; ~{estimatedHours}h estimated
              {blockedCount > 0 && (
                <span className="ml-2 text-red-600 dark:text-red-400">
                  &middot; {blockedCount} blocked
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isClient && (
            <Button onClick={onNewTask} className="h-10 gap-2 rounded-xl px-4">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ======================================================================
   TasksFilterBar
   ====================================================================== */

type FilterTab = 'active' | 'done' | 'all';

function TasksFilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  activeCount,
  doneCount,
  allCount,
  isClient,
}: {
  filter: FilterTab;
  onFilterChange: (f: FilterTab) => void;
  search: string;
  onSearchChange: (s: string) => void;
  activeCount: number;
  doneCount: number;
  allCount: number;
  isClient: boolean;
}) {
  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'done', label: 'Done', count: doneCount },
    ...(isClient ? [] : [{ key: 'all' as FilterTab, label: 'All', count: allCount }]),
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/30 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              'h-8 cursor-pointer rounded-lg px-3 text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
              filter === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            aria-pressed={filter === tab.key}
          >
            {tab.label}{' '}
            <span className="ml-1 font-mono text-[11px] tabular-nums opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 rounded-xl pl-9 text-sm"
          aria-label="Search tasks"
        />
      </div>
    </div>
  );
}

/* ======================================================================
   TaskInlineComposer
   ====================================================================== */

function TaskInlineComposer({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, priority: string) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('No Priority');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Small delay to allow the DOM to render before focusing
      const timeout = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed, priority);
    setTitle('');
    setPriority('No Priority');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 transition-all duration-200 motion-reduce:transition-none">
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        className="h-8 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
        aria-label="New task title"
      />
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="h-8 w-28 text-xs" aria-label="Task priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Urgent">Urgent</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="No Priority">None</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-8"
        onClick={handleSubmit}
        disabled={!title.trim() || isPending}
      >
        Add
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label="Close composer"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/* ======================================================================
   TaskRow
   ====================================================================== */

const TaskRow = React.memo(function TaskRow({
  task,
  isClient,
  canManage,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  onOpenDetail,
  mode,
}: {
  task: Task;
  isClient: boolean;
  canManage: boolean;
  onToggle: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHide: (taskId: string) => void;
  onOpenDetail: (task: Task) => void;
  mode: QualiaTasksMode;
}) {
  const isCompleted = task.status === 'Done';
  const statusStyle = STATUS_CHIP_STYLES[task.status] ?? STATUS_CHIP_STYLES['Todo'];

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  const handleDoubleClick = () => {
    if (isClient) return;
    setEditValue(task.title);
    setEditing(true);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== task.title) {
        quickUpdateTask(task.id, { title: trimmed }).then((res) => {
          if (!res.success) toast.error(res.error ?? 'Failed to rename');
          invalidateInboxTasks(true);
        });
      }
      setEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(task.title);
      setEditing(false);
    }
  };

  const clientName = task.project?.name ?? null;
  const hasBlocker = task.status === 'In Progress' && task.priority === 'Urgent';

  // Priority flag color mapping per v0 design
  const priorityFlagColor =
    task.priority === 'Urgent'
      ? 'text-red-500'
      : task.priority === 'High'
        ? 'text-red-500'
        : task.priority === 'Medium'
          ? 'text-amber-500'
          : 'text-muted-foreground/50';

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-150',
        'hover:border-primary/30',
        isCompleted && 'opacity-50',
        'motion-reduce:transition-none'
      )}
      role="row"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, a, [role="menu"], [role="dialog"]'))
          return;
        if (window.getSelection()?.toString()) return;
        onOpenDetail(task);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if ((e.target as HTMLElement).closest('button, input, a, [role="menu"], [role="dialog"]'))
          return;
        e.preventDefault();
        onOpenDetail(task);
      }}
    >
      {/* Checkbox — rounded circle */}
      <button
        type="button"
        onClick={() => !isClient && onToggle(task.id, !isCompleted)}
        disabled={isClient}
        className={cn(
          'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
          isCompleted
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/10',
          isClient && 'cursor-default opacity-60'
        )}
        aria-label={isCompleted ? `Mark "${task.title}" as todo` : `Mark "${task.title}" as done`}
        tabIndex={0}
      >
        {isCompleted && <Check className="size-3" strokeWidth={3} />}
      </button>

      {/* Title + project subtitle */}
      <div className="min-w-0 flex-1" role="cell">
        {editing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={() => setEditing(false)}
            className="w-full rounded border border-primary/30 bg-transparent px-1.5 py-0.5 text-sm font-medium text-foreground outline-none"
            aria-label="Edit task title"
          />
        ) : canManage ? (
          <div
            onDoubleClick={handleDoubleClick}
            className={cn(
              'truncate text-sm font-medium',
              isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
            )}
            title={task.title}
          >
            {task.title}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDetail(task)}
            className={cn(
              'w-full cursor-pointer truncate rounded text-left text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isCompleted
                ? 'text-muted-foreground line-through'
                : 'text-foreground hover:text-primary'
            )}
            title={task.title}
            aria-label={`View details for "${task.title}"`}
          >
            {task.title}
          </button>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {clientName && (
            <>
              <span className="inline-block size-1.5 rounded-full bg-primary/60" aria-hidden />
              <span className="truncate text-primary/70">{clientName}</span>
            </>
          )}
          {task.assignee?.full_name && (
            <>
              {clientName && (
                <span className="opacity-40" aria-hidden>
                  /
                </span>
              )}
              <span className="truncate">{task.assignee.full_name}</span>
            </>
          )}
          {hasBlocker && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              Blocker
            </span>
          )}
        </div>
      </div>

      {/* Right-side chips: status, time, priority flag, actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Status chip */}
        <span
          className={cn(
            'hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-flex',
            statusStyle
          )}
        >
          {task.status}
        </span>

        {/* Time chip with Clock icon (if due date is set) */}
        {task.due_date && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Clock className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}

        {/* Priority flag */}
        {task.priority !== 'No Priority' && (
          <Flag
            className={cn('h-3.5 w-3.5 shrink-0', priorityFlagColor)}
            aria-label={`Priority: ${task.priority}`}
          />
        )}

        {/* Actions — visible on hover/focus for non-readonly */}
        {!isClient && canManage && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Edit "${task.title}"`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {mode === 'inbox' && (
              <button
                type="button"
                onClick={() => onHide(task.id)}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={`Remove "${task.title}" from inbox`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Delete "${task.title}"`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

/* ======================================================================
   BulkToolbar (admin all-tasks mode)
   ====================================================================== */

function BulkToolbar({
  selectedCount,
  assignableMembers,
  onBulkAssign,
  onBulkDone,
  onBulkDelete,
  onClear,
  isPending,
}: {
  selectedCount: number;
  assignableMembers: Array<{ id: string; full_name: string | null; email: string | null }>;
  onBulkAssign: (assigneeId: string | null) => void;
  onBulkDone: () => void;
  onBulkDelete: () => void;
  onClear: () => void;
  isPending: boolean;
}) {
  const [bulkAssignee, setBulkAssignee] = useState<string>('');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
      <div className="flex items-center gap-2">
        <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
          <SelectTrigger className="h-8 w-44 text-xs">
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
          onClick={() => {
            if (!bulkAssignee) return;
            onBulkAssign(bulkAssignee === '__unassign__' ? null : bulkAssignee);
            setBulkAssignee('');
          }}
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
        onClick={onBulkDone}
        disabled={isPending}
      >
        <CheckCircle2 className="size-3.5" />
        Mark done
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-destructive hover:text-destructive"
        onClick={onBulkDelete}
        disabled={isPending}
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-8 text-muted-foreground"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  );
}

/* ======================================================================
   TaskListContainer — virtualized scroll surface with skeleton + empty
   ====================================================================== */

type TaskListContainerProps = {
  isPending: boolean;
  tasks: Task[];
  isAdminAll: boolean;
  isClient: boolean;
  canManage: boolean;
  mode: QualiaTasksMode;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggle: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHide: (taskId: string) => void;
  onOpenDetail: (task: Task) => void;
  isLoadingFirst: boolean;
};

const VIRTUAL_THRESHOLD = 50;
const ROW_ESTIMATE = 68;

function TaskListContainer({
  isPending,
  tasks,
  isAdminAll,
  isClient,
  canManage,
  mode,
  selectedIds,
  onToggleSelect,
  onToggle,
  onEdit,
  onDelete,
  onHide,
  onOpenDetail,
  isLoadingFirst,
}: TaskListContainerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: tasks.length,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const useVirtual = tasks.length >= VIRTUAL_THRESHOLD;

  // Skeleton on first load
  if (isLoadingFirst) {
    return (
      <div className="space-y-2" aria-live="polite" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="size-5 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="h-5 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
        <span className="sr-only">Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card" role="table" aria-label="Task list">
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No tasks match the current filter."
          compact
          minimal
        />
      </div>
    );
  }

  const renderRow = (task: Task) => (
    <div className="flex items-center">
      {isAdminAll && (
        <div className="mr-3 flex shrink-0 items-center">
          <input
            type="checkbox"
            checked={selectedIds.has(task.id)}
            onChange={() => onToggleSelect(task.id)}
            aria-label={
              selectedIds.has(task.id) ? `Deselect "${task.title}"` : `Select "${task.title}"`
            }
            className="size-4 rounded border-muted-foreground/40 text-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <TaskRow
          task={task}
          isClient={isClient}
          canManage={canManage}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onHide={onHide}
          onOpenDetail={onOpenDetail}
          mode={mode}
        />
      </div>
    </div>
  );

  if (!useVirtual) {
    return (
      <div
        className={cn('space-y-2', isPending && 'opacity-70 transition-opacity duration-200')}
        role="table"
        aria-label="Task list"
      >
        {tasks.map((task) => (
          <div key={task.id}>{renderRow(task)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const offsetTop = virtualItems[0]?.start ?? 0;
  const scrollOffset = virtualizer.options.scrollMargin;

  return (
    <div
      ref={listRef}
      className={cn('space-y-2', isPending && 'opacity-70 transition-opacity duration-200')}
      role="table"
      aria-label="Task list"
      aria-rowcount={tasks.length}
      style={{ minHeight: totalSize }}
    >
      <div style={{ height: totalSize, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetTop - scrollOffset}px)`,
          }}
        >
          {virtualItems.map((v) => {
            const task = tasks[v.index];
            if (!task) return null;
            return (
              <div
                key={task.id}
                data-index={v.index}
                ref={virtualizer.measureElement}
                aria-rowindex={v.index + 1}
              >
                {renderRow(task)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   QualiaTasksList — main export
   ====================================================================== */

export function QualiaTasksList({
  mode,
  initialTasks,
  userRole,
  isAdmin = false,
  assignableMembers = [],
}: QualiaTasksListProps) {
  const router = useRouter();
  const canManage = userRole === 'admin';
  const isClient = mode === 'client';
  const [isPending, startTransition] = useTransition();

  // SWR + realtime for inbox mode
  const inboxLive = useInboxTasks();
  const { workspaceId } = useCurrentWorkspaceId();
  useRealtimeTasks(mode === 'inbox' ? (workspaceId ?? null) : null);

  const baseTasks =
    mode === 'inbox' && inboxLive.tasks.length > 0 ? (inboxLive.tasks as Task[]) : initialTasks;
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(baseTasks, tasksReducer);

  // UI state
  const [filter, setFilter] = useState<FilterTab>('active');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAdminAll = mode === 'all-tasks';

  // Stats
  const stats = useMemo(() => {
    const active = optimisticTasks.filter((t) => t.status !== 'Done').length;
    const done = optimisticTasks.filter((t) => t.status === 'Done').length;
    const blocked = optimisticTasks.filter(
      (t) => t.status === 'In Progress' && t.priority === 'Urgent'
    ).length;
    return { active, done, total: optimisticTasks.length, blocked };
  }, [optimisticTasks]);

  // Filtered + sorted
  const filteredTasks = useMemo(() => {
    let tasks = optimisticTasks;

    // Filter by tab
    if (filter === 'active') {
      tasks = tasks.filter((t) => t.status !== 'Done');
    } else if (filter === 'done') {
      tasks = tasks.filter((t) => t.status === 'Done');
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.project?.name?.toLowerCase().includes(q) ||
          t.assignee?.full_name?.toLowerCase().includes(q)
      );
    }

    // Sort: most-recent-first by created_at
    return [...tasks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [optimisticTasks, filter, search]);

  // Drop selections that no longer exist
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredTasks.map((t) => t.id));
    const next = new Set<string>();
    let changed = false;
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id);
      else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredTasks, selectedIds]);

  /* ---- Handlers ---- */

  const handleCreateTask = useCallback(
    (title: string, priority: string) => {
      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title,
        status: 'Todo',
        priority: priority as Task['priority'],
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

      startTransition(async () => {
        dispatchOptimistic({ type: 'add', task: tempTask });

        const formData = new FormData();
        formData.set('title', title);
        formData.set('status', 'Todo');
        formData.set('priority', priority);
        formData.set('show_in_inbox', 'true');

        const result = await createTask(formData);
        if (!result.success) toast.error(result.error ?? 'Failed to create task');
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
        router.refresh();
      });
    },
    [router, dispatchOptimistic]
  );

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

  // Bulk actions
  const handleBulkAssign = useCallback(
    (assigneeId: string | null) => {
      if (selectedIds.size === 0) return;
      const ids = Array.from(selectedIds);
      startTransition(async () => {
        const result = await bulkAssignTasks(ids, assigneeId);
        if (!result.success) {
          toast.error(result.error ?? 'Failed to assign tasks');
          return;
        }
        const count = (result.data as { count?: number } | undefined)?.count ?? ids.length;
        toast.success(`Reassigned ${count} task${count === 1 ? '' : 's'}`);
        setSelectedIds(new Set());
        router.refresh();
      });
    },
    [selectedIds, router]
  );

  const handleBulkDone = useCallback(() => {
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
  }, [selectedIds, router, dispatchOptimistic]);

  const confirmBulkDelete = useCallback(() => {
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
  }, [selectedIds, router, dispatchOptimistic]);

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  /* ---- Keyboard shortcut: Cmd+N to open composer ---- */
  useEffect(() => {
    if (isClient) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setComposerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClient]);

  // Split tasks into active and completed for the v0 layout
  const activeTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'Done'),
    [filteredTasks]
  );
  const completedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'Done'),
    [filteredTasks]
  );

  // Upcoming tasks: tasks with due dates in the future (for the right rail)
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return optimisticTasks
      .filter((t) => t.status !== 'Done' && t.due_date && new Date(t.due_date) > now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
  }, [optimisticTasks]);

  // Quick-add input state
  const [quickAddValue, setQuickAddValue] = useState('');
  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const trimmed = quickAddValue.trim();
      if (!trimmed) return;
      handleCreateTask(trimmed, 'No Priority');
      setQuickAddValue('');
    },
    [quickAddValue, handleCreateTask]
  );

  // Show the 3-col grid layout for inbox mode, flat list for admin-all/client
  const showGridLayout = mode === 'inbox';

  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden p-6 lg:p-8">
      {/* Scope toggle for admin */}
      {isAdmin && !isClient && (
        <div className="mb-4 flex w-fit items-center gap-0.5 self-start rounded-xl border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            className={cn(
              'h-8 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              mode !== 'all-tasks'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            aria-pressed={mode !== 'all-tasks'}
          >
            Mine
          </button>
          <button
            type="button"
            onClick={() => router.push('/tasks?scope=all')}
            className={cn(
              'h-8 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              mode === 'all-tasks'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            aria-pressed={mode === 'all-tasks'}
          >
            All
          </button>
        </div>
      )}

      <TasksHeader
        role={userRole}
        activeCount={stats.active}
        totalCount={stats.total}
        doneCount={stats.done}
        blockedCount={stats.blocked}
        onNewTask={() => setComposerOpen(true)}
        isClient={isClient}
      />

      {/* Quick add bar — v0 style with Zap icon */}
      {!isClient && (
        <div className="mb-5 flex-shrink-0">
          <div className="relative">
            <Zap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder="Quick add task... press Enter"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              className="h-11 rounded-xl border-border bg-card pl-11"
              aria-label="Quick add task"
            />
          </div>
        </div>
      )}

      <TasksFilterBar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        activeCount={stats.active}
        doneCount={stats.done}
        allCount={stats.total}
        isClient={isClient}
      />

      {/* Inline composer (expanded) */}
      {!isClient && (
        <TaskInlineComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleCreateTask}
          isPending={isPending}
        />
      )}

      {/* Bulk toolbar for admin all-tasks */}
      {isAdminAll && selectedIds.size > 0 && (
        <BulkToolbar
          selectedCount={selectedIds.size}
          assignableMembers={assignableMembers}
          onBulkAssign={handleBulkAssign}
          onBulkDone={handleBulkDone}
          onBulkDelete={() => setPendingBulkDelete(true)}
          onClear={() => setSelectedIds(new Set())}
          isPending={isPending}
        />
      )}

      {/* Main content — grid layout for inbox, flat for admin-all/client */}
      {showGridLayout ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-3">
          {/* Left column — task list (2 cols wide) */}
          <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Active tasks */}
              <TaskListContainer
                isPending={isPending}
                tasks={filter === 'done' ? filteredTasks : activeTasks}
                isAdminAll={isAdminAll}
                isClient={isClient}
                canManage={canManage}
                mode={mode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggle={handleToggleTask}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onHide={handleHideTask}
                onOpenDetail={setDetailTask}
                isLoadingFirst={
                  mode === 'inbox' &&
                  initialTasks.length === 0 &&
                  inboxLive.tasks.length === 0 &&
                  inboxLive.isValidating
                }
              />

              {/* Completed section — only show in active/all filter when there are completed tasks */}
              {filter !== 'done' && completedTasks.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Completed ({completedTasks.length})
                  </p>
                  <div className="space-y-1">
                    {completedTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex cursor-pointer items-center gap-4 rounded-lg p-3 opacity-50 transition-colors hover:bg-muted/30"
                        onClick={() => setDetailTask(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetailTask(task);
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTask(task.id, false);
                          }}
                          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          aria-label={`Mark "${task.title}" as todo`}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </button>
                        <span className="flex-1 truncate text-sm text-muted-foreground line-through">
                          {task.title}
                        </span>
                        {task.completed_at && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(task.completed_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right rail — stats + upcoming */}
          <div className="hidden min-h-0 flex-col gap-4 overflow-hidden lg:flex">
            {/* Stats cards */}
            <div className="grid flex-shrink-0 grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Done</p>
                <p className="text-2xl font-bold">{stats.done}</p>
              </div>
            </div>

            {/* Coming Up */}
            {upcomingTasks.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                  <h3 className="text-sm font-semibold">Coming Up</h3>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {upcomingTasks.map((task) => {
                    const dueDate = new Date(task.due_date!);
                    const now = new Date();
                    const diffDays = Math.ceil(
                      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const dueLabel =
                      diffDays === 0
                        ? 'Today'
                        : diffDays === 1
                          ? 'Tomorrow'
                          : dueDate.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <div
                        key={task.id}
                        className="cursor-pointer rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                        onClick={() => setDetailTask(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetailTask(task);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {dueLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {stats.total > 0 && (
              <div className="flex-shrink-0 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
                <p className="mb-2 text-sm font-medium">Completion Rate</p>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.round((stats.done / stats.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {Math.round((stats.done / stats.total) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Flat layout for admin-all and client modes */
        <div className={cn(mode !== 'all-tasks' && 'mx-auto max-w-[820px]', 'w-full')}>
          <TaskListContainer
            isPending={isPending}
            tasks={filteredTasks}
            isAdminAll={isAdminAll}
            isClient={isClient}
            canManage={canManage}
            mode={mode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggle={handleToggleTask}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
            onHide={handleHideTask}
            onOpenDetail={setDetailTask}
            isLoadingFirst={false}
          />
        </div>
      )}

      {/* Edit modal (admin only) */}
      {editingTask && canManage && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      {/* Employee task detail dialog (non-admin read-only view with done/undone toggle) */}
      <TaskDetailDialog
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(open) => !open && setDetailTask(null)}
        onToggleDone={(taskId, completed) => {
          handleToggleTask(taskId, completed);
          setDetailTask(null);
        }}
        isPending={isPending}
      />

      {/* Delete confirmations */}
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
