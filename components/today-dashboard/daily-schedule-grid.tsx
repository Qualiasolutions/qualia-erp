'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Plus,
  Video,
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, quickUpdateTask } from '@/app/actions/inbox';
import { type MeetingWithRelations, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import { EditTaskModal } from '@/components/edit-task-modal';
import { NewTaskModalControlled } from '@/components/new-task-modal';

// Schedule config
const SCHEDULE_START_HOUR = 8; // 8:00 AM
const SCHEDULE_END_HOUR = 18; // 6:00 PM
const SLOT_DURATION_MINUTES = 60;
const TOTAL_SLOTS = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR; // 10 slots (1 per hour)

interface ScheduleItem {
  id: string;
  type: 'task' | 'meeting';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
  meeting?: MeetingWithRelations;
}

interface DailyScheduleGridProps {
  tasks: Task[];
  meetings: MeetingWithRelations[];
}

// Generate time slot labels
function getSlotLabel(slotIndex: number): string {
  const hour = SCHEDULE_START_HOUR + slotIndex;
  const d = setMinutes(setHours(new Date(), hour), 0);
  return format(d, 'h a');
}

// Get percentage position for a time within the schedule
function getTimePercent(time: Date): number {
  const hours = time.getHours() + time.getMinutes() / 60;
  const offset = hours - SCHEDULE_START_HOUR;
  const totalHours = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;
  return Math.max(0, Math.min((offset / totalHours) * 100, 100));
}

// Get percentage height for a duration
function getItemHeightPercent(start: Date, end: Date): number {
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const totalHours = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;
  return Math.max((100 / totalHours) * 0.4, (durationHours / totalHours) * 100);
}

// Priority border color mapping
const PRIORITY_BORDER: Record<string, string> = {
  Urgent: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-blue-500',
  'No Priority': 'border-l-zinc-400 dark:border-l-zinc-600',
};

// ===== SCHEDULE ITEM CARD =====
function ScheduleItemCard({
  item,
  style,
  isOverlapping,
  onTaskClick,
  onTaskComplete,
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  isOverlapping: boolean;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}) {
  if (item.type === 'meeting') {
    return (
      <div
        className={cn(
          'absolute rounded-md border border-l-[3px] border-violet-500/40 border-l-violet-500 bg-violet-500/10 p-2 transition-all hover:bg-violet-500/15',
          isOverlapping && 'w-[48%]'
        )}
        style={style}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-foreground/60">
              <Clock className="size-2.5" />
              <span>
                {format(item.startTime, 'h:mm')} - {format(item.endTime, 'h:mm a')}
              </span>
            </div>
            {item.meeting?.client && (
              <p className="mt-0.5 truncate text-[10px] text-foreground/50">
                {(item.meeting.client as { display_name?: string }).display_name}
              </p>
            )}
          </div>
          {item.meeting?.meeting_link && (
            <a
              href={item.meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-5 shrink-0 items-center gap-1 rounded bg-violet-500 px-1.5 text-[10px] font-medium text-white hover:bg-violet-400"
            >
              <Video className="size-2.5" />
              Join
            </a>
          )}
        </div>
      </div>
    );
  }

  // Task card
  const task = item.task;
  if (!task) return null;

  const priorityBorder = PRIORITY_BORDER[task.priority] || PRIORITY_BORDER['No Priority'];
  const isDone = task.status === 'Done';

  return (
    <div
      className={cn(
        'absolute cursor-pointer rounded-md border border-l-[3px] bg-card p-2 transition-all hover:bg-accent/50',
        priorityBorder,
        isDone && 'opacity-50',
        isOverlapping && 'w-[48%]'
      )}
      style={style}
      onClick={() => onTaskClick(task)}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskComplete(task.id);
          }}
          className="mt-0.5 shrink-0"
        >
          {isDone ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Circle className="size-3.5 text-foreground/30 hover:text-foreground/60" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn('truncate text-xs font-medium text-foreground', isDone && 'line-through')}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-foreground/60">
            <Clock className="size-2.5" />
            <span>
              {format(item.startTime, 'h:mm')} - {format(item.endTime, 'h:mm a')}
            </span>
            {task.project && (
              <>
                <span className="text-foreground/30">·</span>
                <span className="truncate">{task.project.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== UNSCHEDULED TASK ROW =====
function UnscheduledTaskRow({
  task,
  onTaskClick,
  onTaskComplete,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}) {
  const isDone = task.status === 'Done';
  const priorityColor = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];

  return (
    <div
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
      onClick={() => onTaskClick(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTaskComplete(task.id);
        }}
        className="shrink-0"
      >
        {isDone ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Circle className="size-3.5 text-foreground/30 hover:text-foreground/60" />
        )}
      </button>
      <span
        className={cn(
          'flex-1 truncate text-[13px] text-foreground',
          isDone && 'line-through opacity-50'
        )}
      >
        {task.title}
      </span>
      {task.project && (
        <span className="max-w-[100px] shrink-0 truncate text-[10px] text-foreground/40">
          {task.project.name}
        </span>
      )}
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
          priorityColor?.bg,
          priorityColor?.text
        )}
      >
        {priorityColor?.label}
      </span>
    </div>
  );
}

// ===== MAIN COMPONENT =====
export function DailyScheduleGrid({ tasks, meetings }: DailyScheduleGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [, setPrefilledTime] = useState<string | null>(null);

  // Update current time every 60s
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // No scroll needed - grid fits in viewport

  // Split tasks into scheduled and unscheduled
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];

    tasks.forEach((task) => {
      if (task.scheduled_start_time && task.scheduled_end_time) {
        const start = parseISO(task.scheduled_start_time);
        if (isToday(start) || isSameDay(start, new Date())) {
          scheduled.push(task);
        } else {
          unscheduled.push(task);
        }
      } else {
        unscheduled.push(task);
      }
    });

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks]);

  // Build schedule items (tasks + meetings)
  const scheduleItems = useMemo(() => {
    const items: ScheduleItem[] = [];

    // Add scheduled tasks
    scheduledTasks.forEach((task) => {
      if (task.scheduled_start_time && task.scheduled_end_time) {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          startTime: parseISO(task.scheduled_start_time),
          endTime: parseISO(task.scheduled_end_time),
          task,
        });
      }
    });

    // Add today's meetings
    meetings.forEach((meeting) => {
      const start = parseISO(meeting.start_time);
      if (isToday(start)) {
        items.push({
          id: `meeting-${meeting.id}`,
          type: 'meeting',
          title: meeting.title,
          startTime: start,
          endTime: parseISO(meeting.end_time),
          meeting,
        });
      }
    });

    return items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [scheduledTasks, meetings]);

  // Detect overlapping items
  const itemPositions = useMemo(() => {
    const positions = new Map<string, { style: React.CSSProperties; isOverlapping: boolean }>();

    // Group overlapping items
    const sorted = [...scheduleItems].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const top = getTimePercent(item.startTime);
      const height = getItemHeightPercent(item.startTime, item.endTime);

      // Check for overlaps with other items
      let isOverlapping = false;
      let isSecondColumn = false;

      for (let j = 0; j < i; j++) {
        const other = sorted[j];
        if (item.startTime < other.endTime && item.endTime > other.startTime) {
          isOverlapping = true;
          const otherPos = positions.get(other.id);
          if (otherPos && !otherPos.style.left) {
            isSecondColumn = true;
          }
        }
      }

      // Mark previous overlapping items too
      if (isOverlapping) {
        for (let j = 0; j < i; j++) {
          const other = sorted[j];
          if (item.startTime < other.endTime && item.endTime > other.startTime) {
            const otherPos = positions.get(other.id);
            if (otherPos) {
              positions.set(other.id, { ...otherPos, isOverlapping: true });
            }
          }
        }
      }

      positions.set(item.id, {
        style: {
          top: `${top}%`,
          height: `${height}%`,
          left: isSecondColumn ? '50%' : undefined,
          right: '4px',
        },
        isOverlapping,
      });
    }

    return positions;
  }, [scheduleItems]);

  // Current time indicator position (percentage)
  const currentTimePosition = useMemo(() => {
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (hour < SCHEDULE_START_HOUR || hour > SCHEDULE_END_HOUR) return null;
    return getTimePercent(currentTime);
  }, [currentTime]);

  // Handle task completion
  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const newStatus = task?.status === 'Done' ? 'Todo' : 'Done';
      await quickUpdateTask(taskId, { status: newStatus as 'Todo' | 'Done' });
      invalidateInboxTasks();
      invalidateDailyFlow();
    },
    [tasks]
  );

  // Handle empty slot click
  const handleSlotClick = useCallback((slotIndex: number) => {
    const totalMinutes = SCHEDULE_START_HOUR * 60 + slotIndex * SLOT_DURATION_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const now = new Date();
    const slotTime = setMinutes(setHours(now, hours), minutes);
    setPrefilledTime(slotTime.toISOString());
    setShowNewTaskModal(true);
  }, []);

  const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
  const pendingUnscheduled = unscheduledTasks.filter((t) => t.status !== 'Done');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-4">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="size-4 text-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Today&apos;s Schedule</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
            {scheduledTasks.filter((t) => t.status !== 'Done').length + todaysMeetings.length}
          </span>
          <span className="text-[11px] text-foreground/40">
            {format(new Date(), 'EEEE, MMM d')}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setPrefilledTime(null);
            setShowNewTaskModal(true);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Schedule Grid - fits in viewport, no scroll */}
      <div className="flex-1 overflow-hidden">
        <div className="relative h-full">
          {/* Time slot lines and labels */}
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex border-b border-border/30"
              style={{ top: `${(i / TOTAL_SLOTS) * 100}%`, height: `${100 / TOTAL_SLOTS}%` }}
            >
              <div className="flex w-16 shrink-0 items-start justify-end pr-3 pt-1">
                <span className="text-[10px] font-medium tabular-nums text-foreground/50">
                  {getSlotLabel(i)}
                </span>
              </div>
              {/* Clickable empty area */}
              <div
                className="flex-1 cursor-pointer transition-colors hover:bg-accent/30"
                onClick={() => handleSlotClick(i)}
              />
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="ml-14 size-2 rounded-full bg-red-500" />
              <div className="h-px flex-1 bg-red-500/50" />
            </div>
          )}

          {/* Schedule items */}
          <div className="absolute inset-0 left-16 right-1">
            {scheduleItems.map((item) => {
              const pos = itemPositions.get(item.id);
              if (!pos) return null;
              return (
                <ScheduleItemCard
                  key={item.id}
                  item={item}
                  style={pos.style}
                  isOverlapping={pos.isOverlapping}
                  onTaskClick={setEditingTask}
                  onTaskComplete={handleTaskComplete}
                />
              );
            })}
          </div>
        </div>

        {/* Unscheduled Tasks Section */}
        <div className="border-t border-border/60">
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            {showUnscheduled ? (
              <ChevronDown className="size-3.5 text-foreground/50" />
            ) : (
              <ChevronRight className="size-3.5 text-foreground/50" />
            )}
            <span className="text-[12px] font-semibold text-foreground/70">Unscheduled</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/50">
              {pendingUnscheduled.length}
            </span>
          </button>
          {showUnscheduled && (
            <div className="pb-4">
              {unscheduledTasks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-foreground/40">No unscheduled tasks</p>
              ) : (
                unscheduledTasks.map((task) => (
                  <UnscheduledTaskRow
                    key={task.id}
                    task={task}
                    onTaskClick={setEditingTask}
                    onTaskComplete={handleTaskComplete}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}
      <NewTaskModalControlled open={showNewTaskModal} onOpenChange={setShowNewTaskModal} />
    </div>
  );
}
