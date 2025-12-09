'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard, type BoardTask } from './board-card';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: BoardTask[];
  onTaskClick: (taskId: string) => void;
  isOver?: boolean;
}

export function BoardColumn({ id, title, color, tasks, onTaskClick, isOver }: BoardColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id });
  const showDropIndicator = isOver || isDroppableOver;

  return (
    <div
      className={cn(
        'flex h-full w-80 min-w-[320px] flex-col rounded-xl border border-border bg-card/50 transition-all duration-200',
        showDropIndicator && 'border-primary/50 bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-3 w-3 rounded-full', color)} />
          <h3 className="font-medium">{title}</h3>
        </div>
        <span
          className={cn(
            'flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-semibold',
            color.replace('bg-', 'bg-') + '/10',
            color.replace('bg-', 'text-')
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-3 overflow-y-auto p-3 transition-colors',
          showDropIndicator && 'bg-primary/5'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex h-24 items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              showDropIndicator ? 'border-primary/30 bg-primary/5' : 'border-border/50'
            )}
          >
            <p className="text-sm text-muted-foreground">
              {showDropIndicator ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}

        {/* Drop Zone */}
        {tasks.length > 0 && showDropIndicator && (
          <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <p className="text-sm text-primary">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
