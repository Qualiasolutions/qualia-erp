'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Plus, Trash2, Pencil, Loader2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  getProjectPhases,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
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

export function ProjectWorkflow({ projectId, workspaceId, className }: ProjectWorkflowProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
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

  // Fetch phases and tasks
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

  // Get tasks for active phase
  const activePhase = phases[activePhaseIndex];
  const phaseTasks = activePhase ? tasks.filter((t) => t.phase_name === activePhase.name) : [];

  // Calculate progress
  const getPhaseProgress = (phase: Phase) => {
    const phaseTaskList = tasks.filter((t) => t.phase_name === phase.name);
    const completed = phaseTaskList.filter((t) => t.status === 'Done').length;
    const total = phaseTaskList.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Phase CRUD handlers
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
        toast.success('Phase updated');
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
        if (activePhaseIndex >= phases.length - 1) {
          setActivePhaseIndex(Math.max(0, phases.length - 2));
        }
        toast.success('Phase deleted');
      } else {
        toast.error(result.error || 'Failed to delete phase');
      }
    });
  };

  // Task CRUD handlers
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !activePhase) return;

    const formData = new FormData();
    formData.set('title', newTaskTitle.trim());
    formData.set('project_id', projectId);
    formData.set('workspace_id', workspaceId);
    formData.set('phase_name', activePhase.name);
    formData.set('status', 'Todo');
    formData.set('priority', 'No Priority');
    formData.set('show_in_inbox', 'true'); // Auto-show phase tasks in main inbox

    startTransition(async () => {
      const result = await createTask(formData);
      if (result.success) {
        setNewTaskTitle('');
        await fetchData();
        invalidateProjectTasks(projectId, true);
        invalidateInboxTasks(true); // Update main inbox immediately
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

  // Sort tasks: incomplete first, then by sort_order
  const sortedTasks = [...phaseTasks].sort((a, b) => {
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-20', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className={cn('space-y-8', className)}>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center backdrop-blur-sm">
          <FolderPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-xl font-bold">No Phases Yet</h3>
          <p className="mb-6 text-muted-foreground">
            Create your first phase to start organizing your project workflow.
          </p>
          <div className="mx-auto flex max-w-md gap-2">
            <Input
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="e.g., Planning, Development, Testing..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
              disabled={isPending}
            />
            <Button onClick={handleAddPhase} disabled={isPending || !newPhaseName.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Phase'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header Stat Bar */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Project Workflow</h2>
            <p className="text-sm font-medium text-muted-foreground">
              {completedTasks}/{totalTasks} tasks completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Completion
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/80 to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Left: Phase Navigation */}
        <div className="space-y-2">
          {phases.map((phase, idx) => {
            const { completed, total, percent } = getPhaseProgress(phase);
            const isComplete = total > 0 && completed === total;
            const isActive = idx === activePhaseIndex;
            const isEditing = editingPhaseId === phase.id;

            return (
              <div
                key={phase.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border transition-all duration-200',
                  isActive
                    ? 'border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                )}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 p-4">
                    <Input
                      value={editingPhaseName}
                      onChange={(e) => setEditingPhaseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdatePhase(phase.id);
                        if (e.key === 'Escape') setEditingPhaseId(null);
                      }}
                      onBlur={() => handleUpdatePhase(phase.id)}
                      autoFocus
                      className="h-8"
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <button onClick={() => setActivePhaseIndex(idx)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-white/10 text-muted-foreground'
                          )}
                        >
                          {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div>
                          <span
                            className={cn(
                              'block font-bold',
                              isActive ? 'text-primary' : 'text-foreground'
                            )}
                          >
                            {phase.name}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {completed}/{total} Tasks
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPhaseId(phase.id);
                            setEditingPhaseName(phase.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhase(phase.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  </button>
                )}

                {/* Background Progress Fill */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            );
          })}

          {/* Add Phase Button */}
          {showNewPhase ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
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
                className="h-8"
                disabled={isPending}
              />
              <Button
                size="sm"
                onClick={handleAddPhase}
                disabled={isPending || !newPhaseName.trim()}
              >
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowNewPhase(true);
                setTimeout(() => newPhaseInputRef.current?.focus(), 100);
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-white/10 p-4 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Add Phase</span>
            </button>
          )}
        </div>

        {/* Right: Active Phase Tasks */}
        <div className="space-y-6">
          <div className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            {/* Decorative blob */}
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />

            {activePhase && (
              <div className="relative z-10">
                <div className="mb-8">
                  <h3 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                    {activePhase.name}
                    {getPhaseProgress(activePhase).percent === 100 && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Completed
                      </span>
                    )}
                  </h3>
                  {activePhase.description && (
                    <p className="text-lg text-muted-foreground">{activePhase.description}</p>
                  )}
                </div>

                {/* Add Task Input */}
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <Plus
                    className={cn(
                      'h-5 w-5 transition-colors',
                      newTaskTitle.trim() ? 'text-primary' : 'text-muted-foreground/50'
                    )}
                  />
                  <input
                    ref={newTaskInputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Add a task... (press Enter)"
                    disabled={isPending}
                    className="h-8 flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  {newTaskTitle.trim() && (
                    <Button size="sm" onClick={handleAddTask} disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  )}
                </div>

                {/* Task List */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {sortedTasks.map((task) => {
                      const isDone = task.status === 'Done';
                      const isEditing = editingTaskId === task.id;

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: isDone ? 0.5 : 1, y: 0 }}
                          exit={{ opacity: 0, x: -16, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className={cn(
                            'group flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
                            isDone
                              ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                              : 'border-white/5 bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04]'
                          )}
                        >
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={() => handleToggleTask(task.id, task.status)}
                            className={cn(
                              'mt-0.5 h-5 w-5 rounded-md border-2 transition-all duration-200',
                              isDone
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-muted-foreground/30 hover:border-primary'
                            )}
                            disabled={isPending}
                          />

                          <div className="flex-1">
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
                                className="w-full bg-transparent font-medium focus:outline-none"
                                disabled={isPending}
                              />
                            ) : (
                              <div
                                className={cn(
                                  'font-medium transition-colors',
                                  isDone
                                    ? 'text-muted-foreground line-through decoration-emerald-500/50'
                                    : 'text-foreground'
                                )}
                                onDoubleClick={() => {
                                  if (!isDone) {
                                    setEditingTaskId(task.id);
                                    setEditingTaskTitle(task.title);
                                  }
                                }}
                              >
                                {task.title}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {!isDone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskTitle(task.title);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Empty state */}
                {phaseTasks.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-lg font-medium">No tasks yet</p>
                    <p className="text-sm">Add your first task above to get started.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
