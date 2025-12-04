'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from './tasks-panel';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Clock, AlertCircle, Circle, LucideIcon } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  onClick: (taskId: string) => void;
  isOverlay?: boolean;
}

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; icon: LucideIcon }> = {
  Urgent: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: AlertCircle },
  High: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: AlertCircle },
  Medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: Circle },
  Low: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Circle },
  'No Priority': { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: Circle },
};

function KanbanCardInner({ task, onClick, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['No Priority'];
  const PriorityIcon = priorityConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task.id)}
      className={cn(
        'group relative flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md',
        isDragging && 'opacity-50',
        isOverlay && 'z-50 rotate-2 scale-105 cursor-grabbing opacity-100 shadow-xl'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {task.title}
        </h4>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
              priorityConfig.bgColor,
              priorityConfig.color
            )}
          >
            <PriorityIcon className="h-3 w-3" />
            <span>{task.priority}</span>
          </div>
        </div>

        {task.project && (
          <span className="max-w-[80px] truncate rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {task.project.name}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(new Date(task.created_at))}</span>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders during drag operations
export const KanbanCard = memo(KanbanCardInner, (prevProps, nextProps) => {
  // Only re-render if task data or overlay status changes
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.isOverlay === nextProps.isOverlay
  );
});
