'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard, type BoardTask } from './board-card';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  id: string;
  title: string;
  color: string;
  gradient: string;
  tasks: BoardTask[];
  onTaskClick: (taskId: string) => void;
  isOver?: boolean;
}

export function BoardColumn({
  id,
  title,
  color,
  gradient,
  tasks,
  onTaskClick,
  isOver,
}: BoardColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id });
  const showDropIndicator = isOver || isDroppableOver;

  return (
    <div
      className={cn(
        'flex h-full w-80 min-w-[320px] flex-col rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm transition-all duration-300',
        showDropIndicator &&
          'scale-[1.01] border-qualia-500/50 bg-qualia-500/5 ring-2 ring-qualia-500/20'
      )}
    >
      {/* Header with Gradient */}
      <div
        className={cn(
          'flex items-center justify-between rounded-t-2xl bg-gradient-to-r to-transparent px-4 py-3.5',
          gradient
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('h-2.5 w-2.5 rounded-full shadow-sm', color)} />
          <h3 className="font-semibold tracking-tight">{title}</h3>
        </div>
        <span
          className={cn(
            'flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2.5 text-xs font-bold',
            color.replace('bg-', 'bg-') + '/15',
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
          'flex-1 space-y-3 overflow-y-auto p-3 transition-colors duration-200',
          showDropIndicator && 'bg-qualia-500/5'
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
              'flex h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200',
              showDropIndicator
                ? 'border-qualia-500/40 bg-qualia-500/5'
                : 'border-border/40 hover:border-border/60'
            )}
          >
            <p className="text-sm text-muted-foreground">
              {showDropIndicator ? 'Drop here' : 'No tasks'}
            </p>
            {!showDropIndicator && (
              <p className="text-xs text-muted-foreground/60">Drag tasks here</p>
            )}
          </div>
        )}

        {/* Drop Zone Indicator */}
        {tasks.length > 0 && showDropIndicator && (
          <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-qualia-500/40 bg-qualia-500/5 transition-all duration-200">
            <p className="text-sm font-medium text-qualia-500">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
