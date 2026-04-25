'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Target,
  Clock,
  X,
  Calendar as CalendarIcon,
  User,
  Flag,
  Zap,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditTaskModal } from '@/components/edit-task-modal';
import { cn } from '@/lib/utils';
import { quickUpdateTask, createTask, deleteTask, type Task } from '@/app/actions/inbox';
import {
  useTodaysTasks,
  useInboxTasks,
  invalidateInboxTasks,
  invalidateDailyFlow,
} from '@/lib/swr';

export type QualiaTasksMode = 'inbox' | 'all-tasks';

interface QualiaTasksViewProps {
  mode: QualiaTasksMode;
  initialTasks: Task[];
  userRole: 'admin' | 'employee';
  isAdmin?: boolean;
}

type LocalOverride = { status?: Task['status']; completed_at?: string | null; deleted?: boolean };

function priorityKey(p: Task['priority']): 'high' | 'medium' | 'low' {
  if (p === 'Urgent' || p === 'High') return 'high';
  if (p === 'Medium') return 'medium';
  return 'low';
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function dueLabel(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
    return 'Tomorrow';
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (days >= 0 && days < 7) {
    return d.toLocaleDateString('en-GB', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Apply optimistic overrides to a task list, dropping deleted items. */
function applyOverrides(tasks: Task[], overrides: Map<string, LocalOverride>): Task[] {
  if (overrides.size === 0) return tasks;
  return tasks.flatMap((t) => {
    const ov = overrides.get(t.id);
    if (!ov) return [t];
    if (ov.deleted) return [];
    return [
      {
        ...t,
        status: ov.status ?? t.status,
        completed_at: ov.completed_at !== undefined ? ov.completed_at : t.completed_at,
      },
    ];
  });
}

export function QualiaTasksView({ mode, initialTasks, userRole, isAdmin }: QualiaTasksViewProps) {
  const canManage = userRole === 'admin' || userRole === 'employee';
  const isAdminUser = !!isAdmin || userRole === 'admin';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [isPending, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Map<string, LocalOverride>>(new Map());
  const [recentlyToggled, setRecentlyToggled] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  // Pulse the row briefly so the user gets immediate visual confirmation.
  const flashRow = useCallback((id: string) => {
    setRecentlyToggled((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    window.setTimeout(() => {
      setRecentlyToggled((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  }, []);

  const { tasks: todaysTasksRaw } = useTodaysTasks();
  const todaysTasks = useMemo<Task[]>(
    () => applyOverrides((todaysTasksRaw as Task[]) ?? [], overrides),
    [todaysTasksRaw, overrides]
  );

  const inbox = useInboxTasks();
  const inboxTasks = useMemo<Task[]>(() => {
    const live = (inbox.tasks as Task[]) ?? [];
    const base = live.length > 0 ? live : initialTasks;
    return applyOverrides(base, overrides);
  }, [inbox.tasks, initialTasks, overrides]);

  // Today's open + completed — both sourced from todaysTasks so the row stays
  // visible after the optimistic toggle (inbox query filters by status='Todo'
  // and would otherwise drop completed items immediately).
  const todayOpen = useMemo(
    () => todaysTasks.filter((t) => t.status !== 'Done'),
    [todaysTasks]
  );
  const completedToday = useMemo(
    () =>
      todaysTasks.filter((t) => t.status === 'Done' && (isToday(t.completed_at) || true)),
    [todaysTasks]
  );

  const todayIds = useMemo(() => new Set(todaysTasks.map((t) => t.id)), [todaysTasks]);
  const upcoming = useMemo(
    () =>
      inboxTasks
        .filter((t) => t.status !== 'Done' && !todayIds.has(t.id))
        .slice(0, 8),
    [inboxTasks, todayIds]
  );

  const weekDoneCount = useMemo(() => {
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 86_400_000);
    return [...inboxTasks, ...todaysTasks].filter(
      (t, i, arr) =>
        arr.findIndex((x) => x.id === t.id) === i &&
        t.status === 'Done' &&
        t.completed_at &&
        new Date(t.completed_at) >= sevenAgo
    ).length;
  }, [inboxTasks, todaysTasks]);

  // Real toggle — sets optimistic override, fires server action, clears
  // override on success after revalidation. Toast on error and rollback.
  const handleToggle = useCallback(
    (task: Task) => {
      const nextStatus: Task['status'] = task.status === 'Done' ? 'Todo' : 'Done';
      const nextCompletedAt = nextStatus === 'Done' ? new Date().toISOString() : null;

      // Optimistic
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(task.id, { status: nextStatus, completed_at: nextCompletedAt });
        return next;
      });
      flashRow(task.id);

      startTransition(async () => {
        const r = await quickUpdateTask(task.id, { status: nextStatus });
        if (!r.success) {
          // Rollback override
          setOverrides((prev) => {
            const next = new Map(prev);
            next.delete(task.id);
            return next;
          });
          toast.error(r.error || 'Failed to update task');
          return;
        }
        // Refresh real data, then drop our local override.
        await Promise.all([invalidateInboxTasks(), invalidateDailyFlow()]);
        window.setTimeout(() => {
          setOverrides((prev) => {
            const next = new Map(prev);
            next.delete(task.id);
            return next;
          });
        }, 800);
      });
    },
    [flashRow]
  );

  const handleQuickAdd = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const title = quickAdd.trim();
      if (!title) return;
      const fd = new FormData();
      fd.append('title', title);
      fd.append('priority', 'Medium');
      startTransition(async () => {
        const r = await createTask(fd);
        if (!r.success) {
          toast.error(r.error || 'Failed to create task');
          return;
        }
        setQuickAdd('');
        toast.success('Task added');
        await Promise.all([invalidateInboxTasks(), invalidateDailyFlow()]);
      });
    },
    [quickAdd]
  );

  const handleDelete = useCallback(() => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    // Optimistic delete
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(target.id, { deleted: true });
      return next;
    });
    setPendingDelete(null);
    if (selectedTask?.id === target.id) setSelectedTask(null);

    startTransition(async () => {
      const r = await deleteTask(target.id);
      if (!r.success) {
        setOverrides((prev) => {
          const next = new Map(prev);
          next.delete(target.id);
          return next;
        });
        toast.error(r.error || 'Failed to delete task');
        return;
      }
      toast.success(`Deleted "${target.title}"`);
      await Promise.all([invalidateInboxTasks(), invalidateDailyFlow()]);
      window.setTimeout(() => {
        setOverrides((prev) => {
          const next = new Map(prev);
          next.delete(target.id);
          return next;
        });
      }, 800);
    });
  }, [pendingDelete, selectedTask]);

  // Keep the detail panel showing the freshest version of the selected task.
  useEffect(() => {
    if (!selectedTask) return;
    const fresh = [...todaysTasks, ...inboxTasks].find((t) => t.id === selectedTask.id);
    if (fresh && fresh !== selectedTask) {
      setSelectedTask(fresh);
    }
  }, [selectedTask, todaysTasks, inboxTasks]);

  const headerSubtitle = useMemo(() => {
    return `${todayOpen.length} task${todayOpen.length === 1 ? '' : 's'} · ${weekDoneCount} done · 7d`;
  }, [todayOpen.length, weekDoneCount]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden p-6 transition-all duration-300 lg:p-8',
          selectedTask && 'lg:pr-0'
        )}
      >
        {/* Header */}
        <div className="mb-5 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === 'all-tasks' ? 'Workspace tasks' : "Today's Focus"}
              </h1>
              <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
          </div>

          <Button
            size="sm"
            className="h-9 gap-2 rounded-xl"
            onClick={() => document.getElementById('quick-add-input')?.focus()}
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Quick Add */}
        <div className="mb-5 flex-shrink-0">
          <div className="relative">
            <Zap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              id="quick-add-input"
              placeholder="Quick add task… press Enter"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={handleQuickAdd}
              disabled={isPending}
              className="h-11 rounded-xl border-border bg-card pl-11"
            />
          </div>
        </div>

        {/* Body grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-3">
          {/* Left: today's tasks + completed */}
          <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {todayOpen.length === 0 && completedToday.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Nothing scoped for today. Use Quick Add above to capture work.
                </div>
              ) : (
                todayOpen.map((task) => {
                  const pk = priorityKey(task.priority);
                  const projectName = task.project?.name ?? null;
                  const isFlashing = recentlyToggled.has(task.id);
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      pk={pk}
                      projectName={projectName}
                      onToggle={handleToggle}
                      onSelect={() => setSelectedTask(task)}
                      isSelected={selectedTask?.id === task.id}
                      isFlashing={isFlashing}
                    />
                  );
                })
              )}

              {completedToday.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Completed ({completedToday.length})
                  </p>
                  <div className="space-y-1.5">
                    {completedToday.map((task) => {
                      const completedTime = task.completed_at
                        ? new Date(task.completed_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            'group flex cursor-pointer items-center gap-4 rounded-lg p-3 transition-all duration-200 hover:bg-muted/30',
                            recentlyToggled.has(task.id) &&
                              'bg-emerald-500/10 ring-2 ring-emerald-500/40'
                          )}
                          onClick={() => setSelectedTask(task)}
                        >
                          <Checkbox
                            checked
                            onCheckedChange={() => handleToggle(task)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5 rounded-full border-2"
                            aria-label={`Reopen ${task.title}`}
                          />
                          <span className="flex-1 truncate text-sm text-muted-foreground line-through">
                            {task.title}
                          </span>
                          <span className="text-xs text-muted-foreground">{completedTime}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="grid flex-shrink-0 grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Today
                </p>
                <p className="text-2xl font-bold tabular-nums">{todayOpen.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Done · 7d
                </p>
                <p className="text-2xl font-bold tabular-nums">{weekDoneCount}</p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                <h3 className="text-sm font-semibold">Coming Up</h3>
                {upcoming.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {upcoming.length}
                  </Badge>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {upcoming.length === 0 ? (
                  <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                    Inbox clear. Nothing waiting for you.
                  </p>
                ) : (
                  upcoming.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        'cursor-pointer rounded-lg bg-muted/30 p-3 transition-all hover:bg-muted/50',
                        selectedTask?.id === task.id && 'bg-primary/10 ring-1 ring-primary/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                        {task.due_date && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {dueLabel(task.due_date)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <WeekProgress tasks={[...inboxTasks, ...todaysTasks]} />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <aside className="hidden w-[380px] flex-col border-l border-border bg-card/50 lg:flex">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Task Details</h2>
            <div className="flex items-center gap-1">
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingTask(selectedTask)}
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {isAdminUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  onClick={() => setPendingDelete(selectedTask)}
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedTask(null)}
                aria-label="Close detail panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'capitalize text-xs',
                  priorityKey(selectedTask.priority) === 'high' &&
                    'border-red-500/30 bg-red-500/10 text-red-400',
                  priorityKey(selectedTask.priority) === 'medium' &&
                    'border-amber-500/30 bg-amber-500/10 text-amber-400',
                  priorityKey(selectedTask.priority) === 'low' &&
                    'border-blue-500/30 bg-blue-500/10 text-blue-400'
                )}
              >
                {selectedTask.priority}
              </Badge>
              {selectedTask.due_date && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {dueLabel(selectedTask.due_date)}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  selectedTask.status === 'Done' &&
                    'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                )}
              >
                {selectedTask.status}
              </Badge>
            </div>

            <h3 className="mb-4 text-lg font-semibold">{selectedTask.title}</h3>

            <div className="space-y-4 text-sm">
              {selectedTask.assignee && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Assignee</span>
                  <span>{selectedTask.assignee.full_name ?? selectedTask.assignee.email}</span>
                </div>
              )}
              {selectedTask.project && (
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Project</span>
                  <span className="text-primary">{selectedTask.project.name}</span>
                </div>
              )}
              {selectedTask.due_date && (
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="w-16 text-muted-foreground">Due</span>
                  <span>
                    {new Date(selectedTask.due_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {selectedTask.description && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedTask.description}
                </p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-border p-4">
            <Button
              className={cn(
                'h-10 w-full gap-2 rounded-xl transition-all duration-200',
                selectedTask.status === 'Done' &&
                  'bg-emerald-500 text-white hover:bg-emerald-500/90'
              )}
              disabled={isPending}
              onClick={() => handleToggle(selectedTask)}
            >
              <ChevronRight className="h-4 w-4" />
              {selectedTask.status === 'Done' ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
          </div>
        </aside>
      )}

      {editingTask && canManage && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this task?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently deleted.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function TaskRow({
  task,
  pk,
  projectName,
  onToggle,
  onSelect,
  isSelected,
  isFlashing,
}: {
  task: Task;
  pk: 'high' | 'medium' | 'low';
  projectName: string | null;
  onToggle: (t: Task) => void;
  onSelect: () => void;
  isSelected: boolean;
  isFlashing: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4',
        'transition-all duration-200 hover:border-primary/30 active:scale-[0.99]',
        isSelected && 'border-primary/50 bg-primary/5',
        isFlashing && 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_16px_-4px_var(--primary)]'
      )}
    >
      <Checkbox
        checked={task.status === 'Done'}
        onCheckedChange={() => onToggle(task)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'h-5 w-5 flex-shrink-0 rounded-full border-2 transition-transform duration-150',
          'data-[state=checked]:scale-110 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500'
        )}
        aria-label={`Mark ${task.title} ${task.status === 'Done' ? 'incomplete' : 'done'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', task.status === 'Done' && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        {projectName && (
          <p className="mt-0.5 text-sm text-primary/70">{projectName}</p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {dueLabel(task.due_date)}
          </span>
        )}
        <Flag
          className={cn(
            'h-3.5 w-3.5',
            pk === 'high'
              ? 'text-red-500'
              : pk === 'medium'
                ? 'text-amber-500'
                : 'text-muted-foreground/50'
          )}
          aria-label={`${task.priority} priority`}
        />
      </div>
    </div>
  );
}

function WeekProgress({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    const now = new Date();
    const buckets = new Array(7).fill(0);
    const seen = new Set<string>();
    for (const t of tasks) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      if (t.status !== 'Done' || !t.completed_at) continue;
      const c = new Date(t.completed_at);
      const diffDays = Math.floor((now.getTime() - c.getTime()) / 86_400_000);
      if (diffDays >= 0 && diffDays < 7) {
        buckets[6 - diffDays] += 1;
      }
    }
    return buckets;
  }, [tasks]);

  const max = Math.max(1, ...counts);

  return (
    <div className="flex-shrink-0 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
      <p className="mb-2 text-sm font-medium">Weekly Progress</p>
      <div className="flex h-8 items-end gap-1">
        {counts.map((c, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm transition-all duration-300',
              i === counts.length - 1 ? 'bg-primary' : 'bg-primary/30'
            )}
            style={{ height: `${(c / max) * 100 || 4}%` }}
            title={`${c} done`}
          />
        ))}
      </div>
    </div>
  );
}
