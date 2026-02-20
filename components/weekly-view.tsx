'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Trash2,
  Pencil,
  Video,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { unscheduleTask } from '@/app/actions/inbox';
import type { Task } from '@/app/actions/inbox';
import {
  invalidateMeetings,
  invalidateTodaysSchedule,
  invalidateInboxTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { EditMeetingModal } from './edit-meeting-modal';
import { EditTaskModal } from './edit-task-modal';
import {
  useTimezone,
  TIMEZONE_CYPRUS,
  type ScheduleTask,
  tasksToScheduleItems,
} from '@/lib/schedule-shared';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  meeting_link?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
}

type WeeklyItem = (Meeting & { itemType: 'meeting' }) | (ScheduleTask & { itemType: 'task' });

interface WeeklyViewProps {
  meetings: Meeting[];
  tasks?: Task[];
}

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 21;

export function WeeklyView({ meetings, tasks = [] }: WeeklyViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Convert tasks to schedule items
  const scheduleTasks = useMemo(() => tasksToScheduleItems(tasks), [tasks]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Group all items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, WeeklyItem[]>();

    meetings.forEach((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      const dateKey = format(meetingInTz, 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, { ...meeting, itemType: 'meeting' as const }]);
    });

    scheduleTasks.forEach((task) => {
      const taskInTz = toZonedTime(parseISO(task.start_time), timezone);
      const dateKey = format(taskInTz, 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, { ...task, itemType: 'task' as const }]);
    });

    return map;
  }, [meetings, scheduleTasks, timezone]);

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getItemPosition = useCallback(
    (item: WeeklyItem) => {
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

  const formatWeekRange = () => {
    const startMonth = format(weekStart, 'MMM');
    const endMonth = format(weekEnd, 'MMM');
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekEnd, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  const isTodayInTz = (day: Date) => {
    const todayStr = format(nowInTz, 'yyyy-MM-dd');
    const dayStr = format(day, 'yyyy-MM-dd');
    return todayStr === dayStr;
  };

  const handleDeleteMeeting = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      startTransition(async () => {
        const result = await deleteMeeting(id);
        if (result.success) {
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
        }
      });
    }
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    if (confirm('Remove this task from schedule?')) {
      startTransition(async () => {
        await unscheduleTask(id);
        invalidateInboxTasks(true);
        invalidateDailyFlow(true);
      });
    }
  }, []);

  const handleEditMeeting = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
  }, []);

  const handleEditTask = useCallback(
    (taskItem: ScheduleTask) => {
      const fullTask = tasks.find((t) => t.id === taskItem.id);
      if (fullTask) setEditingTask(fullTask);
    },
    [tasks]
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-foreground">{formatWeekRange()}</h2>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Europe/Nicosia">Cyprus (Fawzi)</option>
                <option value="Asia/Amman">Jordan (Moayad)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              Today
            </button>
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/50">
          <div className="p-2" />
          {days.map((day) => {
            const isCurrentDay = isTodayInTz(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-l border-border p-2 text-center',
                  isCurrentDay && 'bg-primary/5'
                )}
              >
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div
                  className={cn(
                    'mt-0.5 text-lg font-semibold',
                    isCurrentDay ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid max-h-[600px] grid-cols-[60px_repeat(7,1fr)] overflow-y-auto">
          {/* Time labels */}
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-border/50 pr-2 text-right">
                <span className="relative -top-2 text-[10px] text-muted-foreground">
                  {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDate.get(dateKey) || [];
            const isCurrentDay = isTodayInTz(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative border-l border-border',
                  isCurrentDay && 'bg-primary/[0.02]'
                )}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-border/50" />
                ))}

                {/* Current time indicator */}
                {isCurrentDay && (
                  <div
                    className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                    style={{
                      top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                    }}
                  >
                    <div className="-ml-1 -mt-1 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}

                {/* All items (meetings + tasks) */}
                {dayItems.map((item) => {
                  const { top, height } = getItemPosition(item);
                  const startTime = toZonedTime(parseISO(item.start_time), timezone);
                  const endTime = toZonedTime(parseISO(item.end_time), timezone);

                  if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                    return null;
                  }

                  const isMeetingItem = item.itemType === 'meeting';
                  const hasLink = isMeetingItem && !!(item as Meeting).meeting_link;

                  // Color coding: violet for meetings, blue for tasks
                  const borderColor = isMeetingItem ? 'border-violet-500/30' : 'border-blue-500/30';
                  const bgColor = isMeetingItem
                    ? 'bg-violet-500/10 hover:bg-violet-500/20'
                    : 'bg-blue-500/10 hover:bg-blue-500/20';

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        isMeetingItem &&
                        hasLink &&
                        window.open((item as Meeting).meeting_link!, '_blank')
                      }
                      className={cn(
                        'group absolute left-1 right-1 z-10 overflow-hidden rounded-md border p-1.5 transition-colors',
                        borderColor,
                        bgColor,
                        hasLink ? 'cursor-pointer' : 'cursor-default'
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${item.title}\n${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}${hasLink ? '\nClick to join' : ''}`}
                    >
                      {/* Indicators */}
                      {hasLink && (
                        <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-emerald-500 group-hover:opacity-0">
                          <Video className="h-2.5 w-2.5" />
                        </div>
                      )}
                      {!isMeetingItem && (
                        <div className="absolute right-0.5 top-0.5 group-hover:opacity-0">
                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="absolute right-0.5 top-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMeetingItem) {
                              handleEditMeeting(item as Meeting);
                            } else {
                              handleEditTask(item as ScheduleTask);
                            }
                          }}
                          className={cn(
                            'rounded p-0.5 text-muted-foreground',
                            isMeetingItem
                              ? 'hover:bg-violet-500/20 hover:text-foreground'
                              : 'hover:bg-blue-500/20 hover:text-foreground'
                          )}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMeetingItem) {
                              handleDeleteMeeting(item.id);
                            } else {
                              handleDeleteTask(item.id);
                            }
                          }}
                          disabled={isPending}
                          className="rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="truncate text-[11px] font-medium text-foreground">
                        {item.title}
                      </div>
                      {height > 40 && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{format(startTime, 'h:mm a')}</span>
                        </div>
                      )}
                      {height > 60 && item.project && (
                        <div
                          className={cn(
                            'mt-1 truncate text-[10px]',
                            isMeetingItem ? 'text-violet-400/80' : 'text-blue-400/80'
                          )}
                        >
                          {item.project.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
    </>
  );
}
