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
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import { Plus, Search, X, Check, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';

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
  totalCount,
  doneCount,
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
  return (
    <header className="mb-6">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Tasks{' '}
        <span className="mx-1 text-border" aria-hidden>
          /
        </span>{' '}
        {role === 'admin' ? 'workspace' : 'yours'}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-foreground">
            {activeCount} open
          </span>
          <div className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {totalCount} total{' '}
            <span className="mx-1 opacity-40" aria-hidden>
              /
            </span>{' '}
            <span className="text-emerald-600 dark:text-emerald-400">{doneCount} done</span>{' '}
            <span className="mx-1 opacity-40" aria-hidden>
              /
            </span>{' '}
            {blockedCount > 0 && (
              <span className="text-red-600 dark:text-red-400">{blockedCount} blocked</span>
            )}
            {blockedCount === 0 && <span className="text-muted-foreground/60">0 blocked</span>}
          </div>
        </div>
        {!isClient && (
          <Button onClick={onNewTask} size="sm" className="h-9 gap-1.5 rounded-lg">
            <Plus className="size-4" />
            New task
          </Button>
        )}
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
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              'h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-all duration-200',
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
          className="h-9 pl-9 text-sm"
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
  mode,
}: {
  task: Task;
  isClient: boolean;
  canManage: boolean;
  onToggle: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHide: (taskId: string) => void;
  mode: QualiaTasksMode;
}) {
  const isCompleted = task.status === 'Done';
  const priorityColors = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];
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

  // Client dot — derive a hue from the project or assignee name
  const clientName = task.project?.name ?? null;
  const hasBlocker = task.status === 'In Progress' && task.priority === 'Urgent';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b border-border px-4 py-3 transition-colors duration-150',
        'hover:bg-muted/50',
        isCompleted && 'opacity-55',
        'motion-reduce:transition-none'
      )}
      role="row"
    >
      {/* Checkbox */}
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

      {/* Priority dot */}
      {task.priority !== 'No Priority' && (
        <span
          aria-label={`Priority: ${task.priority}`}
          className={cn('size-2 shrink-0 rounded-full', priorityColors.text)}
          style={{ backgroundColor: 'currentColor' }}
        />
      )}

      {/* Title + subline */}
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
        ) : (
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
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {clientName && (
            <>
              <span className="inline-block size-1.5 rounded-full bg-primary/60" aria-hidden />
              <span className="truncate">{clientName}</span>
            </>
          )}
          {task.assignee?.full_name && (
            <>
              <span className="opacity-40" aria-hidden>
                /
              </span>
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

      {/* Status chip */}
      <span
        className={cn(
          'hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline-flex',
          statusStyle
        )}
      >
        {task.status}
      </span>

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

  return (
    <div className="mx-auto w-full max-w-[820px] p-6 lg:p-8">
      {/* Scope toggle for admin */}
      {isAdmin && !isClient && (
        <div className="mb-4 flex w-fit items-center gap-0.5 self-start rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            className={cn(
              'h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-150',
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
              'h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-150',
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

      {/* Inline composer */}
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

      {/* Task list */}
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card',
          isPending && 'opacity-70 transition-opacity duration-200'
        )}
        role="table"
        aria-label="Task list"
      >
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-16">
            <p className="text-center text-sm italic text-muted-foreground">Nothing here. Nice.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="flex items-center">
              {isAdminAll && (
                <div className="flex shrink-0 items-center pl-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => handleToggleSelect(task.id)}
                    aria-label={
                      selectedIds.has(task.id)
                        ? `Deselect "${task.title}"`
                        : `Select "${task.title}"`
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
                  onToggle={handleToggleTask}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  onHide={handleHideTask}
                  mode={mode}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editingTask && canManage && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

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
