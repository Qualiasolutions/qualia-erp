'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Map as MapIcon,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  MoreVertical,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createPhase,
  createPhaseItem,
  updatePhaseItem,
  deletePhaseItem,
  deletePhase,
  getProjectPhases,
  reorderPhaseItems,
} from '@/app/actions/roadmap';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  display_order: number;
  phase_id: string;
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

const getStatusColor = (status: string, progress: number) => {
  if (status === 'completed' || progress === 100) {
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      headerBg: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20',
      text: 'text-emerald-400',
      countBg: 'bg-emerald-500/20',
      accent: 'bg-emerald-500',
    };
  }
  if (status === 'in_progress' || progress > 0) {
    return {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      headerBg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
      text: 'text-blue-400',
      countBg: 'bg-blue-500/20',
      accent: 'bg-blue-500',
    };
  }
  return {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    headerBg: 'bg-gradient-to-r from-slate-500/10 to-slate-600/10',
    text: 'text-slate-400',
    countBg: 'bg-slate-500/20',
    accent: 'bg-slate-500',
  };
};

function TaskCard({
  task,
  onToggle,
  onDelete,
  isDragging,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || sortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        dragging && 'opacity-60 scale-95 rotate-1 shadow-xl z-50',
        task.is_completed && 'bg-emerald-500/5 border-emerald-500/20'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-2 top-2 cursor-grab active:cursor-grabbing text-muted-foreground/50',
          'opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-foreground'
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex items-start gap-3 pl-6">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 flex-shrink-0 transition-all hover:scale-110 active:scale-95"
        >
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'text-sm font-medium mb-1.5',
              task.is_completed && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </div>
          )}
          {task.is_completed && task.completed_by_profile && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.completed_by_profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-400">
                  {task.completed_by_profile.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-emerald-400">
                {task.completed_by_profile.full_name || 'Completed'}
              </span>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function PhaseColumn({
  phase,
  tasks,
  colors,
  onAddTask,
  onDeletePhase,
  onDeleteTask,
  onToggleTask,
  isAddingTask,
  newTaskTitle,
  newTaskDescription,
  onNewTaskTitleChange,
  onNewTaskDescriptionChange,
  onCreateTask,
  onCancelAddTask,
  isOver,
}: {
  phase: Phase;
  tasks: Task[];
  colors: ReturnType<typeof getStatusColor>;
  onAddTask: () => void;
  onDeletePhase: () => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  isAddingTask: boolean;
  newTaskTitle: string;
  newTaskDescription: string;
  onNewTaskTitleChange: (value: string) => void;
  onNewTaskDescriptionChange: (value: string) => void;
  onCreateTask: () => void;
  onCancelAddTask: () => void;
  isOver?: boolean;
}) {
  const { setNodeRef } = useSortable({ id: phase.id });

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[320px] max-w-[320px] flex-col rounded-xl border transition-all duration-200',
        colors.border,
        colors.bg,
        isOver && 'ring-2 ring-primary/50 shadow-lg scale-[1.02]'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-start justify-between rounded-t-xl px-4 py-3 border-b',
          colors.headerBg,
          colors.border
        )}
      >
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold text-sm mb-1.5">{phase.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-medium', colors.text)}>
              {completedCount} / {totalCount}
            </span>
            <div className="flex items-center gap-1.5">
              <div className={cn('h-1.5 w-16 rounded-full bg-background/20 overflow-hidden')}>
                <div
                  className={cn('h-full rounded-full transition-all duration-300', colors.accent)}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                  colors.countBg,
                  colors.text
                )}
              >
                {Math.round(phase.progress)}%
              </span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDeletePhase} className="text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Phase
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
        </SortableContext>

        {/* Add Task Form */}
        {isAddingTask ? (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              className="h-9 text-sm border-primary/30 bg-background focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onCreateTask();
                }
                if (e.key === 'Escape') {
                  onCancelAddTask();
                }
              }}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newTaskDescription}
              onChange={(e) => onNewTaskDescriptionChange(e.target.value)}
              className="min-h-[70px] text-sm border-primary/30 bg-background focus:border-primary resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onCancelAddTask();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onCreateTask}
                disabled={!newTaskTitle.trim()}
                className="h-8 flex-1 bg-qualia-600 hover:bg-qualia-500"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Task
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelAddTask}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddTask}
            className="w-full h-9 border-dashed hover:border-primary/50 hover:bg-primary/5 text-xs font-medium transition-all"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Task
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProjectRoadmap({ projectId, workspaceId }: ProjectRoadmapProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [overPhase, setOverPhase] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadPhases = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

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

  async function handleToggleTask(taskId: string) {
    const task = phases.flatMap((p) => p.tasks).find((t) => t.id === taskId);
    if (!task) return;

    const formData = new FormData();
    formData.append('id', taskId);
    formData.append('is_completed', (!task.is_completed).toString());

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

  function handleDragStart(event: DragStartEvent) {
    const activeId = event.active.id as string;
    const task = phases.flatMap((p) => p.tasks).find((t) => t.id === activeId);
    if (task) {
      setActiveTask(task);
      const sourcePhase = phases.find((p) => p.tasks.some((t) => t.id === activeId));
      setActivePhase(sourcePhase?.id || null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (over && typeof over.id === 'string') {
      // Check if over a phase column
      const phase = phases.find((p) => p.id === over.id);
      if (phase) {
        setOverPhase(phase.id);
      } else {
        // Check if over a task, find its phase
        const task = phases.flatMap((p) => p.tasks).find((t) => t.id === over.id);
        if (task) {
          const taskPhase = phases.find((p) => p.tasks.some((t) => t.id === over.id));
          setOverPhase(taskPhase?.id || null);
        }
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setActivePhase(null);
    setOverPhase(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const draggedTask = phases.flatMap((p) => p.tasks).find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Find source phase
    const sourcePhase = phases.find((p) => p.tasks.some((t) => t.id === activeId));
    if (!sourcePhase) return;

    // Check if dropped on a phase column
    const targetPhase = phases.find((p) => p.id === overId);
    if (targetPhase) {
      // Moving to a different phase column
      if (targetPhase.id !== sourcePhase.id) {
        const formData = new FormData();
        formData.append('id', activeId);
        formData.append('phase_id', targetPhase.id);
        formData.append('display_order', targetPhase.tasks.length.toString());

        const result = await updatePhaseItem(formData);
        if (result.success) {
          await loadPhases();
        } else {
          setError(result.error || 'Failed to move task');
        }
      }
      return;
    }

    // Dropped on another task - reorder within phase or move to different phase
    const overTask = phases.flatMap((p) => p.tasks).find((t) => t.id === overId);
    if (!overTask) return;

    const targetPhaseForTask = phases.find((p) => p.tasks.some((t) => t.id === overId));
    if (!targetPhaseForTask) return;

    // If moving to a different phase
    if (targetPhaseForTask.id !== sourcePhase.id) {
      const targetTasks = targetPhaseForTask.tasks.filter((t) => t.id !== activeId);
      const targetIndex = targetTasks.findIndex((t) => t.id === overId);

      // Reorder all tasks in both phases
      const taskOrders: Array<{ id: string; phase_id: string; display_order: number }> = [];

      // Update source phase tasks
      sourcePhase.tasks
        .filter((t) => t.id !== activeId)
        .forEach((task, idx) => {
          taskOrders.push({
            id: task.id,
            phase_id: task.phase_id,
            display_order: idx,
          });
        });

      // Insert into target phase
      targetTasks.forEach((task, idx) => {
        const order = idx >= targetIndex ? idx + 1 : idx;
        taskOrders.push({
          id: task.id,
          phase_id: task.phase_id,
          display_order: order,
        });
      });

      // Add the moved task
      taskOrders.push({
        id: activeId,
        phase_id: targetPhaseForTask.id,
        display_order: targetIndex,
      });

      const result = await reorderPhaseItems(taskOrders);
      if (result.success) {
        await loadPhases();
      } else {
        setError(result.error || 'Failed to move task');
      }
    } else {
      // Reordering within the same phase
      const sourceTasks = sourcePhase.tasks.filter((t) => t.id !== activeId);
      const oldIndex = sourcePhase.tasks.findIndex((t) => t.id === activeId);
      const newIndex = sourceTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(sourcePhase.tasks, oldIndex, newIndex >= oldIndex ? newIndex + 1 : newIndex);
        const taskOrders = reordered.map((task, idx) => ({
          id: task.id,
          phase_id: task.phase_id,
          display_order: idx,
        }));

        const result = await reorderPhaseItems(taskOrders);
        if (result.success) {
          await loadPhases();
        } else {
          setError(result.error || 'Failed to reorder tasks');
        }
      }
    }
  }

  // Calculate overall progress
  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const completedTasks = phases.reduce(
    (sum, p) => sum + (p.tasks?.filter((t) => t.is_completed).length || 0),
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.display_order - b.display_order),
    [phases]
  );

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[600px] w-[320px] flex-shrink-0 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-red-400/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 transition-colors hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Project Roadmap</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {completedTasks} of {totalTasks} tasks completed
            </span>
            <span>•</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-qualia-500 to-qualia-600 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="font-semibold text-foreground">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {sortedPhases.map((phase) => {
            const colors = getStatusColor(phase.status, phase.progress);
            const sortedTasks = [...phase.tasks].sort((a, b) => a.display_order - b.display_order);

            return (
              <PhaseColumn
                key={phase.id}
                phase={phase}
                tasks={sortedTasks}
                colors={colors}
                onAddTask={() => setEditingPhase(phase.id)}
                onDeletePhase={() => handleDeletePhase(phase.id)}
                onDeleteTask={handleDeleteTask}
                onToggleTask={handleToggleTask}
                isAddingTask={editingPhase === phase.id}
                newTaskTitle={newTaskTitle}
                newTaskDescription={newTaskDescription}
                onNewTaskTitleChange={setNewTaskTitle}
                onNewTaskDescriptionChange={setNewTaskDescription}
                onCreateTask={() => handleCreateTask(phase.id)}
                onCancelAddTask={() => {
                  setEditingPhase(null);
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                }}
                isOver={overPhase === phase.id && activePhase !== phase.id}
              />
            );
          })}

          {/* Add Phase Column */}
          <div className="flex h-full min-w-[320px] max-w-[320px] flex-shrink-0 flex-col">
            <div className="rounded-xl border-2 border-dashed border-border p-6 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Add Phase</h3>
                  <p className="text-xs text-muted-foreground">Create a new column</p>
                </div>
              </div>
              <Input
                placeholder="Phase name..."
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
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Phase
              </Button>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-xl border bg-card p-4 shadow-2xl opacity-95 rotate-2 scale-105 w-[300px]">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className={cn(
                    'h-5 w-5 mt-0.5 flex-shrink-0',
                    activeTask.is_completed ? 'text-emerald-500' : 'text-muted-foreground'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">{activeTask.title}</div>
                  {activeTask.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {activeTask.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {phases.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border py-20 text-center bg-muted/20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-qualia-500/10">
            <MapIcon className="h-10 w-10 text-qualia-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No roadmap yet</h3>
          <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground">
            Create your first phase to get started with the kanban board. Organize your project
            into phases and track progress with drag-and-drop tasks.
          </p>
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <Input
              placeholder="Phase name (e.g., Planning, Development, Testing)..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePhase();
                }
              }}
              className="text-center h-11"
            />
            <Button
              onClick={handleCreatePhase}
              disabled={!newPhaseName.trim()}
              className="bg-qualia-600 hover:bg-qualia-500 h-11"
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
