'use client';

import { useState, useTransition, useOptimistic, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/app/actions/inbox';
import { TaskCard } from '@/components/task-card';
import { deleteTask, reorderTasks } from '@/app/actions/inbox';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS_COLORS } from '@/lib/color-constants';

interface InboxKanbanViewProps {
  tasks: Task[];
}

const statusColumns = [
  { id: 'Todo', label: 'Todo', color: ISSUE_STATUS_COLORS.Todo.border },
  { id: 'In Progress', label: 'In Progress', color: ISSUE_STATUS_COLORS['In Progress'].border },
  { id: 'Done', label: 'Done', color: ISSUE_STATUS_COLORS.Done.border },
] as const;

type StatusId = (typeof statusColumns)[number]['id'];

// Memoized SortableTaskCard to prevent re-renders when sibling tasks change
const SortableTaskCard = memo(function SortableTaskCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onDelete={onDelete} />
    </div>
  );
});

// Memoized DroppableColumn to prevent re-renders when sibling columns change
const DroppableColumn = memo(function DroppableColumn({
  column,
  tasks,
  onDelete,
}: {
  column: (typeof statusColumns)[number];
  tasks: Task[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex h-full flex-col">
      <div className={cn('rounded-t-lg border-b-2 bg-card px-3 py-2', column.color)}>
        <h3 className="text-sm font-semibold text-foreground">
          {column.label}
          <span className="ml-2 text-xs text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[200px] flex-1 space-y-3 overflow-y-auto rounded-b-lg bg-muted/30 p-3 transition-colors',
            isOver && 'bg-primary/10 ring-2 ring-primary/50'
          )}
        >
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Drop tasks here</div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} onDelete={onDelete} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
});

type TaskUpdate = { id: string; sort_order: number; status?: string };

export function InboxKanbanView({ tasks: initialTasks }: InboxKanbanViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // React 19: Use useOptimistic for instant UI feedback during drag operations
  const [optimisticTasks, updateTasks] = useOptimistic(
    initialTasks,
    (currentTasks: Task[], updates: TaskUpdate[]) => {
      return currentTasks
        .map((task) => {
          const update = updates.find((u) => u.id === task.id);
          if (update) {
            // Handle deletion
            if (update.status === 'DELETED') {
              return null;
            }
            return {
              ...task,
              sort_order: update.sort_order,
              status: update.status ? (update.status as Task['status']) : task.status,
            };
          }
          return task;
        })
        .filter((task): task is Task => task !== null);
    }
  );

  // Use optimistic tasks for all operations
  const tasks = optimisticTasks;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = (taskId: string) => {
    // React 19: Optimistic delete - remove from UI immediately
    updateTasks([{ id: taskId, sort_order: -1, status: 'DELETED' }]);

    startTransition(async () => {
      await deleteTask(taskId);
      router.refresh();
    });
  };

  const groupedTasks = statusColumns.reduce(
    (acc, column) => {
      acc[column.id] = tasks
        .filter((task) => task.status === column.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return acc;
    },
    {} as Record<StatusId, Task[]>
  );

  const findTaskById = (id: string): Task | undefined => {
    return tasks.find((t) => t.id === id);
  };

  const findColumnByTaskId = (taskId: string): StatusId | null => {
    const task = findTaskById(taskId);
    return task ? (task.status as StatusId) : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTaskById(active.id as string);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging over a column
    const overColumn = statusColumns.find((c) => c.id === overId);
    if (overColumn) {
      const activeTask = findTaskById(activeId);
      if (activeTask && activeTask.status !== overColumn.id) {
        // React 19: Optimistic status change during drag
        updateTasks([
          {
            id: activeId,
            sort_order: activeTask.sort_order,
            status: overColumn.id,
          },
        ]);
      }
      return;
    }

    // Dragging over another task
    const activeColumn = findColumnByTaskId(activeId);
    const overColumn2 = findColumnByTaskId(overId);

    if (!activeColumn || !overColumn2) return;

    if (activeColumn !== overColumn2) {
      const activeTask = findTaskById(activeId);
      if (activeTask) {
        // React 19: Optimistic status change when dragging over task in different column
        updateTasks([
          {
            id: activeId,
            sort_order: activeTask.sort_order,
            status: overColumn2,
          },
        ]);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = findTaskById(activeId);
    if (!draggedTask) return;

    // Determine the target column
    let targetColumn: StatusId;

    // Check if dropping on a column directly (column IDs are 'Todo', 'In Progress', 'Done')
    const isColumnDrop = statusColumns.some((c) => c.id === overId);
    if (isColumnDrop) {
      targetColumn = overId as StatusId;
    } else {
      // Dropping on a task - use that task's column
      const overTask = findTaskById(overId);
      if (overTask) {
        targetColumn = overTask.status as StatusId;
      } else {
        // Fallback to current status
        targetColumn = draggedTask.status as StatusId;
      }
    }

    // Check if status actually changed or if we're just reordering
    const statusChanged = draggedTask.status !== targetColumn;

    // Get current tasks in the target column (excluding the dragged task if it's moving between columns)
    const targetColumnTasks = tasks
      .filter((t) => {
        if (t.id === activeId) return false; // Exclude dragged task initially
        return t.status === targetColumn;
      })
      .sort((a, b) => a.sort_order - b.sort_order);

    // Determine where to insert the dragged task
    let insertIndex = targetColumnTasks.length; // Default to end
    if (!isColumnDrop) {
      const overTaskIndex = targetColumnTasks.findIndex((t) => t.id === overId);
      if (overTaskIndex !== -1) {
        insertIndex = overTaskIndex;
      }
    }

    // Insert the dragged task at the correct position
    const reorderedTasks = [...targetColumnTasks];
    reorderedTasks.splice(insertIndex, 0, { ...draggedTask, status: targetColumn });

    // Build task updates
    const taskUpdates: Array<{ id: string; sort_order: number; status?: string }> = [];

    reorderedTasks.forEach((t, index) => {
      const originalTask = tasks.find((ot) => ot.id === t.id);
      const needsUpdate =
        t.id === activeId
          ? statusChanged || originalTask?.sort_order !== index
          : originalTask?.sort_order !== index;

      if (needsUpdate) {
        taskUpdates.push({
          id: t.id,
          sort_order: index,
          status: t.id === activeId ? targetColumn : undefined,
        });
      }
    });

    // React 19: Optimistic updates for instant feedback
    if (taskUpdates.length > 0) {
      // Apply optimistic updates immediately
      updateTasks(taskUpdates);

      // Persist to database in background
      startTransition(async () => {
        await reorderTasks(taskUpdates);
        router.refresh();
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'grid h-full grid-cols-1 gap-4 overflow-y-auto md:grid-cols-3',
          isPending && 'pointer-events-none opacity-70'
        )}
      >
        {statusColumns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            tasks={groupedTasks[column.id] || []}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
