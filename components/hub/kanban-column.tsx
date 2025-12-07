'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, type KanbanTask } from './kanban-card';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  lightColor: string;
  tasks: KanbanTask[];
  onTaskClick: (taskId: string) => void;
  isOver?: boolean;
}

export function KanbanColumn({
  id,
  title,
  color,
  lightColor,
  tasks,
  onTaskClick,
  isOver,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: id,
  });

  const showDropIndicator = isOver || isDroppableOver;

  return (
    <div
      className={cn(
        'flex h-full w-72 min-w-[288px] flex-col rounded-xl border border-border/50 bg-card/50 transition-all duration-200',
        showDropIndicator && 'border-qualia-500/50 bg-qualia-500/5 ring-2 ring-qualia-500/20'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={cn('h-2.5 w-2.5 rounded-full', color)} />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <span
          className={cn(
            'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
            lightColor,
            color.replace('bg-', 'text-')
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto p-2 transition-colors',
          showDropIndicator && 'bg-qualia-500/5'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex h-20 items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              showDropIndicator ? 'border-qualia-500/30 bg-qualia-500/5' : 'border-border/50'
            )}
          >
            <p className="text-xs text-muted-foreground">
              {showDropIndicator ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}

        {/* Drop zone indicator when dragging over */}
        {tasks.length > 0 && showDropIndicator && (
          <div className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-qualia-500/30 bg-qualia-500/5">
            <p className="text-xs text-qualia-500">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
