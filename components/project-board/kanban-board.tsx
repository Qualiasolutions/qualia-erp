'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import { STATUS_COLUMNS, type BoardTask, type StatusColumnId } from './board-types';

// ---------------------------------------------------------------------------
// Draggable wrapper
// ---------------------------------------------------------------------------

interface DraggableTaskProps {
  task: BoardTask;
  children: React.ReactNode;
}

function DraggableTask({ task, children }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-40')}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable column
// ---------------------------------------------------------------------------

interface DroppableColumnProps {
  columnId: StatusColumnId;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  tasks: BoardTask[];
  isOver: boolean;
}

function DroppableColumnInner({
  label,
  badgeBg,
  badgeText,
  dotColor,
  tasks,
  isOver,
}: DroppableColumnProps) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-1 flex-col rounded-lg border border-border bg-muted/20 transition-colors duration-200',
        isOver && 'border-primary/40 bg-primary/[0.04]'
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className={cn('h-2 w-2 rounded-full', dotColor)} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span
          className={cn(
            'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums',
            badgeBg,
            badgeText
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex flex-1 flex-col gap-2 p-2">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No tasks</p>
        ) : (
          tasks.map((task) => (
            <DraggableTask key={task.id} task={task}>
              <TaskCard task={task} />
            </DraggableTask>
          ))
        )}
      </div>
    </div>
  );
}

function DroppableColumn(props: Omit<DroppableColumnProps, 'isOver'>) {
  const { setNodeRef, isOver } = useDroppable({ id: props.columnId });

  return (
    <div ref={setNodeRef} className="flex min-w-0 flex-1 flex-col md:min-w-[250px]">
      <DroppableColumnInner {...props} isOver={isOver} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  tasks: BoardTask[];
  onStatusChange: (taskId: string, newStatus: StatusColumnId) => void;
}

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<StatusColumnId, BoardTask[]> = {
      Todo: [],
      'In Progress': [],
      Done: [],
    };
    for (const task of tasks) {
      const col = grouped[task.status as StatusColumnId];
      if (col) {
        col.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  const activeTask = useMemo(
    () => (activeId ? (tasks.find((t) => t.id === activeId) ?? null) : null),
    [activeId, tasks]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const fromStatus = (active.data.current as { status: StatusColumnId } | undefined)?.status;
      const toStatus = over.id as StatusColumnId;

      if (fromStatus && fromStatus !== toStatus) {
        onStatusChange(String(active.id), toStatus);
      }
    },
    [onStatusChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-4 md:flex-row md:overflow-x-auto">
        {STATUS_COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            badgeBg={col.badgeBg}
            badgeText={col.badgeText}
            dotColor={col.dotColor}
            tasks={tasksByStatus[col.id]}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="z-overlay w-[280px]">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
