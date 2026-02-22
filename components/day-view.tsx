'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import {
  format,
  addDays,
  subDays,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  isSameDay,
  addMinutes,
  differenceInMinutes,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Trash2,
  Pencil,
  GripVertical,
  Video,
  Plus,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { deleteMeeting, updateMeeting, scheduleIssue, unscheduleIssue } from '@/app/actions';
import { scheduleTask as scheduleTaskAction, unscheduleTask } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import {
  invalidateMeetings,
  invalidateTodaysSchedule,
  invalidateInboxTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';
import { EditTaskModal } from './edit-task-modal';
import { NewTaskModal } from './new-task-modal';
import {
  useTimezone,
  TIMEZONE_CYPRUS,
  type ScheduleTask,
  tasksToScheduleItems,
} from '@/lib/schedule-shared';

type ScheduleItemType = 'meeting' | 'task' | 'issue';

// Legacy issue type (still supported)
interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_time: string;
  end_time: string;
  type: 'issue';
  project: { id: string; name: string; project_group?: string } | null;
  assignee?:
    | { id: string; full_name?: string | null; avatar_url?: string | null }
    | Array<{ full_name?: string | null; avatar_url?: string | null }>
    | null;
}

// Meeting type for this component's props
interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: 'meeting';
  location?: string | null;
  meeting_link?: string | null;
  project: { id: string; name: string; project_group?: string } | null;
  creator?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
  attendees?: Array<{ id: string; profile?: { id: string; full_name?: string | null } | null }>;
}

type AnyScheduleItem = Meeting | Issue | ScheduleTask;

function isMeeting(item: AnyScheduleItem): item is Meeting {
  return item.type === 'meeting';
}

function isTask(item: AnyScheduleItem): item is ScheduleTask {
  return item.type === 'task';
}

interface DayViewProps {
  meetings: Meeting[];
  issues?: Issue[];
  tasks?: Task[];
  embedded?: boolean;
}

const HOUR_HEIGHT = 80;
const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Draggable item component
function DraggableItem({
  item,
  timezone,
  height,
  onEdit,
  onDelete,
  isPending,
}: {
  item: AnyScheduleItem;
  timezone: string;
  height: number;
  onEdit: (item: AnyScheduleItem) => void;
  onDelete: (id: string, type: ScheduleItemType) => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const startTime = toZonedTime(parseISO(item.start_time), timezone);
  const endTime = toZonedTime(parseISO(item.end_time), timezone);

  const isItemMeeting = isMeeting(item);
  const isItemTask = isTask(item);
  const hasLink = isItemMeeting && !!item.meeting_link;

  const handleClick = () => {
    if (hasLink) {
      window.open(item.meeting_link!, '_blank');
    }
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  // Visual styles based on type
  const containerClasses = isItemMeeting
    ? 'border-violet-500/30 bg-violet-500/10 hover:border-violet-500/50 hover:bg-violet-500/15'
    : 'border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50 hover:bg-blue-500/15';

  const draggingClasses = isDragging
    ? isItemMeeting
      ? 'cursor-grabbing shadow-lg ring-2 ring-violet-500/50'
      : 'cursor-grabbing shadow-lg ring-2 ring-blue-500/50'
    : hasLink
      ? 'cursor-pointer'
      : 'cursor-grab';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        'group relative h-full overflow-hidden rounded-lg border p-3 backdrop-blur-sm transition-all',
        containerClasses,
        draggingClasses
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Live/Link indicator */}
      {hasLink && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-emerald-500">
          <Video className="h-3 w-3" />
          <span className="text-[11px] font-medium">Join</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute right-2 top-2 flex gap-1 rounded-md border border-border/50 bg-background/50 p-0.5 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className={cn(
            'rounded-md p-1 text-muted-foreground',
            isItemMeeting
              ? 'hover:bg-violet-500/20 hover:text-violet-400'
              : 'hover:bg-blue-500/20 hover:text-blue-400'
          )}
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id, item.type);
          }}
          disabled={isPending}
          className="rounded-md p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
          title="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-start justify-between gap-2 pl-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isItemTask && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
            {!isItemMeeting && !isItemTask && (
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
            )}
            <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
          </div>

          {height > 50 && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </span>
              </div>
            </div>
          )}

          {height > 70 && item.project && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isItemMeeting ? 'bg-violet-400' : 'bg-blue-400'
                )}
              />
              <div className="truncate text-xs font-medium text-muted-foreground opacity-80">
                {item.project.name}
              </div>
            </div>
          )}

          {height > 90 && item.description && (
            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
              {item.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable time slot component
function TimeSlot({
  hour,
  minute,
  currentDate,
  isOver,
}: {
  hour: number;
  minute: number;
  currentDate: Date;
  isOver: boolean;
}) {
  const slotId = `${hour}:${minute.toString().padStart(2, '0')}`;
  const { setNodeRef } = useDroppable({
    id: slotId,
    data: { hour, minute, date: currentDate },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('relative h-full transition-all duration-200', isOver && 'bg-primary/5')}
      style={{ height: `${HOUR_HEIGHT / 2}px` }}
    >
      <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-border/20" />
      {minute === 0 && <div className="absolute inset-x-0 top-0 border-b border-border/40" />}
    </div>
  );
}

export function DayView({ meetings, issues = [], tasks = [], embedded = false }: DayViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDropSlot, setActiveDropSlot] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTime, setNewTaskTime] = useState<string | null>(null);
  // Future: allow collapsing meetings to right-only column
  // const [collapsedMeetings, setCollapsedMeetings] = useState<Set<string>>(new Set());

  // Convert tasks to schedule items
  const scheduleTasks = useMemo(() => tasksToScheduleItems(tasks), [tasks]);

  // Combine all items
  const allItems = useMemo(() => {
    const meetingItems: AnyScheduleItem[] = meetings.map((m) => ({
      ...m,
      type: 'meeting' as const,
    }));
    const issueItems: AnyScheduleItem[] = issues.map((i) => ({ ...i, type: 'issue' as const }));
    const taskItems: AnyScheduleItem[] = scheduleTasks;
    return [...meetingItems, ...issueItems, ...taskItems];
  }, [meetings, issues, scheduleTasks]);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);
  const todayInTz = startOfDay(nowInTz);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Filter items for the selected day, split by type
  const { dayTasks, dayMeetings } = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    const filteredTasks: AnyScheduleItem[] = [];
    const filteredMeetings: AnyScheduleItem[] = [];
    const filteredIssues: AnyScheduleItem[] = [];

    for (const item of allItems) {
      const itemStart = toZonedTime(parseISO(item.start_time), timezone);
      if (!isSameDay(itemStart, dayStart)) continue;

      if (isMeeting(item)) filteredMeetings.push(item);
      else if (isTask(item)) filteredTasks.push(item);
      else filteredIssues.push(item);
    }

    return {
      dayTasks: [...filteredTasks, ...filteredIssues],
      dayMeetings: filteredMeetings,
    };
  }, [allItems, currentDate, timezone]);

  const totalDayItems = dayTasks.length + dayMeetings.length;

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getItemPosition = useCallback(
    (item: AnyScheduleItem) => {
      const start = toZonedTime(parseISO(item.start_time), timezone);
      const end = toZonedTime(parseISO(item.end_time), timezone);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

      return { top: Math.max(0, topOffset), height: Math.max(30, height) };
    },
    [timezone]
  );

  const handleDelete = useCallback((id: string, type: ScheduleItemType) => {
    if (confirm(`Are you sure you want to remove this ${type}?`)) {
      startTransition(async () => {
        if (type === 'meeting') {
          await deleteMeeting(id);
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
        } else if (type === 'task') {
          await unscheduleTask(id);
          invalidateInboxTasks(true);
          invalidateDailyFlow(true);
        } else {
          await unscheduleIssue(id);
        }
      });
    }
  }, []);

  const handleEdit = useCallback(
    (item: AnyScheduleItem) => {
      if (isMeeting(item)) {
        setEditingMeeting(item);
      } else if (isTask(item)) {
        // Find the full Task object for the edit modal
        const fullTask = tasks.find((t) => t.id === item.id);
        if (fullTask) setEditingTask(fullTask);
      }
    },
    [tasks]
  );

  const handleSlotClick = (hour: number) => {
    setNewTaskTime(`${hour}:00`);
    setIsTaskModalOpen(true);
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    setActiveDropSlot(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      setActiveDropSlot(null);

      const { active, over } = event;
      if (!over) return;

      const itemId = active.id as string;
      const slotId = over.id as string;
      const item = allItems.find((m) => m.id === itemId);

      if (!item) return;

      const [hourStr, minuteStr] = slotId.split(':');
      const newHour = parseInt(hourStr, 10);
      const newMinute = parseInt(minuteStr, 10);

      if (isNaN(newHour) || isNaN(newMinute)) return;

      const originalStart = parseISO(item.start_time);
      const originalEnd = parseISO(item.end_time);
      const duration = differenceInMinutes(originalEnd, originalStart);

      const newStart = setMinutes(setHours(startOfDay(currentDate), newHour), newMinute);
      const newEnd = addMinutes(newStart, duration);

      startTransition(async () => {
        if (isMeeting(item)) {
          await updateMeeting({
            id: itemId,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          });
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
        } else if (isTask(item)) {
          await scheduleTaskAction(itemId, newStart.toISOString(), newEnd.toISOString());
          invalidateInboxTasks(true);
          invalidateDailyFlow(true);
        } else {
          await scheduleIssue(itemId, newStart.toISOString(), newEnd.toISOString());
        }
      });
    },
    [allItems, currentDate]
  );

  const isToday = isSameDay(currentDate, todayInTz);

  const activeItem = useMemo(() => {
    if (!activeDragId) return null;
    return allItems.find((m) => m.id === activeDragId) || null;
  }, [activeDragId, allItems]);

  const isItemOutsideHours = (item: AnyScheduleItem) => {
    const startTime = toZonedTime(parseISO(item.start_time), timezone);
    const endTime = toZonedTime(parseISO(item.end_time), timezone);
    return startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR;
  };

  return (
    <>
      <div className={cn('flex h-full flex-col', embedded ? 'gap-0' : 'space-y-4')}>
        {/* Header Controls */}
        <div
          className={cn(
            'flex items-center justify-between',
            embedded ? 'border-b border-border/30 px-5 py-4' : ''
          )}
        >
          <div className="flex items-center gap-4">
            {embedded && (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
                <Clock className="h-3 w-3 text-violet-500" />
              </div>
            )}
            <div>
              <h2
                className={cn(
                  'font-bold tracking-tight',
                  embedded ? 'text-sm text-foreground' : 'text-2xl text-foreground'
                )}
              >
                {embedded ? 'Schedule' : format(currentDate, 'EEEE, MMMM d')}
              </h2>
              {embedded ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(currentDate, 'MMM d')} · {totalDayItems} events
                </p>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="bg-transparent text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <option value="Europe/Nicosia">Cyprus (Fawzi)</option>
                    <option value="Asia/Amman">Jordan (Moayad)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-1 rounded-lg p-1',
              embedded ? 'bg-muted/30' : 'gap-2 bg-secondary/50'
            )}
          >
            <button
              onClick={goToPreviousDay}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                embedded
                  ? isToday
                    ? 'bg-muted/50 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  : isToday
                    ? 'bg-background px-4 py-2 text-sm text-foreground shadow-sm'
                    : 'px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToNextDay}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className={cn(
              'flex-1 overflow-hidden',
              embedded
                ? ''
                : 'rounded-xl border border-border bg-card/50 shadow-lg backdrop-blur-xl'
            )}
          >
            <div className="h-full overflow-y-auto">
              {/* Column headers */}
              {!embedded && (
                <div className="sticky top-0 z-30 grid grid-cols-[80px_1fr_1fr] border-b border-border/60 bg-card">
                  <div className="border-r border-border/50 px-3 py-2" />
                  <div className="flex items-center gap-2 border-r border-border/30 px-4 py-2">
                    <ListTodo className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                      Tasks
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      {dayTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Video className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-500">
                      Meetings
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      {dayMeetings.length}
                    </span>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'grid',
                  embedded ? 'grid-cols-[60px_1fr]' : 'grid-cols-[80px_1fr_1fr]'
                )}
                style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px`, minHeight: '100%' }}
              >
                {/* Time labels */}
                <div
                  className={cn(
                    'relative border-r',
                    embedded ? 'border-border/30 bg-muted/20' : 'border-border/50 bg-secondary/20'
                  )}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'relative flex items-start justify-end pt-2',
                        embedded ? 'pr-3' : 'pr-4'
                      )}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="text-xs font-semibold text-muted-foreground/80">
                        {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tasks column (left) */}
                <div
                  className={cn(
                    'relative',
                    !embedded && 'border-r border-border/30',
                    isToday && 'bg-blue-500/[0.01]'
                  )}
                >
                  {/* Droppable time slots */}
                  {hours.map((hour) => (
                    <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                      {/* Add Task Button */}
                      <div className="absolute inset-0 z-10 opacity-0 transition-opacity hover:opacity-100">
                        <button
                          onClick={() => handleSlotClick(hour)}
                          className="absolute right-2 top-0 rounded-full bg-blue-500 p-1.5 text-white shadow-sm transition-transform hover:scale-110"
                          title="Add Task"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <TimeSlot
                        hour={hour}
                        minute={0}
                        currentDate={currentDate}
                        isOver={activeDropSlot === `${hour}:00`}
                      />
                      <TimeSlot
                        hour={hour}
                        minute={30}
                        currentDate={currentDate}
                        isOver={activeDropSlot === `${hour}:30`}
                      />
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {isToday && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{
                        top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                      }}
                    >
                      <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-500 shadow-sm ring-2 ring-background" />
                      <div className="h-[2px] w-full bg-red-500 shadow-sm" />
                    </div>
                  )}

                  {/* Task items */}
                  {dayTasks.map((item) => {
                    if (isItemOutsideHours(item)) return null;
                    const { top, height } = getItemPosition(item);

                    return (
                      <div
                        key={item.id}
                        className="absolute left-2 right-2 z-20 transition-all"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <DraggableItem
                          item={item}
                          timezone={timezone}
                          height={height}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isPending={isPending}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Meetings column (right) - only in non-embedded mode */}
                {!embedded && (
                  <div className={cn('relative', isToday && 'bg-violet-500/[0.01]')}>
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                        <TimeSlot
                          hour={hour}
                          minute={0}
                          currentDate={currentDate}
                          isOver={activeDropSlot === `${hour}:00`}
                        />
                        <TimeSlot
                          hour={hour}
                          minute={30}
                          currentDate={currentDate}
                          isOver={activeDropSlot === `${hour}:30`}
                        />
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {isToday && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                        style={{
                          top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                        }}
                      >
                        <div className="h-[2px] w-full bg-red-500 shadow-sm" />
                      </div>
                    )}

                    {/* Meeting items */}
                    {dayMeetings.map((item) => {
                      if (isItemOutsideHours(item)) return null;
                      const { top, height } = getItemPosition(item);

                      return (
                        <div
                          key={item.id}
                          className="absolute left-2 right-2 z-20 transition-all"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <DraggableItem
                            item={item}
                            timezone={timezone}
                            height={height}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isPending={isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* In embedded mode, meetings are overlaid below */}
              </div>

              {/* In embedded mode, we need to overlay meetings on the single content column */}
              {embedded && dayMeetings.length > 0 && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    top: 0,
                    left: '60px',
                    right: 0,
                    height: `${TOTAL_HOURS * HOUR_HEIGHT}px`,
                  }}
                >
                  {dayMeetings.map((item) => {
                    if (isItemOutsideHours(item)) return null;
                    const { top, height } = getItemPosition(item);

                    return (
                      <div
                        key={item.id}
                        className="pointer-events-auto absolute left-2 right-2 z-20 transition-all"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <DraggableItem
                          item={item}
                          timezone={timezone}
                          height={height}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isPending={isPending}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem && (
              <div
                className={cn(
                  'w-64 cursor-grabbing rounded-lg border p-3 shadow-2xl backdrop-blur-md',
                  isMeeting(activeItem)
                    ? 'border-violet-500 bg-violet-500/30'
                    : 'border-blue-500 bg-blue-500/30'
                )}
              >
                <div className="truncate text-sm font-semibold text-foreground">
                  {activeItem.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {format(toZonedTime(parseISO(activeItem.start_time), timezone), 'h:mm a')} -{' '}
                    {format(toZonedTime(parseISO(activeItem.end_time), timezone), 'h:mm a')}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={editingMeeting}
        open={editingMeeting !== null}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      {/* New Task Modal */}
      <NewTaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        defaultScheduledTime={newTaskTime}
      />
    </>
  );
}
