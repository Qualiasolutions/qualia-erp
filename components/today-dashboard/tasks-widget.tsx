'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ListTodo, Circle, Clock, EyeOff, FolderOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, toggleTaskInbox } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';

interface Task {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  due_date: string | null;
  show_in_inbox?: boolean;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

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
  'No Priority': 'fill-slate-400 text-slate-400',
};

// User colors - alternating colors for team members
const USER_COLORS = [
  { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500' },
  { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500' },
  { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
];

function formatDueTime(dueDate: string): string {
  const date = parseISO(dueDate);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
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

// Single Task Item - shows task with project name and assignee
const TaskItem = React.memo(function TaskItem({
  task,
  onToggle,
  onHide,
  isPending,
  userColorMap,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onHide: (taskId: string) => void;
  isPending: boolean;
  userColorMap: Map<string, { text: string; bg: string }>;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);

  return (
    <div className="group flex items-start gap-2 px-1 py-3 transition-colors hover:bg-muted/30">
      <Checkbox
        id={task.id}
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(task.id, checked as boolean)}
        className="mt-0.5 shrink-0"
        disabled={isPending}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={task.id}
          className={cn(
            'block cursor-pointer text-sm leading-tight',
            isCompleted && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </label>
        {/* Project name (left/green) and assignee (right/purple) */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.project && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <FolderOpen className="h-3 w-3" />
                {task.project.name}
              </span>
            )}
            {task.due_date && !isCompleted && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-muted-foreground'
                )}
              >
                <Clock className="h-3 w-3" />
                {overdue
                  ? 'Overdue'
                  : dueToday
                    ? `Due ${formatDueTime(task.due_date)}`
                    : formatDueTime(task.due_date)}
              </span>
            )}
          </div>
          {task.assignee && (
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                userColorMap.get(task.assignee.id)?.text || 'text-purple-600 dark:text-purple-400'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  userColorMap.get(task.assignee.id)?.bg || 'bg-purple-500'
                )}
              />
              {task.assignee.full_name || 'Unknown'}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Circle className={cn('h-2 w-2', PRIORITY_CONFIG[task.priority])} />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onHide(task.id)}
                disabled={isPending}
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Hide from dashboard</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

export function TasksWidget({ tasks, teamMembers }: TasksWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Create color map for each team member
  const userColorMap = React.useMemo(() => {
    const map = new Map<string, { text: string; bg: string }>();
    teamMembers.forEach((member, index) => {
      map.set(member.id, USER_COLORS[index % USER_COLORS.length]);
    });
    return map;
  }, [teamMembers]);

  // Filter out hidden tasks and optionally by selected user
  const visibleTasks = tasks.filter((t) => {
    if (hiddenTasks.has(t.id)) return false;
    if (selectedUserId && t.assignee?.id !== selectedUserId) return false;
    return true;
  });
  const pendingTasks = visibleTasks.filter((t) => t.status !== 'Done').length;

  const handleToggleTask = (taskId: string, completed: boolean) => {
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: completed ? 'Done' : 'Todo' });
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  const handleHideTask = (taskId: string) => {
    // Optimistic update - hide immediately
    setHiddenTasks((prev) => new Set(prev).add(taskId));

    startTransition(async () => {
      await toggleTaskInbox(taskId, false);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  return (
    <Card className={cn('flex h-full flex-col', isPending && 'pointer-events-none opacity-70')}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            All Tasks
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {pendingTasks} pending
          </Badge>
        </div>
        {/* User filter */}
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex gap-1">
            <Button
              variant={selectedUserId === null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedUserId(null)}
            >
              All
            </Button>
            {teamMembers.map((member) => {
              const color = userColorMap.get(member.id);
              return (
                <Button
                  key={member.id}
                  variant={selectedUserId === member.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setSelectedUserId(member.id)}
                >
                  <span className={cn('h-2 w-2 rounded-full', color?.bg)} />
                  {member.full_name?.split(' ')[0] || 'Unknown'}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-3 pb-4">
        {visibleTasks.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <ListTodo className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tasks</p>
            <p className="text-xs text-muted-foreground/70">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onHide={handleHideTask}
                isPending={isPending}
                userColorMap={userColorMap}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
