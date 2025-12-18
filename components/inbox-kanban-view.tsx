'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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

interface InboxKanbanViewProps {
  tasks: Task[];
}

const statusColumns = [
  { id: 'Todo', label: 'Todo', color: 'border-slate-300 dark:border-slate-700' },
  { id: 'In Progress', label: 'In Progress', color: 'border-blue-300 dark:border-blue-700' },
  { id: 'Done', label: 'Done', color: 'border-emerald-300 dark:border-emerald-700' },
] as const;

type StatusId = (typeof statusColumns)[number]['id'];

function SortableTaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
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
}

function DroppableColumn({
  column,
  tasks,
  onDelete,
}: {
  column: (typeof statusColumns)[number];
  tasks: Task[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('rounded-t-lg border-b-2 bg-card px-3 py-2', column.color)}>
        <h3 className="text-sm font-semibold text-foreground">
          {column.label}
          <span className="ml-2 text-xs text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto rounded-b-lg bg-muted/30 p-3">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Drop tasks here</div>
          ) : (
            tasks.map((task) => <SortableTaskCard key={task.id} task={task} onDelete={onDelete} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function InboxKanbanView({ tasks: initialTasks }: InboxKanbanViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    startTransition(async () => {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: overColumn.id as Task['status'] } : t
          )
        );
      }
      return;
    }

    // Dragging over another task
    const activeColumn = findColumnByTaskId(activeId);
    const overColumn2 = findColumnByTaskId(overId);

    if (!activeColumn || !overColumn2) return;

    if (activeColumn !== overColumn2) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: overColumn2 as Task['status'] } : t))
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = findTaskById(activeId);
    if (!activeTask) return;

    // Determine the target column
    let targetColumn: StatusId = activeTask.status as StatusId;

    // Check if dropping on a column directly
    const overColumnDirect = statusColumns.find((c) => c.id === overId);
    if (overColumnDirect) {
      targetColumn = overColumnDirect.id;
    } else {
      // Dropping on a task - use that task's column
      const overTask = findTaskById(overId);
      if (overTask) {
        targetColumn = overTask.status as StatusId;
      }
    }

    // Calculate new positions
    const updatedTasks = tasks.map((t) => {
      if (t.id === activeId) {
        return { ...t, status: targetColumn as Task['status'] };
      }
      return t;
    });

    // Calculate sort orders for the target column
    const targetColumnTasks = updatedTasks
      .filter((t) => t.status === targetColumn)
      .sort((a, b) => {
        if (a.id === activeId) return -1; // Put active task at desired position
        if (b.id === activeId) return 1;
        return a.sort_order - b.sort_order;
      });

    // If dropping on a specific task, reorder
    const overTaskIndex = targetColumnTasks.findIndex((t) => t.id === overId);
    if (overTaskIndex !== -1 && overId !== activeId) {
      const activeIndex = targetColumnTasks.findIndex((t) => t.id === activeId);
      if (activeIndex !== -1) {
        const [removed] = targetColumnTasks.splice(activeIndex, 1);
        const newIndex = overId === activeId ? overTaskIndex : overTaskIndex;
        targetColumnTasks.splice(newIndex, 0, removed);
      }
    }

    // Assign new sort orders
    const taskUpdates: Array<{ id: string; sort_order: number; status?: string }> = [];
    targetColumnTasks.forEach((t, index) => {
      const originalTask = tasks.find((ot) => ot.id === t.id);
      if (originalTask) {
        if (originalTask.sort_order !== index || originalTask.status !== targetColumn) {
          taskUpdates.push({
            id: t.id,
            sort_order: index,
            status: t.id === activeId ? targetColumn : undefined,
          });
        }
      }
    });

    // Update local state
    setTasks((prev) =>
      prev.map((t) => {
        const update = taskUpdates.find((u) => u.id === t.id);
        if (update) {
          return {
            ...t,
            sort_order: update.sort_order,
            status: update.status ? (update.status as Task['status']) : t.status,
          };
        }
        return t;
      })
    );

    // Persist to database
    if (taskUpdates.length > 0) {
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
