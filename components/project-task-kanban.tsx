'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, GripVertical, MoreVertical, Trash2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createTask, deleteTask, reorderTasks, toggleTaskInbox } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import { useProjectTasks, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type TaskStatus = 'Todo' | 'In Progress' | 'Done';

const STATUS_COLORS: Record<
  TaskStatus,
  { bg: string; border: string; text: string; headerBg: string; accent: string }
> = {
  Todo: {
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    headerBg: 'bg-gradient-to-r from-slate-500/10 to-slate-600/10',
    accent: 'bg-slate-500',
  },
  'In Progress': {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
    accent: 'bg-blue-500',
  },
  Done: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    headerBg: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20',
    accent: 'bg-emerald-500',
  },
};

interface TaskCardProps {
  task: Task;
  onDelete: () => void;
  onToggleInbox: () => void;
  isDragging?: boolean;
}

function TaskCard({ task, onDelete, onToggleInbox, isDragging }: TaskCardProps) {
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
        'hover:border-primary/30 hover:shadow-md',
        dragging && 'z-50 rotate-1 scale-95 opacity-60 shadow-xl',
        task.status === 'Done' && 'border-emerald-500/20 bg-emerald-500/5'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-2 top-2 cursor-grab text-muted-foreground/50 active:cursor-grabbing',
          'p-1 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100'
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex items-start gap-3 pl-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                task.status === 'Done' && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>
            {task.show_in_inbox && <Inbox className="h-3.5 w-3.5 text-primary" />}
          </div>
          {task.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </div>
          )}
          {task.due_date && (
            <div className="mt-2 text-xs text-muted-foreground">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex-shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleInbox}>
              <Inbox className="mr-2 h-4 w-4" />
              {task.show_in_inbox ? 'Remove from Inbox' : 'Add to Inbox'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

interface StatusColumnProps {
  status: TaskStatus;
  tasks: Task[];
  projectId: string;
  onDeleteTask: (taskId: string) => void;
  onToggleInbox: (taskId: string, currentValue: boolean) => void;
  isAddingTask: boolean;
  newTaskTitle: string;
  onNewTaskTitleChange: (value: string) => void;
  onCreateTask: () => void;
  onCancelAddTask: () => void;
  onStartAddTask: () => void;
  isOver?: boolean;
}

function StatusColumn({
  status,
  tasks,
  onDeleteTask,
  onToggleInbox,
  isAddingTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
  onCancelAddTask,
  onStartAddTask,
  isOver,
}: StatusColumnProps) {
  const { setNodeRef } = useSortable({ id: status });
  const colors = STATUS_COLORS[status];
  const count = tasks.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[320px] max-w-[320px] flex-col rounded-xl border transition-all duration-200',
        colors.border,
        colors.bg,
        isOver && 'scale-[1.02] shadow-lg ring-2 ring-primary/50'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-t-xl border-b px-4 py-3',
          colors.headerBg,
          colors.border
        )}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">{status}</h3>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              colors.bg,
              colors.text
            )}
          >
            {count}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onStartAddTask} className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tasks List */}
      <div className="min-h-[200px] flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onToggleInbox={() => onToggleInbox(task.id, task.show_in_inbox)}
            />
          ))}
        </SortableContext>

        {/* Add Task Form */}
        {isAddingTask && (
          <div className="space-y-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 duration-200 animate-in fade-in slide-in-from-top-2">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              className="h-9 border-primary/30 bg-background text-sm focus:border-primary"
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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onCreateTask}
                disabled={!newTaskTitle.trim()}
                className="h-8 flex-1 bg-qualia-600 hover:bg-qualia-500"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelAddTask} className="h-8">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {tasks.length === 0 && !isAddingTask && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectTaskKanbanProps {
  projectId: string;
}

export function ProjectTaskKanban({ projectId }: ProjectTaskKanbanProps) {
  const { tasks, isLoading, revalidate } = useProjectTasks(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addingToStatus, setAddingToStatus] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      Todo: [],
      'In Progress': [],
      Done: [],
    };
    tasks.forEach((task) => {
      if (grouped[task.status as TaskStatus]) {
        grouped[task.status as TaskStatus].push(task);
      }
    });
    // Sort by sort_order within each status
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.sort_order - b.sort_order);
    });
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);

  // Progress calculation
  const totalTasks = tasks.length;
  const doneTasks = tasksByStatus['Done'].length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragEndEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeTaskId = active.id as string;
      const overId = over.id as string;

      // Find the active task
      const activeTask = tasks.find((t) => t.id === activeTaskId);
      if (!activeTask) return;

      // Determine target status - either the column or another task's column
      let targetStatus: TaskStatus;
      const isOverColumn = ['Todo', 'In Progress', 'Done'].includes(overId);

      if (isOverColumn) {
        targetStatus = overId as TaskStatus;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;
        targetStatus = overTask.status as TaskStatus;
      }

      // Get tasks in target column
      const targetColumnTasks = [...tasksByStatus[targetStatus]];
      const sourceColumnTasks = [...tasksByStatus[activeTask.status as TaskStatus]];

      // If same column, just reorder
      if (activeTask.status === targetStatus) {
        const oldIndex = targetColumnTasks.findIndex((t) => t.id === activeTaskId);
        const newIndex = isOverColumn
          ? targetColumnTasks.length
          : targetColumnTasks.findIndex((t) => t.id === overId);

        if (oldIndex !== newIndex && newIndex !== -1) {
          const reordered = arrayMove(targetColumnTasks, oldIndex, newIndex);
          const updates = reordered.map((task, index) => ({
            id: task.id,
            sort_order: index,
          }));
          await reorderTasks(updates);
          revalidate();
          invalidateInboxTasks();
        }
      } else {
        // Moving to different column
        // Remove from source
        const sourceIndex = sourceColumnTasks.findIndex((t) => t.id === activeTaskId);
        sourceColumnTasks.splice(sourceIndex, 1);

        // Add to target
        const targetIndex = isOverColumn
          ? targetColumnTasks.length
          : targetColumnTasks.findIndex((t) => t.id === overId);
        targetColumnTasks.splice(targetIndex, 0, activeTask);

        // Update all affected tasks
        const updates = [
          ...sourceColumnTasks.map((task, index) => ({
            id: task.id,
            sort_order: index,
          })),
          ...targetColumnTasks.map((task, index) => ({
            id: task.id,
            sort_order: index,
            status: task.id === activeTaskId ? targetStatus : undefined,
          })),
        ];

        await reorderTasks(updates);
        revalidate();
        invalidateInboxTasks();
      }
    },
    [tasks, tasksByStatus, revalidate]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId);
      revalidate();
      invalidateInboxTasks();
    },
    [revalidate]
  );

  const handleToggleInbox = useCallback(
    async (taskId: string, currentValue: boolean) => {
      await toggleTaskInbox(taskId, !currentValue);
      revalidate();
      invalidateInboxTasks();
    },
    [revalidate]
  );

  const handleCreateTask = useCallback(
    async (status: TaskStatus) => {
      if (!newTaskTitle.trim()) return;

      const formData = new FormData();
      formData.set('title', newTaskTitle.trim());
      formData.set('status', status);
      formData.set('project_id', projectId);
      formData.set('show_in_inbox', 'false');

      await createTask(formData);
      setNewTaskTitle('');
      setAddingToStatus(null);
      revalidate();
      invalidateProjectTasks(projectId);
    },
    [newTaskTitle, projectId, revalidate]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {doneTasks} of {totalTasks} tasks completed
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-500">{progress}%</div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SortableContext items={['Todo', 'In Progress', 'Done']}>
            {(['Todo', 'In Progress', 'Done'] as TaskStatus[]).map((status) => (
              <StatusColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                projectId={projectId}
                onDeleteTask={handleDeleteTask}
                onToggleInbox={handleToggleInbox}
                isAddingTask={addingToStatus === status}
                newTaskTitle={addingToStatus === status ? newTaskTitle : ''}
                onNewTaskTitleChange={setNewTaskTitle}
                onCreateTask={() => handleCreateTask(status)}
                onCancelAddTask={() => {
                  setAddingToStatus(null);
                  setNewTaskTitle('');
                }}
                onStartAddTask={() => setAddingToStatus(status)}
                isOver={overId === status}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} onDelete={() => {}} onToggleInbox={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
