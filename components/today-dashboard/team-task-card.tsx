'use client';

import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import {
  Calendar,
  Check,
  Globe,
  Bot,
  Phone,
  Sparkles,
  TrendingUp,
  Smartphone,
  Megaphone,
  Folder,
  Eye,
} from 'lucide-react';
import { ISSUE_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/lib/color-constants';
import type { TeamMemberTask } from '@/app/actions/team-dashboard';
import { updateTask, getTaskById, type Task } from '@/app/actions/inbox';
import { invalidateTeamDashboard, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { TaskDetailDialog } from '@/components/task-detail-dialog';

const PROJECT_TYPE_STYLES: Record<
  string,
  { icon: typeof Globe; color: string; bg: string; border: string }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  ai_platform: {
    icon: Sparkles,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  app: {
    icon: Smartphone,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

interface TeamTaskCardProps {
  task: TeamMemberTask;
  currentUserId?: string | null;
  onTaskUpdate?: () => void;
  workspaceId?: string;
  isAdmin?: boolean;
}

export const TeamTaskCard = memo(function TeamTaskCard({
  task,
  onTaskUpdate,
  workspaceId,
}: TeamTaskCardProps) {
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const priorityColor = ISSUE_PRIORITY_COLORS[task.priority as keyof typeof ISSUE_PRIORITY_COLORS];
  const statusColors = TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS];

  const isOverdue =
    task.due_date &&
    !['Done'].includes(task.status) &&
    isPast(new Date(task.due_date + 'T23:59:59'));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  // Project type styling
  const typeStyle = task.project?.project_type
    ? PROJECT_TYPE_STYLES[task.project.project_type]
    : null;
  const ProjectIcon = typeStyle?.icon || Folder;

  const handleView = async () => {
    const result = await getTaskById(task.id);
    if (result.success && result.data) {
      setViewTask(result.data as Task);
      setViewOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-3 px-4 py-2.5 transition-all duration-200',
          'hover:bg-muted/30',
          task.status === 'In Progress' && 'bg-blue-500/[0.02]'
        )}
      >
        {/* Active task left accent */}
        {task.status === 'In Progress' && (
          <div className="absolute inset-y-0 left-0 w-[2px] rounded-r-full bg-blue-500/60" />
        )}

        {/* Project color indicator — vertical bar */}
        {task.project && (
          <div
            className={cn(
              'absolute inset-y-1 left-0 w-[3px] rounded-r-full',
              task.status !== 'In Progress' &&
                (typeStyle?.bg?.replace('/10', '/60') || 'bg-muted-foreground/20')
            )}
            style={
              task.status !== 'In Progress' && typeStyle
                ? {
                    backgroundColor: `var(--tw-${typeStyle.color.replace('text-', '')}, currentColor)`,
                  }
                : undefined
            }
          />
        )}

        {/* Priority dot */}
        <span
          className={cn(
            'group-hover:ring-current/10 size-1.5 shrink-0 rounded-full ring-2 ring-transparent transition-all duration-200',
            priorityColor ? priorityColor.icon.replace('text-', 'bg-') : 'bg-slate-300'
          )}
          title={task.priority}
        />

        {/* Status circle — opens task detail to mark done from there */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleView();
          }}
          className={cn(
            'flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
            statusColors
              ? `${statusColors.border} ${task.status === 'In Progress' ? 'border-blue-500' : ''}`
              : 'border-muted-foreground/30',
            task.status === 'Done' && 'border-emerald-500 bg-emerald-500',
            task.status === 'In Progress' && 'border-blue-500',
            task.status === 'Todo' &&
              'border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10 group-hover:border-muted-foreground/50'
          )}
          title={task.status === 'Done' ? 'Mark as todo' : 'Mark as done'}
        >
          {task.status === 'Done' && <Check className="size-2 text-white" />}
          {task.status === 'In Progress' && (
            <span className="block size-full scale-[0.4] rounded-full bg-blue-500" />
          )}
        </button>

        {/* Title + project badge */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[13px] font-medium leading-tight text-foreground transition-colors duration-200',
              task.status === 'Done' && 'text-muted-foreground/60 line-through',
              task.status === 'In Progress' && 'text-foreground'
            )}
          >
            {task.title}
          </span>
          {task.project && (
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                typeStyle
                  ? `${typeStyle.bg} ${typeStyle.border} ${typeStyle.color}`
                  : 'border-border bg-muted/30 text-muted-foreground/70'
              )}
            >
              <ProjectIcon className="size-3" />
              {task.project.name}
            </span>
          )}
        </div>

        {/* Right side: due date + actions */}
        <div className="flex shrink-0 items-center gap-2 opacity-80 transition-opacity duration-200 group-hover:opacity-100">
          {task.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                isOverdue
                  ? 'bg-red-500/8 text-red-600 ring-1 ring-inset ring-red-500/15 dark:bg-red-500/10 dark:text-red-400'
                  : isDueToday
                    ? 'bg-amber-500/8 text-amber-700 ring-1 ring-inset ring-amber-500/15 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-muted/60 text-muted-foreground/70'
              )}
            >
              <Calendar className="size-2.5" />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}

          {/* View button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-all duration-200 hover:bg-primary/20 dark:text-primary"
          >
            <Eye className="size-3" />
            View
          </button>
        </div>
      </div>

      {/* View dialog */}
      {viewTask && (
        <TaskDetailDialog
          task={viewTask}
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open);
            if (!open) setViewTask(null);
          }}
          onEdit={(t) => {
            setViewOpen(false);
            setViewTask(null);
            setEditTask(t);
            setEditOpen(true);
          }}
          onToggleDone={async (t) => {
            const newStatus = t.status === 'Done' ? 'Todo' : 'Done';
            const fd = new FormData();
            fd.set('id', t.id);
            fd.set('status', newStatus);
            await updateTask(fd);
            if (workspaceId) invalidateTeamDashboard(workspaceId);
            invalidateInboxTasks(true);
            invalidateDailyFlow(true);
            onTaskUpdate?.();
            setViewOpen(false);
            setViewTask(null);
          }}
        />
      )}

      {/* Edit modal */}
      {editTask && (
        <EditTaskModal
          task={editTask}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditTask(null);
              if (workspaceId) invalidateTeamDashboard(workspaceId);
              invalidateInboxTasks(true);
              invalidateDailyFlow(true);
              onTaskUpdate?.();
            }
          }}
        />
      )}
    </>
  );
});
