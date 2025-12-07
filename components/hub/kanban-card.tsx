'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Clock, User, Folder } from 'lucide-react';
import { getPriorityConfig } from '@/lib/constants/task-config';

export type KanbanTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project: { id: string; name: string } | null;
  assignees: { id: string; full_name: string | null; avatar_url: string | null }[];
};

interface KanbanCardProps {
  task: KanbanTask;
  onClick: (taskId: string) => void;
  isOverlay?: boolean;
}

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

  const priorityConfig = getPriorityConfig(task.priority);
  const PriorityIcon = priorityConfig.icon;
  const hasAssignees = task.assignees && task.assignees.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task.id)}
      className={cn(
        'group relative cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all duration-200',
        'hover:border-qualia-500/30 hover:shadow-md hover:shadow-qualia-500/5',
        'active:cursor-grabbing',
        isDragging && 'opacity-40',
        isOverlay &&
          'z-50 rotate-2 scale-105 cursor-grabbing shadow-xl shadow-black/20 ring-2 ring-qualia-500'
      )}
    >
      {/* Priority Indicator Bar */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 rounded-l-lg',
          priorityConfig.color.replace('text-', 'bg-')
        )}
      />

      {/* Title */}
      <h4 className="mb-2 line-clamp-2 pl-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-qualia-500">
        {task.title}
      </h4>

      {/* Meta Row */}
      <div className="flex items-center justify-between gap-2 pl-2">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <div
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5',
              priorityConfig.bgColor,
              priorityConfig.borderColor
            )}
          >
            <PriorityIcon className={cn('h-3 w-3', priorityConfig.color)} />
            <span className={cn('text-[10px] font-medium', priorityConfig.color)}>
              {priorityConfig.label}
            </span>
          </div>

          {/* Project Badge */}
          {task.project && (
            <div className="flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5">
              <Folder className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[60px] truncate text-[10px] text-muted-foreground">
                {task.project.name}
              </span>
            </div>
          )}
        </div>

        {/* Assignee Avatar(s) */}
        {hasAssignees ? (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 2).map((assignee) => (
              <div
                key={assignee.id}
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-qualia-600/20 ring-0"
                title={assignee.full_name || 'Unknown'}
              >
                {assignee.avatar_url ? (
                  <span
                    className="h-full w-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${assignee.avatar_url})` }}
                  />
                ) : (
                  <span className="text-[8px] font-semibold text-qualia-500">
                    {(assignee.full_name || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {task.assignees.length > 2 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium text-muted-foreground">
                +{task.assignees.length - 2}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border">
            <User className="h-2.5 w-2.5 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Time */}
      <div className="mt-2 flex items-center gap-1 pl-2 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatRelativeTime(new Date(task.created_at))}</span>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders during drag operations
export const KanbanCard = memo(KanbanCardInner, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.isOverlay === nextProps.isOverlay &&
    JSON.stringify(prevProps.task.assignees) === JSON.stringify(nextProps.task.assignees)
  );
});
