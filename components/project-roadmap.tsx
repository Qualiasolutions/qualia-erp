'use client';

import { useState, useEffect } from 'react';
import {
  Map,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Clock,
  Zap,
  Target,
  ChevronRight,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createPhase,
  createPhaseItem,
  updatePhaseItem,
  deletePhaseItem,
  deletePhase,
  getProjectPhases,
  type ActionResult,
} from '@/app/actions/roadmap';
import { cn } from '@/lib/utils';

// Phase color configurations based on progress
const getPhaseColors = (progress: number, status: string) => {
  if (status === 'completed' || progress === 100) {
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-500',
      progressBg: 'bg-emerald-500',
      icon: Sparkles,
    };
  }
  if (progress >= 75) {
    return {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      text: 'text-sky-500',
      progressBg: 'bg-sky-500',
      icon: Target,
    };
  }
  if (progress >= 25) {
    return {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      progressBg: 'bg-amber-500',
      icon: Zap,
    };
  }
  return {
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
    progressBg: 'bg-primary',
    icon: Clock,
  };
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  display_order: number;
  completed_by_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Phase {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  status: string;
  tasks: Task[];
  progress: number;
}

interface ProjectRoadmapProps {
  projectId: string;
  workspaceId: string;
}

export function ProjectRoadmap({ projectId, workspaceId }: ProjectRoadmapProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  useEffect(() => {
    loadPhases();
  }, [projectId]);

  async function loadPhases() {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectPhases(projectId);
      setPhases(data as Phase[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePhase() {
    if (!newPhaseName.trim()) return;

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('workspace_id', workspaceId);
    formData.append('name', newPhaseName.trim());
    formData.append('display_order', phases.length.toString());
    formData.append('status', 'not_started');

    const result = await createPhase(formData);
    if (result.success) {
      setNewPhaseName('');
      await loadPhases();
    } else {
      setError(result.error || 'Failed to create phase');
    }
  }

  async function handleCreateTask(phaseId: string) {
    if (!newTaskTitle.trim()) return;

    const formData = new FormData();
    formData.append('phase_id', phaseId);
    formData.append('title', newTaskTitle.trim());
    if (newTaskDescription.trim()) {
      formData.append('description', newTaskDescription.trim());
    }
    const phase = phases.find((p) => p.id === phaseId);
    formData.append('display_order', (phase?.tasks.length || 0).toString());

    const result = await createPhaseItem(formData);
    if (result.success) {
      setNewTaskTitle('');
      setNewTaskDescription('');
      setEditingPhase(null);
      await loadPhases();
    } else {
      setError(result.error || 'Failed to create task');
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: boolean) {
    const formData = new FormData();
    formData.append('id', taskId);
    formData.append('is_completed', (!currentStatus).toString());

    const result = await updatePhaseItem(formData);
    if (result.success) {
      await loadPhases();
    } else {
      setError(result.error || 'Failed to update task');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const result = await deletePhaseItem(taskId);
    if (result.success) {
      await loadPhases();
    } else {
      setError(result.error || 'Failed to delete task');
    }
  }

  async function handleDeletePhase(phaseId: string) {
    if (!confirm('Are you sure you want to delete this phase and all its tasks?')) return;

    const result = await deletePhase(phaseId);
    if (result.success) {
      await loadPhases();
    } else {
      setError(result.error || 'Failed to delete phase');
    }
  }

  // Calculate overall progress
  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const completedTasks = phases.reduce(
    (sum, p) => sum + (p.tasks?.filter((t) => t.is_completed).length || 0),
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  // Calculate status label
  const getStatusLabel = () => {
    if (overallProgress === 100) return 'Complete';
    if (overallProgress >= 75) return 'Almost there';
    if (overallProgress >= 50) return 'Halfway';
    if (overallProgress >= 25) return 'In progress';
    if (totalTasks > 0) return 'Getting started';
    return 'Not started';
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="slide-up rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 shadow-lg shadow-red-500/5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20">
              <X className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Something went wrong</p>
              <p className="mt-1 text-red-400/80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <div className="relative">
            <svg className="h-14 w-14 -rotate-90 transform">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${overallProgress * 1.51} 151`}
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-700',
                  overallProgress === 100
                    ? 'text-emerald-500'
                    : overallProgress >= 50
                      ? 'text-amber-500'
                      : 'text-qualia-500'
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold tabular-nums">{overallProgress}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Project Roadmap</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {completedTasks} of {totalTasks} tasks
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span
                className={cn(
                  'font-medium',
                  overallProgress === 100
                    ? 'text-emerald-500'
                    : overallProgress >= 50
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                )}
              >
                {getStatusLabel()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card/50 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-foreground">{phases.length}</div>
            <div className="text-xs text-muted-foreground">Phases</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-emerald-500">{completedTasks}</div>
            <div className="text-xs text-muted-foreground">Done</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <div className="text-2xl font-bold tabular-nums text-amber-500">
              {totalTasks - completedTasks}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-4">
        {phases.map((phase, phaseIndex) => {
          const colors = getPhaseColors(phase.progress, phase.status);
          const PhaseIcon = colors.icon;
          const isComplete = phase.progress === 100;

          return (
            <div
              key={phase.id}
              className={cn(
                'slide-up group relative overflow-hidden rounded-xl border-2 bg-card transition-all duration-300',
                colors.border,
                'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20'
              )}
              style={{ animationDelay: `${phaseIndex * 75}ms` }}
            >
              {/* Progress bar at top */}
              <div className="h-1 bg-muted/50">
                <div
                  className={cn('h-full transition-all duration-700', colors.progressBg)}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>

              <div className="p-4">
                {/* Phase Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                        colors.bg
                      )}
                    >
                      <PhaseIcon className={cn('h-5 w-5', colors.text)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{phase.name}</h3>
                        {isComplete && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            <Sparkles className="h-3 w-3" />
                            Complete
                          </span>
                        )}
                      </div>
                      {phase.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <span className={cn('text-sm font-medium tabular-nums', colors.text)}>
                          {phase.progress}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {phase.tasks.filter((t) => t.is_completed).length} / {phase.tasks.length}{' '}
                          tasks
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePhase(phase.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {phase.tasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className={cn(
                        'group/task flex items-start gap-3 rounded-xl border bg-background/50 p-3 transition-all duration-200',
                        task.is_completed
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      )}
                      style={{ animationDelay: `${taskIndex * 30}ms` }}
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_completed)}
                        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                      >
                        {task.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium transition-colors',
                            task.is_completed && 'line-through text-muted-foreground'
                          )}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="mt-1 text-xs text-muted-foreground">{task.description}</div>
                        )}
                        {task.is_completed && task.completed_by_profile && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500/70">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed by {task.completed_by_profile.full_name || 'Team member'}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="flex-shrink-0 opacity-0 transition-opacity group-hover/task:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Task Form */}
                  {editingPhase === phase.id ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <Input
                        placeholder="Task title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="mb-3 border-primary/20 bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCreateTask(phase.id);
                          }
                          if (e.key === 'Escape') {
                            setEditingPhase(null);
                            setNewTaskTitle('');
                          }
                        }}
                        autoFocus
                      />
                      <Textarea
                        placeholder="Task description (optional)"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        className="mb-3 min-h-[60px] border-primary/20 bg-background"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCreateTask(phase.id)}
                          disabled={!newTaskTitle.trim()}
                          className="bg-qualia-600 hover:bg-qualia-500"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Task
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPhase(null);
                            setNewTaskTitle('');
                            setNewTaskDescription('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPhase(phase.id)}
                      className="w-full border-dashed hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Phase Form */}
        <div className="rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/30 hover:bg-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Add New Phase</h3>
              <p className="text-xs text-muted-foreground">Group related tasks together</p>
            </div>
          </div>
          <Input
            placeholder="Phase name (e.g., Planning, Development, Testing)"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreatePhase();
              }
            }}
            className="mb-3"
          />
          <Button
            onClick={handleCreatePhase}
            disabled={!newPhaseName.trim()}
            className="w-full bg-qualia-600 hover:bg-qualia-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Phase
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {phases.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-qualia-500/10">
            <Map className="h-8 w-8 text-qualia-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No roadmap yet</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
            Create phases to organize your project into manageable milestones, then add tasks to track progress.
          </p>
          <div className="mx-auto flex max-w-xs flex-col gap-2">
            <Input
              placeholder="Start with a phase name..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePhase();
                }
              }}
              className="text-center"
            />
            <Button
              onClick={handleCreatePhase}
              disabled={!newPhaseName.trim()}
              className="bg-qualia-600 hover:bg-qualia-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Phase
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}










