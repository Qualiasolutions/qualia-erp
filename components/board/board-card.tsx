'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Circle,
  Minus,
  User,
  Folder,
  GripVertical,
  Sparkles,
} from 'lucide-react';

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  project: { id: string; name: string } | null;
  assignees: { id: string; full_name: string | null; avatar_url: string | null }[];
  creator_id: string | null;
};

interface BoardCardProps {
  task: BoardTask;
  onClick: (taskId: string) => void;
  isOverlay?: boolean;
}

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string; icon: typeof Circle }
> = {
  Urgent: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
    icon: AlertTriangle,
  },
  High: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-l-orange-500',
    icon: AlertCircle,
  },
  Medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-l-yellow-500',
    icon: Minus,
  },
  Low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
    icon: Circle,
  },
  'No Priority': {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-l-muted-foreground/30',
    icon: Minus,
  },
};

function BoardCardInner({ task, onClick, isOverlay }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['No Priority'];
  const PriorityIcon = priorityConfig.icon;
  const hasAssignees = task.assignees && task.assignees.length > 0;
  const isUrgent = task.priority === 'Urgent';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(task.id)}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-l-[3px] border-border/60 bg-card p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-qualia-500/30 hover:shadow-md hover:shadow-black/5',
        priorityConfig.borderColor,
        isDragging && 'opacity-40',
        isOverlay && 'z-50 rotate-2 scale-105 cursor-grabbing shadow-2xl ring-2 ring-qualia-500',
        isUrgent && 'bg-red-500/5'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 cursor-grab rounded-lg p-1.5 opacity-0 transition-all hover:bg-muted group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Urgent Indicator */}
      {isUrgent && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Content */}
      <div>
        {/* Title */}
        <h4 className="mb-2 line-clamp-2 pr-6 text-sm font-medium leading-snug text-foreground/90">
          {task.title}
        </h4>

        {/* Description Preview */}
        {task.description && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
            {task.description}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority Badge */}
            <div
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 transition-colors',
                priorityConfig.bgColor
              )}
            >
              <PriorityIcon className={cn('h-3 w-3', priorityConfig.color)} />
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  priorityConfig.color
                )}
              >
                {task.priority === 'No Priority' ? 'None' : task.priority}
              </span>
            </div>

            {/* Project Badge */}
            {task.project && (
              <div className="flex items-center gap-1 rounded-lg bg-qualia-500/10 px-2 py-1">
                <Folder className="h-3 w-3 text-qualia-500" />
                <span className="max-w-[70px] truncate text-[10px] font-medium text-qualia-500">
                  {task.project.name}
                </span>
              </div>
            )}
          </div>

          {/* Assignees */}
          {hasAssignees ? (
            <div className="flex -space-x-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <div
                  key={assignee.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-qualia-500/20 to-qualia-600/30 shadow-sm"
                  title={assignee.full_name || 'Unknown'}
                >
                  {assignee.avatar_url ? (
                    <span
                      className="h-full w-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${assignee.avatar_url})` }}
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-qualia-600">
                      {(assignee.full_name || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold shadow-sm">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-border/60 bg-muted/30">
              <User className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(new Date(task.updated_at))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const BoardCard = memo(BoardCardInner, (prev, next) => {
  return (
    prev.task.id === next.task.id &&
    prev.task.title === next.task.title &&
    prev.task.status === next.task.status &&
    prev.task.priority === next.task.priority &&
    prev.task.updated_at === next.task.updated_at &&
    prev.isOverlay === next.isOverlay &&
    JSON.stringify(prev.task.assignees) === JSON.stringify(next.task.assignees)
  );
});
