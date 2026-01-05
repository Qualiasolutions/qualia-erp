'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTask } from '@/app/actions/inbox';
import { invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';

interface Task {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  due_date: string | null;
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

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tasks: Task[];
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

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

// Single Task Item
const TaskItem = React.memo(function TaskItem({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
}) {
  const isCompleted = task.status === 'Done';
  const overdue = isOverdue(task.due_date);
  const dueToday = isDueToday(task.due_date);

  return (
    <div className="flex items-start gap-3 py-1.5">
      <Checkbox
        id={task.id}
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(task.id, checked as boolean)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={task.id}
          className={cn(
            'cursor-pointer text-sm',
            isCompleted && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </label>
        {task.due_date && !isCompleted && (
          <div className="mt-0.5 flex items-center gap-1">
            <Clock
              className={cn(
                'h-3 w-3',
                overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-xs',
                overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-muted-foreground'
              )}
            >
              {overdue
                ? 'Overdue'
                : dueToday
                  ? `Due ${formatDueTime(task.due_date)}`
                  : formatDueTime(task.due_date)}
            </span>
          </div>
        )}
        {task.project && (
          <span className="text-xs text-muted-foreground/70">{task.project.name}</span>
        )}
      </div>
      <Circle className={cn('h-2 w-2 shrink-0', PRIORITY_CONFIG[task.priority])} />
    </div>
  );
});

export function TasksWidget({ tasks, teamMembers }: TasksWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Group tasks by assignee
  const tasksByMember: TeamMember[] = React.useMemo(() => {
    const memberMap = new Map<string, TeamMember>();

    // Initialize with team members
    teamMembers.forEach((member) => {
      memberMap.set(member.id, {
        ...member,
        tasks: [],
      });
    });

    // Add unassigned bucket
    memberMap.set('unassigned', {
      id: 'unassigned',
      full_name: 'Unassigned',
      avatar_url: null,
      tasks: [],
    });

    // Group tasks
    tasks.forEach((task) => {
      const assigneeId = task.assignee?.id || 'unassigned';
      const member = memberMap.get(assigneeId);
      if (member) {
        member.tasks.push(task);
      } else {
        // Create member entry if not found
        memberMap.set(assigneeId, {
          id: assigneeId,
          full_name: task.assignee?.full_name || 'Unknown',
          avatar_url: task.assignee?.avatar_url || null,
          tasks: [task],
        });
      }
    });

    // Filter out members with no tasks and sort by task count
    return Array.from(memberMap.values())
      .filter((m) => m.tasks.length > 0)
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [tasks, teamMembers]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const pendingTasks = totalTasks - completedTasks;

  const handleToggleTask = (taskId: string, completed: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('id', taskId);
      formData.set('status', completed ? 'Done' : 'Todo');

      await updateTask(formData);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
      router.refresh();
    });
  };

  return (
    <Card className={cn('flex h-full flex-col', isPending && 'pointer-events-none opacity-70')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            Tasks
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {pendingTasks} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-3 pb-4">
        {tasksByMember.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <ListTodo className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tasks for today</p>
            <p className="text-xs text-muted-foreground/70">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {tasksByMember.map((member) => (
              <div key={member.id}>
                {/* Team member header */}
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{member.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {member.tasks.filter((t) => t.status !== 'Done').length} pending
                  </span>
                </div>

                {/* Tasks list */}
                <div className="space-y-1 pl-8">
                  {member.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={handleToggleTask} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
