'use client';

import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  FolderPlus,
  Zap,
  ClipboardList,
  ChevronRight,
  Circle,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { TaskDetailDialog } from '@/components/task-detail-dialog';
import type { Task as InboxTask } from '@/app/actions/inbox';
import {
  getProjectPhases,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  loadQualiaFrameworkPipeline,
} from '@/app/actions/phases';
import { getProjectTasks, createTask, updateTask, deleteTask } from '@/app/actions/inbox';
import { invalidateProjectPhases, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { toast } from 'sonner';

interface Phase {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sort_order: number;
  is_locked: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  phase_name: string | null;
  sort_order: number;
}

interface ProjectWorkflowProps {
  projectId: string;
  projectType: string | null;
  workspaceId: string;
  className?: string;
}

// Parse milestone groups from phase names like "0.1 — Name" → group "0", "1.5 — Name" → group "1"
function parseMilestoneGroup(name: string): { group: string; label: string } {
  const match = name.match(/^(\d+)\.(\d+)\s*[—–-]\s*/);
  if (match) {
    return { group: match[1], label: `Milestone ${match[1]}` };
  }
  return { group: '_ungrouped', label: 'Phases' };
}

function getStatusIcon(status: string, progress: { completed: number; total: number }) {
  if (progress.total > 0 && progress.completed === progress.total) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === 'in_progress' || progress.completed > 0) {
    return <Clock className="h-4 w-4 text-qualia-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground/30" />;
}

export function ProjectWorkflow({ projectId, workspaceId, className }: ProjectWorkflowProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // New phase creation
  const [showNewPhase, setShowNewPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const newPhaseInputRef = useRef<HTMLInputElement>(null);

  // New task creation
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Phase editing
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');

  // Task editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  // Task view dialog
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [phasesData, tasksData] = await Promise.all([
        getProjectPhases(projectId),
        getProjectTasks(projectId),
      ]);
      setPhases(phasesData as Phase[]);
      setTasks(tasksData as Task[]);
    } catch (err) {
      console.error('Failed to fetch workflow data:', err);
      toast.error('Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unphased tasks
  const unphasedTasks = tasks.filter(
    (t) => !t.phase_name || !phases.some((p) => p.name === t.phase_name)
  );

  // Active phase
  const activePhase =
    activePhaseId === '__general' ? null : phases.find((p) => p.id === activePhaseId) || null;

  const isGeneralView = activePhaseId === '__general';
  const isDrilledIn = activePhaseId !== null;

  // Tasks for active view
  const phaseTasks = isGeneralView
    ? unphasedTasks
    : activePhase
      ? tasks.filter((t) => t.phase_name === activePhase.name)
      : [];

  // Progress helpers
  const getPhaseProgress = useCallback(
    (phase: Phase) => {
      const phaseTaskList = tasks.filter((t) => t.phase_name === phase.name);
      const completed = phaseTaskList.filter((t) => t.status === 'Done').length;
      const total = phaseTaskList.length;
      return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    [tasks]
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const overallPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group phases by milestone
  const groupedPhases = useMemo(() => {
    const groups = new Map<string, { label: string; phases: Phase[] }>();
    for (const phase of phases) {
      const { group, label } = parseMilestoneGroup(phase.name);
      if (!groups.has(group)) {
        groups.set(group, { label, phases: [] });
      }
      groups.get(group)!.phases.push(phase);
    }
    return Array.from(groups.entries());
  }, [phases]);

  // Phase CRUD
  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) return;
    startTransition(async () => {
      const result = await createProjectPhase(projectId, newPhaseName.trim());
      if (result.success) {
        setNewPhaseName('');
        setShowNewPhase(false);
        await fetchData();
        invalidateProjectPhases(projectId);
        toast.success('Phase created');
      } else {
        toast.error(result.error || 'Failed to create phase');
      }
    });
  };

  const handleUpdatePhase = async (phaseId: string) => {
    if (!editingPhaseName.trim()) {
      setEditingPhaseId(null);
      return;
    }
    startTransition(async () => {
      const result = await updateProjectPhase(phaseId, editingPhaseName.trim(), projectId);
      if (result.success) {
        setEditingPhaseId(null);
        await fetchData();
        invalidateProjectPhases(projectId);
      } else {
        toast.error(result.error || 'Failed to update phase');
      }
    });
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('Delete this phase and all its tasks?')) return;
    startTransition(async () => {
      const result = await deleteProjectPhase(phaseId, projectId);
      if (result.success) {
        await fetchData();
        invalidateProjectPhases(projectId);
        if (activePhaseId === phaseId) setActivePhaseId(null);
        toast.success('Phase deleted');
      } else {
        toast.error(result.error || 'Failed to delete phase');
      }
    });
  };

  // Task CRUD
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const formData = new FormData();
    formData.set('title', newTaskTitle.trim());
    formData.set('project_id', projectId);
    formData.set('workspace_id', workspaceId);
    if (activePhase) formData.set('phase_name', activePhase.name);
    formData.set('status', 'Todo');
    formData.set('priority', 'No Priority');
    formData.set('show_in_inbox', 'true');

    startTransition(async () => {
      const result = await createTask(formData);
      if (result.success) {
        setNewTaskTitle('');
        await fetchData();
        invalidateProjectTasks(projectId, true);
        invalidateInboxTasks(true);
        newTaskInputRef.current?.focus();
      } else {
        toast.error('Failed to create task');
      }
    });
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('status', newStatus);
    startTransition(async () => {
      await updateTask(formData);
      await fetchData();
      invalidateProjectTasks(projectId, true);
    });
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('title', editingTaskTitle.trim());
    startTransition(async () => {
      await updateTask(formData);
      setEditingTaskId(null);
      await fetchData();
      invalidateProjectTasks(projectId, true);
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    startTransition(async () => {
      await deleteTask(taskId);
      await fetchData();
      invalidateProjectTasks(projectId, true);
    });
  };

  const handleLoadFramework = async () => {
    startTransition(async () => {
      const result = await loadQualiaFrameworkPipeline(projectId);
      if (result.success) {
        toast.success(`Loaded ${result.phasesCreated} phases`);
        await fetchData();
        invalidateProjectPhases(projectId);
        invalidateInboxTasks(true);
      } else {
        toast.error(result.error || 'Failed to load framework');
      }
    });
  };

  // Sort tasks: incomplete first, then by sort_order
  const sortedTasks = [...phaseTasks].sort((a, b) => {
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (phases.length === 0 && unphasedTasks.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-6 px-6', className)}>
        <div className="text-center">
          <FolderPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-foreground">No phases yet</h3>
          <p className="text-sm text-muted-foreground">
            Load the Qualia Framework or create phases manually.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button onClick={handleLoadFramework} disabled={isPending} className="gap-2" size="sm">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Load Qualia Framework
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="Or create a phase..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
              disabled={isPending}
              className="h-8 w-56 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPhase}
              disabled={isPending || !newPhaseName.trim()}
              className="h-8"
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Phase Detail View (drilled in) ──────────────────────────────────────
  if (isDrilledIn) {
    const phaseName = isGeneralView ? 'General Tasks' : activePhase?.name || '';
    const phaseDesc = activePhase?.description;
    const doneCount = sortedTasks.filter((t) => t.status === 'Done').length;

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Phase header bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/40 px-5 py-3">
          <button
            onClick={() => setActivePhaseId(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{phaseName}</h2>
            {phaseDesc && <p className="truncate text-xs text-muted-foreground">{phaseDesc}</p>}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount}/{sortedTasks.length} done
          </span>
        </div>

        {/* Task list — scrollable */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            {/* Add task input */}
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
              <Plus
                className={cn(
                  'h-4 w-4 shrink-0',
                  newTaskTitle.trim() ? 'text-primary' : 'text-muted-foreground/40'
                )}
              />
              <input
                ref={newTaskInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task... (Enter)"
                disabled={isPending}
                className="h-7 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none"
              />
              {newTaskTitle.trim() && (
                <Button
                  size="sm"
                  onClick={handleAddTask}
                  disabled={isPending}
                  className="h-6 px-2 text-xs"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-px">
              {sortedTasks.map((task) => {
                const isDone = task.status === 'Done';
                const isEditing = editingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isDone ? 'opacity-50' : 'hover:bg-muted/30'
                    )}
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className={cn(
                        'h-4 w-4 shrink-0 rounded border-[1.5px] transition-all',
                        isDone
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-muted-foreground/25 hover:border-primary'
                      )}
                      disabled={isPending}
                    />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTask(task.id);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          onBlur={() => handleUpdateTask(task.id)}
                          autoFocus
                          className="w-full bg-transparent text-sm font-medium focus:outline-none"
                          disabled={isPending}
                        />
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                          )}
                          onDoubleClick={() => {
                            if (!isDone) {
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                            }
                          }}
                        >
                          {task.title}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {task.description && (
                        <button
                          onClick={() => setViewingTask(task)}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-qualia-500/10 hover:text-qualia-500"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      )}
                      {!isDone && (
                        <button
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskTitle(task.title);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={isPending}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {phaseTasks.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground/60">Add your first task above</p>
              </div>
            )}
          </div>
        </div>

        {/* Task view dialog */}
        <TaskDetailDialog
          task={viewingTask as unknown as InboxTask}
          open={!!viewingTask}
          onOpenChange={(open) => {
            if (!open) setViewingTask(null);
          }}
          onEdit={() => {
            if (viewingTask) {
              setEditingTaskId(viewingTask.id);
              setEditingTaskTitle(viewingTask.title);
              setViewingTask(null);
            }
          }}
          onToggleDone={(t) => {
            handleToggleTask(t.id, t.status);
            setViewingTask(null);
          }}
        />
      </div>
    );
  }

  // ─── Phase Overview (grid) ────────────────────────────────────────────────
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Compact header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Workflow</h2>
          <span className="rounded-md bg-muted/40 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall progress */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {overallPercent}%
            </span>
          </div>
          {/* Add phase */}
          {showNewPhase ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={newPhaseInputRef}
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="Phase name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPhase();
                  if (e.key === 'Escape') {
                    setShowNewPhase(false);
                    setNewPhaseName('');
                  }
                }}
                autoFocus
                className="h-7 w-40 text-xs"
                disabled={isPending}
              />
              <Button
                size="sm"
                onClick={handleAddPhase}
                disabled={isPending || !newPhaseName.trim()}
                className="h-7 px-2 text-xs"
              >
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowNewPhase(true);
                setTimeout(() => newPhaseInputRef.current?.focus(), 50);
              }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add phase
            </button>
          )}
        </div>
      </div>

      {/* Phase grid — scrollable */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          {/* General tasks section */}
          {unphasedTasks.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                General
              </p>
              <button
                onClick={() => setActivePhaseId('__general')}
                className="group flex w-full items-center gap-3 rounded-lg border border-border/30 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-muted/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/30">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Unphased Tasks</p>
                  <p className="text-xs text-muted-foreground">
                    {unphasedTasks.filter((t) => t.status === 'Done').length}/{unphasedTasks.length}{' '}
                    done
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-foreground" />
              </button>
            </div>
          )}

          {/* Grouped phases */}
          {groupedPhases.map(([groupKey, group]) => (
            <div key={groupKey} className="mb-5 last:mb-0">
              {groupedPhases.length > 1 && (
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {group.label}
                </p>
              )}
              <div className="space-y-px">
                {group.phases.map((phase) => {
                  const progress = getPhaseProgress(phase);
                  const isComplete = progress.total > 0 && progress.completed === progress.total;
                  const isEditing = editingPhaseId === phase.id;

                  return (
                    <div key={phase.id} className="group relative">
                      {isEditing ? (
                        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-muted/20 px-4 py-2.5">
                          <Input
                            value={editingPhaseName}
                            onChange={(e) => setEditingPhaseName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdatePhase(phase.id);
                              if (e.key === 'Escape') setEditingPhaseId(null);
                            }}
                            onBlur={() => handleUpdatePhase(phase.id)}
                            autoFocus
                            className="h-7 text-sm"
                            disabled={isPending}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setActivePhaseId(phase.id)}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors hover:bg-muted/20"
                        >
                          {/* Status icon */}
                          <div className="shrink-0">{getStatusIcon(phase.status, progress)}</div>

                          {/* Name */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-sm',
                                isComplete ? 'text-muted-foreground' : 'font-medium text-foreground'
                              )}
                            >
                              {phase.name}
                            </p>
                          </div>

                          {/* Progress bar */}
                          {progress.total > 0 && (
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="h-1 w-16 overflow-hidden rounded-full bg-muted/40">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-300',
                                    isComplete ? 'bg-emerald-500' : 'bg-primary'
                                  )}
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                                {progress.completed}/{progress.total}
                              </span>
                            </div>
                          )}

                          {progress.total === 0 && (
                            <span className="text-[11px] text-muted-foreground/40">No tasks</span>
                          )}

                          {/* Hover actions */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPhaseId(phase.id);
                                setEditingPhaseName(phase.name);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhase(phase.id);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
