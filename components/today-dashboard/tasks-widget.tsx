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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={cn(
        'group mx-1 flex items-start gap-3 rounded-xl px-3 py-3 transition-all duration-200',
        'hover:bg-white/[0.04]',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !isCompleted)}
        disabled={isPending}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
          isCompleted
            ? 'border-amber-500/50 bg-amber-500 text-black'
            : 'border-zinc-600 hover:border-amber-500/50 hover:bg-amber-500/10'
        )}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'text-[13px] font-medium leading-tight',
            isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-100'
          )}
        >
          {task.title}
        </span>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {task.project && (
            <span className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-2 py-0.5">
              <FolderOpen className="h-3 w-3 text-zinc-400" />
              <span className="max-w-[100px] truncate">{task.project.name}</span>
            </span>
          )}
          {task.due_date && !isCompleted && (
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-0.5',
                overdue && 'bg-red-500/10 text-red-400',
                dueToday && !overdue && 'bg-amber-500/10 text-amber-400',
                !overdue && !dueToday && 'bg-zinc-800/50'
              )}
            >
              <Clock className="h-3 w-3" />
              {overdue ? 'Overdue' : formatDueTime(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  userColorMap.get(task.assignee.id)?.bg || 'bg-purple-500'
                )}
              />
              <span className="text-zinc-400">{task.assignee.full_name?.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {task.priority !== 'No Priority' && (
          <div
            className={cn(
              'flex h-6 items-center rounded-md px-1.5',
              task.priority === 'Urgent' && 'bg-red-500/10',
              task.priority === 'High' && 'bg-orange-500/10',
              task.priority === 'Medium' && 'bg-amber-500/10',
              task.priority === 'Low' && 'bg-emerald-500/10'
            )}
          >
            <Circle className={cn('h-2 w-2', PRIORITY_CONFIG[task.priority])} />
          </div>
        )}
        <div className="flex items-center gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                  onClick={() => onEdit(task)}
                  disabled={isPending}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                  onClick={() => onHide(task.id)}
                  disabled={isPending}
                >
                  <EyeOff className="h-3.5 w-3.5" />
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
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
              <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="text-sm font-semibold text-white">Tasks</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {pendingTasks} pending{completedTasks > 0 && ` · ${completedTasks} done`}
          </p>
        </div>

        {/* User filter */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800/50 p-1">
          <button
            onClick={() => setSelectedUserId(null)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              selectedUserId === null
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            All
          </button>
          <button
            onClick={() => setSelectedUserId(MOAYAD_ID)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              selectedUserId === MOAYAD_ID
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', MOAYAD_COLOR.bg)} />M
          </button>
          {teamMembers.slice(0, 3).map((member) => {
            const color = userColorMap.get(member.id);
            return (
              <button
                key={member.id}
                onClick={() => setSelectedUserId(member.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                  selectedUserId === member.id
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', color?.bg)} />
                {member.full_name?.split(' ')[0]?.[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
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
          placeholder="Add a new task..."
          disabled={isAddingTask}
          className="h-9 flex-1 rounded-lg bg-zinc-800/50 px-3 text-sm text-white outline-none ring-1 ring-white/[0.06] transition-all placeholder:text-zinc-500 focus:ring-amber-500/50"
        />
        <Button
          size="sm"
          onClick={handleQuickAdd}
          disabled={!quickAddValue.trim() || isAddingTask}
          className="h-9 w-9 rounded-lg bg-amber-500/20 p-0 text-amber-400 transition-all hover:bg-amber-500/30 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Task List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {visibleTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Check className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-white">All done!</p>
            <p className="mt-1 text-xs text-zinc-500">No pending tasks</p>
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
