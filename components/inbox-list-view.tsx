'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { GripVertical, Calendar, AlertCircle, Edit2, Trash2, FolderOpen } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
import type { Task } from '@/app/actions/inbox';
import { reorderTasks, deleteTask } from '@/app/actions/inbox';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditTaskModal } from '@/components/edit-task-modal';

interface InboxListViewProps {
  tasks: Task[];
}

const priorityConfig = {
  'No Priority': { color: 'text-muted-foreground', bg: 'bg-muted', label: 'None' },
  Low: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Low',
  },
  Medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Medium',
  },
  High: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'High',
  },
  Urgent: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Urgent',
  },
};

const statusConfig = {
  Todo: {
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    label: 'Todo',
  },
  'In Progress': {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'In Progress',
  },
  Done: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Done',
  },
};

function SortableTaskRow({
  task,
  onDelete,
  onEdit,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:shadow-sm',
        isDragging && 'shadow-lg'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
          <span
            className={cn(
              'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
              status.color,
              status.bg
            )}
          >
            {status.label}
          </span>
          {task.priority !== 'No Priority' && (
            <span
              className={cn(
                'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                priority.color,
                priority.bg
              )}
            >
              {priority.label}
            </span>
          )}
          {task.project && (
            <span
              className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              title={task.phase ? `${task.project.name} - ${task.phase.name}` : task.project.name}
            >
              <FolderOpen className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{task.project.name}</span>
            </span>
          )}
        </div>
        {task.description && (
          <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {task.due_date && (
            <div
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-600 dark:text-red-400'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(task)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-500"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InboxListView({ tasks }: InboxListViewProps) {
  const router = useRouter();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, setIsReordering] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = localTasks.reduce(
    (acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    },
    {} as Record<Task['status'], Task[]>
  );

  // Sort each status group by sort_order
  Object.keys(tasksByStatus).forEach((status) => {
    tasksByStatus[status as Task['status']].sort((a, b) => a.sort_order - b.sort_order);
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = localTasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const activeTask = localTasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Find which status group the active task belongs to
    const statusGroup = activeTask.status;
    const statusTasks = tasksByStatus[statusGroup] || [];

    const oldIndex = statusTasks.findIndex((t) => t.id === active.id);
    const newIndex = statusTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder within the same status group
    const reordered = arrayMove(statusTasks, oldIndex, newIndex);

    // Update sort_order values
    const updates = reordered.map((task, index) => ({
      id: task.id,
      sort_order: index,
    }));

    setIsReordering(true);

    try {
      await reorderTasks(updates);

      // Update local state
      const updatedTasks = localTasks.map((task) => {
        const update = updates.find((u) => u.id === task.id);
        if (update) {
          return { ...task, sort_order: update.sort_order };
        }
        return task;
      });
      setLocalTasks(updatedTasks);

      router.refresh();
    } catch (error) {
      console.error('Error reordering tasks:', error);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const result = await deleteTask(id);
    if (result.success) {
      setLocalTasks((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } else {
      alert(result.error || 'Failed to delete task');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Create your first task to get started
        </p>
      </div>
    );
  }

  const statusOrder: Task['status'][] = ['Todo', 'In Progress', 'Done'];

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const statusTasks = tasksByStatus[status] || [];
            if (statusTasks.length === 0) return null;

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {statusConfig[status].label}
                  </h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {statusTasks.length}
                  </span>
                </div>
                <SortableContext
                  items={statusTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-1 opacity-90">
              <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
                <div className="text-sm font-semibold">{activeTask.title}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
        />
      )}
    </>
  );
}
