'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task } from './tasks-panel';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { createPortal } from 'react-dom';

interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface KanbanBoardProps {
  tasks: Task[];
  members: Member[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskAssign?: (taskId: string, assigneeId: string | null) => void;
  onTaskClick: (taskId: string) => void;
}

// Color palette for member columns
const MEMBER_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
];

export function KanbanBoard({
  tasks,
  members,
  onTaskMove,
  onTaskAssign,
  onTaskClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        setActiveId(null);
        return;
      }

      const activeTask = tasks.find((t) => t.id === active.id);
      // Get the column ID - could be the column itself or a card within the column
      let targetColumnId = over.id as string;

      // If dropped on a card, get its container
      if (over.data.current?.sortable?.containerId) {
        targetColumnId = over.data.current.sortable.containerId;
      }

      if (activeTask && targetColumnId) {
        // Check if this is a user column or unassigned
        const isUserColumn = members.some((m) => m.id === targetColumnId);
        const isUnassigned = targetColumnId === 'unassigned';

        if (isUserColumn || isUnassigned) {
          // This is a user-based board - call onTaskAssign if available
          if (onTaskAssign) {
            const newAssigneeId = isUnassigned ? null : targetColumnId;
            onTaskAssign(activeTask.id, newAssigneeId);
          }
        } else {
          // Fallback to status-based move
          onTaskMove(activeTask.id, targetColumnId);
        }
      }

      setActiveId(null);
    },
    [tasks, members, onTaskMove, onTaskAssign]
  );

  // Memoize columns to prevent recreation on every render
  const columns = useMemo(
    () => [
      { id: 'unassigned', title: 'Unassigned', color: 'bg-gray-500' },
      ...members.map((m, index) => ({
        id: m.id,
        title: m.full_name || 'Unknown User',
        color: MEMBER_COLORS[index % MEMBER_COLORS.length],
      })),
    ],
    [members]
  );

  // Memoize task filtering per column
  const tasksByColumn = useMemo(() => {
    const result: Record<string, Task[]> = {};

    columns.forEach((col) => {
      if (col.id === 'unassigned') {
        result[col.id] = tasks.filter((t) => !t.assignees || t.assignees.length === 0);
      } else {
        result[col.id] = tasks.filter((t) => t.assignees?.some((a) => a.id === col.id));
      }
    });

    return result;
  }, [tasks, columns]);

  // Memoize active task for DragOverlay
  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) : null),
    [activeId, tasks]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            tasks={tasksByColumn[col.id] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeTask ? <KanbanCard task={activeTask} onClick={() => {}} isOverlay /> : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
