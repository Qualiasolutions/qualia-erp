'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { GripVertical, Trash2, Circle, Loader2, CheckCircle2, MoreHorizontal } from 'lucide-react';
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
import { reorderTasks, deleteTask, quickUpdateTask } from '@/app/actions/inbox';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InlineText, InlineSelect, InlineDate } from '@/components/ui/inline-edit';
import { invalidateInboxTasks, invalidateProjectTasks } from '@/lib/swr';

interface InboxListViewProps {
  tasks: Task[];
}

// Status options for inline select
const statusOptions = [
  { value: 'Todo', label: 'Todo', icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" /> },
  {
    value: 'In Progress',
    label: 'In Progress',
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-500" />,
  },
  { value: 'Done', label: 'Done', icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
];

// Minimal status config for section headers
const statusConfig = {
  Todo: { label: 'Todo' },
  'In Progress': { label: 'In Progress' },
  Done: { label: 'Done' },
};

// Memoized SortableTaskRow with inline editing
const SortableTaskRow = memo(function SortableTaskRow({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';
  const showPriority = task.priority === 'High' || task.priority === 'Urgent';

  // Inline update handlers
  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, { title: newTitle });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  const handleStatusSave = useCallback(
    async (newStatus: string) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, {
          status: newStatus as 'Todo' | 'In Progress' | 'Done',
        });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  const handleDueDateSave = useCallback(
    async (newDate: Date | null) => {
      setIsUpdating(true);
      try {
        const result = await quickUpdateTask(task.id, {
          due_date: newDate ? newDate.toISOString().split('T')[0] : null,
        });
        if (result.success) {
          invalidateInboxTasks(true);
          if (task.project_id) invalidateProjectTasks(task.project_id, true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [task.id, task.project_id]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors duration-150 hover:border-border/80',
        isDragging && 'ring-1 ring-primary/30',
        isUpdating && 'opacity-70'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Main content - single line layout */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Title - inline editable */}
        <InlineText
          value={task.title}
          onSave={handleTitleSave}
          className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground"
          disabled={isUpdating}
        />

        {/* Metadata - inline with dots */}
        <div className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
          {/* Status - inline select */}
          <InlineSelect
            value={task.status}
            options={statusOptions}
            onSave={handleStatusSave}
            disabled={isUpdating}
          />

          {task.project && (
            <>
              <span className="text-border">·</span>
              <span className="max-w-[80px] truncate">{task.project.name}</span>
            </>
          )}

          {/* Due date - inline picker */}
          <span className="text-border">·</span>
          <InlineDate
            value={task.due_date ? new Date(task.due_date) : null}
            onSave={handleDueDateSave}
            placeholder="No date"
            disabled={isUpdating}
            showClear={false}
            className={cn(isOverdue && 'font-medium text-red-500')}
          />

          {showPriority && (
            <>
              <span className="text-border">·</span>
              <span
                className={cn(
                  'font-medium',
                  task.priority === 'Urgent' ? 'text-red-500' : 'text-orange-500'
                )}
              >
                {task.priority}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={() => onDelete(task.id)}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function InboxListView({ tasks }: InboxListViewProps) {
  const router = useRouter();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, setIsReordering] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Sync local state with props when tasks change from server/SWR
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

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
            <div key={status} className="space-y-2">
              {/* Section header - Minimal */}
              <div className="flex items-center gap-2 py-1">
                <h3 className="text-[13px] font-medium text-foreground">
                  {statusConfig[status].label}
                </h3>
                <span className="text-xs text-muted-foreground">({statusTasks.length})</span>
              </div>
              <SortableContext
                items={statusTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <SortableTaskRow key={task.id} task={task} onDelete={handleDelete} />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-1 opacity-95">
            <div className="rounded-md border border-border bg-card p-3 shadow-elevation-2 ring-1 ring-primary/20">
              <div className="text-[13px] font-medium">{activeTask.title}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
