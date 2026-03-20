'use client';

import { useState } from 'react';
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
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ISSUE_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/lib/color-constants';
import type { TeamMemberTask } from '@/app/actions/team-dashboard';
import { TaskTimeTracker } from '@/components/task-time-tracker';
import { updateTask, deleteTask, getTaskById, type Task } from '@/app/actions/inbox';
import { invalidateTeamDashboard, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function TeamTaskCard({
  task,
  currentUserId,
  onTaskUpdate,
  workspaceId,
  isAdmin,
}: TeamTaskCardProps) {
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const priorityColor = ISSUE_PRIORITY_COLORS[task.priority as keyof typeof ISSUE_PRIORITY_COLORS];
  const statusColors = TASK_STATUS_COLORS[task.status as keyof typeof TASK_STATUS_COLORS];

  const isOverdue =
    task.due_date &&
    !['Done'].includes(task.status) &&
    isPast(new Date(task.due_date + 'T23:59:59'));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const isOwner = currentUserId != null && currentUserId === task.assignee_id;

  // Project type styling
  const typeStyle = task.project?.project_type
    ? PROJECT_TYPE_STYLES[task.project.project_type]
    : null;
  const ProjectIcon = typeStyle?.icon || Folder;

  const handleEdit = async () => {
    const result = await getTaskById(task.id);
    if (result.success && result.data) {
      setEditTask(result.data as Task);
      setEditOpen(true);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const result = await deleteTask(task.id);
    if (result.success) {
      if (workspaceId) invalidateTeamDashboard(workspaceId);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      onTaskUpdate?.();
    }
    setDeleting(false);
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-3 px-4 py-2.5 transition-all duration-200',
          'hover:bg-muted/30',
          task.status === 'In Progress' && 'bg-blue-500/[0.02]',
          deleting && 'pointer-events-none opacity-40'
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

        {/* Status circle — clickable to mark as done */}
        <button
          type="button"
          disabled={marking || task.status === 'Done'}
          onClick={async (e) => {
            e.stopPropagation();
            if (marking || task.status === 'Done') return;
            setMarking(true);
            const fd = new FormData();
            fd.set('id', task.id);
            fd.set('status', 'Done');
            const result = await updateTask(fd);
            if (result.success) {
              if (workspaceId) invalidateTeamDashboard(workspaceId);
              invalidateInboxTasks(true);
              invalidateDailyFlow(true);
              onTaskUpdate?.();
            }
            setMarking(false);
          }}
          className={cn(
            'flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
            statusColors
              ? `${statusColors.border} ${task.status === 'In Progress' ? 'border-blue-500' : ''}`
              : 'border-muted-foreground/30',
            task.status === 'Done' && 'border-emerald-500 bg-emerald-500',
            task.status === 'In Progress' && 'border-blue-500',
            task.status === 'Todo' &&
              'border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10 group-hover:border-muted-foreground/50',
            marking && 'animate-pulse border-emerald-500 bg-emerald-500/20'
          )}
          title={task.status === 'Done' ? 'Done' : 'Mark as done'}
        >
          {task.status === 'Done' && <Check className="size-2 text-white" />}
          {task.status === 'In Progress' && !marking && (
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
                  : 'border-border/40 bg-muted/30 text-muted-foreground/70'
              )}
            >
              <ProjectIcon className="size-3" />
              {task.project.name}
            </span>
          )}
        </div>

        {/* Right side: due date + time spent + actions */}
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

          {/* Time tracker: interactive for task owner, read-only badge for others */}
          {isOwner ? (
            <TaskTimeTracker
              taskId={task.id}
              timeLog={task.time_log}
              readOnly={false}
              onUpdate={onTaskUpdate}
            />
          ) : (
            <TaskTimeTracker taskId={task.id} timeLog={task.time_log} readOnly />
          )}

          {/* Admin actions menu */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="mr-2 size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

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
}
