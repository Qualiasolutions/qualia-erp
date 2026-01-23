'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, Clock, EyeOff, FolderOpen, Edit2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, toggleTaskInbox, createTask, type Task } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksWidgetProps {
  tasks: Task[];
  teamMembers: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

const PRIORITY_CONFIG = {
  Urgent: 'fill-red-500 text-red-500',
  High: 'fill-orange-500 text-orange-500',
  Medium: 'fill-amber-500 text-amber-500',
  Low: 'fill-emerald-500 text-emerald-500',
  'No Priority': 'fill-muted-foreground/30 text-muted-foreground/30',
};

const USER_COLORS = [
  { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500' },
  { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500' },
  { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
];

const MOAYAD_COLOR = { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500' };
const MOAYAD_ID = 'moayad-special';

function formatDueTime(dueDate: string): string {
  const date = parseISO(dueDate);
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d');
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(parseISO(dueDate));
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
}

const TaskItem = React.memo(function TaskItem({
  task,
  onToggle,
  onHide,
  onEdit,
  isPending,
  userColorMap,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  onEdit: (task: Task) => void;
  isPending: boolean;
  userColorMap: Map<string, { text: string; bg: string }>;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'group flex items-start gap-3 px-4 py-2.5 transition-colors',
        'hover:bg-muted/30',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        disabled={isPending}
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all',
          isCompleted
            ? 'border-foreground/20 bg-foreground text-background'
            : 'border-border hover:border-foreground/40'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-[13px] leading-tight',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>

        {/* Meta row */}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {task.project && (
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {task.project.name}
            </span>
          )}
          {task.due_date && !isCompleted && (
            <span
              className={cn(
                'flex items-center gap-1',
                overdue && 'text-red-500',
                dueToday && !overdue && 'text-amber-500'
              )}
            >
              <Clock className="h-3 w-3" />
              {overdue ? 'Overdue' : formatDueTime(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  userColorMap.get(task.assignee.id)?.bg || 'bg-purple-500'
                )}
              />
              {task.assignee.full_name?.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {task.priority !== 'No Priority' && (
          <Circle className={cn('h-2 w-2', PRIORITY_CONFIG[task.priority])} />
        )}
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit(task)}
                  disabled={isPending}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onHide(task.id)}
                  disabled={isPending}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Hide</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
});

export function TasksWidget({ tasks, teamMembers }: TasksWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title) return;

    setIsAddingTask(true);
    const formData = new FormData();
    formData.set('title', title);
    formData.set('status', 'Todo');
    formData.set('show_in_inbox', 'true');

    const result = await createTask(formData);
    if (result.success) {
      setQuickAddValue('');
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    }
    setIsAddingTask(false);
  };

  const userColorMap = React.useMemo(() => {
    const map = new Map<string, { text: string; bg: string }>();
    teamMembers.forEach((member, index) => {
      map.set(member.id, USER_COLORS[index % USER_COLORS.length]);
    });
    return map;
  }, [teamMembers]);

  const visibleTasks = tasks.filter((t) => {
    if (hiddenTasks.has(t.id)) return false;
    if (selectedUserId) {
      if (selectedUserId === MOAYAD_ID) {
        return t.assignee?.full_name?.toLowerCase().includes('moayad');
      }
      if (t.assignee?.id !== selectedUserId) return false;
    }
    return true;
  });

  const pendingTasks = visibleTasks.filter((t) => t.status !== 'Done').length;
  const completedTasks = visibleTasks.filter((t) => t.status === 'Done').length;

  const handleToggleTask = (taskId: string, completed: boolean) => {
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: completed ? 'Done' : 'Todo' });
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  const handleHideTask = (taskId: string) => {
    setHiddenTasks((prev) => new Set(prev).add(taskId));
    startTransition(async () => {
      await toggleTaskInbox(taskId, false);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  return (
    <div className={cn('flex h-full flex-col', isPending && 'pointer-events-none opacity-70')}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Tasks</h3>
          <p className="text-xs text-muted-foreground">
            {pendingTasks} pending{completedTasks > 0 && ` · ${completedTasks} done`}
          </p>
        </div>

        {/* User filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedUserId(null)}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              selectedUserId === null
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            onClick={() => setSelectedUserId(MOAYAD_ID)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              selectedUserId === MOAYAD_ID
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', MOAYAD_COLOR.bg)} />M
          </button>
          {teamMembers.slice(0, 3).map((member) => {
            const color = userColorMap.get(member.id);
            return (
              <button
                key={member.id}
                onClick={() => setSelectedUserId(member.id)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                  selectedUserId === member.id
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', color?.bg)} />
                {member.full_name?.split(' ')[0]?.[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <input
          type="text"
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAddingTask) {
              e.preventDefault();
              handleQuickAdd();
            }
          }}
          placeholder="Add task..."
          disabled={isAddingTask}
          className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleQuickAdd}
          disabled={!quickAddValue.trim() || isAddingTask}
          className="h-7 w-7 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Task List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">All done!</p>
            <p className="mt-1 text-xs text-muted-foreground/60">No pending tasks</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onHide={handleHideTask}
                onEdit={setEditingTask}
                isPending={isPending}
                userColorMap={userColorMap}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask as Task}
          open={!!editingTask}
          onOpenChange={(open: boolean) => !open && setEditingTask(null)}
        />
      )}
    </div>
  );
}
