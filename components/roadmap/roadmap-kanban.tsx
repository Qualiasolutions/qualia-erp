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
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { PhaseItemData } from './project-roadmap';
import { updatePhaseItem } from '@/app/actions';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, Link2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';

interface RoadmapKanbanProps {
  items: PhaseItemData[];
  onItemUpdate: () => void;
}

// Map roadmap statuses to Kanban columns
const COLUMNS = [
  { id: 'not_started', title: 'Not Started', color: 'bg-gray-500', icon: Circle },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500', icon: Clock },
  { id: 'completed', title: 'Completed', color: 'bg-emerald-500', icon: CheckCircle2 },
];

// Roadmap-specific Kanban Card
interface RoadmapCardProps {
  item: PhaseItemData;
  isOverlay?: boolean;
}

function RoadmapCardInner({ item, isOverlay }: RoadmapCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: 'RoadmapItem',
      item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md',
        isDragging && 'opacity-50',
        isOverlay && 'z-50 rotate-2 scale-105 cursor-grabbing opacity-100 shadow-xl',
        item.is_completed && 'border-emerald-500/20 bg-emerald-500/5'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.is_completed ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <h4
            className={cn(
              'line-clamp-2 text-sm font-medium leading-tight',
              item.is_completed && 'text-muted-foreground line-through'
            )}
          >
            {item.title}
          </h4>
        </div>
      </div>

      {item.description && (
        <p className="line-clamp-2 pl-6 text-xs text-muted-foreground">{item.description}</p>
      )}

      {item.linked_issue && (
        <div className="flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
          <Link2 className="h-3 w-3" />
          <span className="max-w-[150px] truncate">{item.linked_issue.title}</span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium',
              item.linked_issue.status === 'Done' && 'bg-emerald-500/10 text-emerald-500',
              item.linked_issue.status === 'In Progress' && 'bg-amber-500/10 text-amber-500',
              (item.linked_issue.status === 'Todo' ||
                item.linked_issue.status === 'Yet to Start') &&
                'bg-blue-500/10 text-blue-500'
            )}
          >
            {item.linked_issue.status}
          </span>
        </div>
      )}
    </div>
  );
}

// Memoized card
const RoadmapCard = ({ item, isOverlay }: RoadmapCardProps) => (
  <RoadmapCardInner item={item} isOverlay={isOverlay} />
);

// Kanban Column for Roadmap
interface RoadmapColumnProps {
  id: string;
  title: string;
  color: string;
  icon: typeof Circle;
  items: PhaseItemData[];
}

function RoadmapColumn({ id, title, color, icon: Icon, items }: RoadmapColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        'flex h-full w-80 min-w-[320px] flex-col rounded-xl border border-border/50 bg-secondary/30 transition-colors',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between border-b border-border/50 p-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', color)} />
          <Icon className={cn('h-4 w-4', color.replace('bg-', 'text-'))} />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto p-2">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <RoadmapCard key={item.id} item={item} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );
}

export function RoadmapKanban({ items, onItemUpdate }: RoadmapKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticItems, setOptimisticItems] = useState<PhaseItemData[]>(items);

  // Sync optimistic items with props
  useMemo(() => {
    setOptimisticItems(items);
  }, [items]);

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
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);

      if (!over) return;

      const activeItem = optimisticItems.find((i) => i.id === active.id);
      if (!activeItem) return;

      // Get target column
      let targetColumnId = over.id as string;
      if (over.data.current?.sortable?.containerId) {
        targetColumnId = over.data.current.sortable.containerId;
      }

      // Validate it's a valid column
      const targetColumn = COLUMNS.find((c) => c.id === targetColumnId);
      if (!targetColumn) {
        // Dropped on another item - get that item's column
        const overItem = optimisticItems.find((i) => i.id === over.id);
        if (overItem) {
          targetColumnId = overItem.is_completed
            ? 'completed'
            : overItem.linked_issue?.status === 'In Progress'
              ? 'in_progress'
              : 'not_started';
        }
      }

      // Determine new completion state
      const newIsCompleted = targetColumnId === 'completed';

      // Only update if state changed
      if (activeItem.is_completed !== newIsCompleted) {
        // Optimistic update
        setOptimisticItems((prev) =>
          prev.map((item) =>
            item.id === activeItem.id
              ? {
                  ...item,
                  is_completed: newIsCompleted,
                  completed_at: newIsCompleted ? new Date().toISOString() : null,
                }
              : item
          )
        );

        // Call API
        const formData = new FormData();
        formData.append('id', activeItem.id);
        formData.append('is_completed', newIsCompleted.toString());

        try {
          await updatePhaseItem(formData);
          onItemUpdate();
        } catch {
          // Revert on error
          setOptimisticItems(items);
        }
      }
    },
    [optimisticItems, items, onItemUpdate]
  );

  // Memoize items by column
  const itemsByColumn = useMemo(() => {
    const result: Record<string, PhaseItemData[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
    };

    optimisticItems.forEach((item) => {
      if (item.is_completed) {
        result.completed.push(item);
      } else if (item.linked_issue?.status === 'In Progress') {
        result.in_progress.push(item);
      } else {
        result.not_started.push(item);
      }
    });

    return result;
  }, [optimisticItems]);

  // Get active item for overlay
  const activeItem = useMemo(
    () => (activeId ? optimisticItems.find((i) => i.id === activeId) : null),
    [activeId, optimisticItems]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map((col) => (
          <RoadmapColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            icon={col.icon}
            items={itemsByColumn[col.id] || []}
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
            {activeItem ? <RoadmapCard item={activeItem} isOverlay /> : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
