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

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof Circle }> = {
  Urgent: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: AlertTriangle },
  High: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: AlertCircle },
  Medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: Minus },
  Low: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Circle },
  'No Priority': { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: Minus },
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(task.id)}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-all duration-200',
        'hover:border-primary/30 hover:shadow-sm',
        isDragging && 'opacity-40',
        isOverlay && 'z-50 rotate-1 scale-105 cursor-grabbing shadow-2xl ring-2 ring-primary'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 cursor-grab rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Priority Bar */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 rounded-l-xl',
          priorityConfig.color.replace('text-', 'bg-')
        )}
      />

      {/* Content */}
      <div className="pl-2">
        {/* Title */}
        <h4 className="mb-2 line-clamp-2 pr-6 text-sm font-medium leading-snug">{task.title}</h4>

        {/* Description Preview */}
        {task.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Priority */}
            <div
              className={cn('flex items-center gap-1 rounded-md px-2 py-1', priorityConfig.bgColor)}
            >
              <PriorityIcon className={cn('h-3 w-3', priorityConfig.color)} />
              <span className={cn('text-[10px] font-medium', priorityConfig.color)}>
                {task.priority === 'No Priority' ? 'None' : task.priority}
              </span>
            </div>

            {/* Project */}
            {task.project && (
              <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                <Folder className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
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
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-qualia-600/20"
                  title={assignee.full_name || 'Unknown'}
                >
                  {assignee.avatar_url ? (
                    <span
                      className="h-full w-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${assignee.avatar_url})` }}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-qualia-500">
                      {(assignee.full_name || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border">
              <User className="h-3 w-3 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Time */}
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatRelativeTime(new Date(task.updated_at))}</span>
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
