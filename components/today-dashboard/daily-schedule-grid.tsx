'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { format, parseISO, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Video,
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  Plus,
  Clock,
  Pencil,
  Trash2,
  Columns2,
  ArrowRightFromLine,
  CalendarPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, quickUpdateTask, deleteTask } from '@/app/actions/inbox';
import { deleteMeeting } from '@/app/actions';
import {
  type MeetingWithRelations,
  invalidateInboxTasks,
  invalidateDailyFlow,
  invalidateMeetings,
  invalidateTodaysSchedule,
} from '@/lib/swr';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import { EditTaskModal } from '@/components/edit-task-modal';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';

// ── Config ───────────────────────────────────────────────────────────────────
const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 72; // px per hour row
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

interface ScheduleItem {
  id: string;
  type: 'task' | 'meeting';
  title: string;
  startTime: Date;
  endTime: Date;
  task?: Task;
  meeting?: MeetingWithRelations;
  col: number;
  span: boolean;
}

interface DailyScheduleGridProps {
  tasks: Task[];
  meetings: MeetingWithRelations[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hourLabel(hour: number): string {
  const d = setMinutes(setHours(new Date(), hour), 0);
  return format(d, 'h a');
}

function topPx(time: Date): number {
  const h = time.getHours() + time.getMinutes() / 60;
  return Math.max(0, Math.min((h - START_HOUR) * HOUR_HEIGHT, TOTAL_HEIGHT));
}

function heightPx(start: Date, end: Date): number {
  const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(HOUR_HEIGHT * 0.35, dur * HOUR_HEIGHT);
}

const PRIORITY_ACCENT: Record<string, string> = {
  Urgent: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-blue-400',
  'No Priority': 'border-l-border',
};

// ── Event Cards ──────────────────────────────────────────────────────────────

function MeetingCard({
  item,
  style,
  isSpanning,
  onEdit,
  onDelete,
  onToggleSpan,
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  isSpanning: boolean;
  onEdit: (meeting: MeetingWithRelations) => void;
  onDelete: (meetingId: string) => void;
  onToggleSpan: (meetingId: string) => void;
}) {
  const itemHeight = parseFloat(String(style.height)) || 0;
  const isCompact = itemHeight < 40;

  return (
    <div
      className={cn(
        'group/meeting absolute overflow-hidden border px-3 py-2 transition-all',
        isSpanning
          ? 'rounded-lg border-violet-500/20 bg-gradient-to-r from-violet-500/[0.07] via-violet-500/[0.10] to-violet-500/[0.07] hover:border-violet-500/35 hover:from-violet-500/[0.10] hover:via-violet-500/[0.14] hover:to-violet-500/[0.10]'
          : 'rounded-md border-violet-500/25 bg-violet-500/[0.08] hover:bg-violet-500/[0.14]',
        'hover:shadow-[0_2px_12px_-4px_rgba(139,92,246,0.15)]'
      )}
      style={style}
    >
      {/* Action buttons on hover */}
      <div className="absolute right-1.5 top-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/meeting:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSpan(item.meeting!.id);
          }}
          className="flex size-5 items-center justify-center rounded bg-violet-500/15 text-violet-400 transition-colors hover:bg-violet-500/25 hover:text-violet-300"
          title={isSpanning ? 'Collapse to single column' : 'Expand to both columns'}
        >
          {isSpanning ? (
            <ArrowRightFromLine className="size-2.5" />
          ) : (
            <Columns2 className="size-2.5" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.meeting) onEdit(item.meeting);
          }}
          className="flex size-5 items-center justify-center rounded bg-violet-500/15 text-violet-400 transition-colors hover:bg-violet-500/25 hover:text-violet-300"
          title="Edit meeting"
        >
          <Pencil className="size-2.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.meeting!.id);
          }}
          className="flex size-5 items-center justify-center rounded bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          title="Delete meeting"
        >
          <Trash2 className="size-2.5" />
        </button>
      </div>

      <p
        className={cn(
          'truncate font-semibold leading-tight text-violet-700 dark:text-violet-300',
          isCompact ? 'text-[10px]' : 'text-[11px]'
        )}
      >
        {item.title}
      </p>
      {!isCompact && (
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-violet-600/60 dark:text-violet-400/50">
          <span>
            {format(item.startTime, 'h:mm')} – {format(item.endTime, 'h:mm a')}
          </span>
          {item.meeting?.client && (
            <>
              <span className="opacity-40">·</span>
              <span className="truncate">
                {(item.meeting.client as { display_name?: string }).display_name}
              </span>
            </>
          )}
        </div>
      )}
      {!isCompact && item.meeting?.meeting_link && (
        <a
          href={item.meeting.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-violet-500/90 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Video className="size-2.5" />
          Join
        </a>
      )}
    </div>
  );
}

function TaskCard({
  item,
  style,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}) {
  const task = item.task;
  if (!task) return null;

  const isDone = task.status === 'Done';
  const accent = PRIORITY_ACCENT[task.priority] || PRIORITY_ACCENT['No Priority'];
  const itemHeight = parseFloat(String(style.height)) || 0;
  const isCompact = itemHeight < 40;

  return (
    <div
      className={cn(
        'group/task absolute cursor-pointer overflow-hidden border border-l-[3px] border-border/30 bg-card px-2.5 py-1.5 transition-all hover:border-border/50',
        'rounded-md hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.3)]',
        accent,
        isDone && 'opacity-35'
      )}
      style={style}
      onClick={() => onTaskClick(task)}
    >
      {/* Action buttons on hover */}
      <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/task:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(task);
          }}
          className="flex size-5 items-center justify-center rounded bg-foreground/[0.06] text-foreground/40 transition-colors hover:bg-foreground/[0.10] hover:text-foreground/70"
          title="Edit task"
        >
          <Pencil className="size-2.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskDelete(task.id);
          }}
          className="flex size-5 items-center justify-center rounded bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          title="Delete task"
        >
          <Trash2 className="size-2.5" />
        </button>
      </div>

      <div className="flex items-start gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskComplete(task.id);
          }}
          className="mt-px shrink-0"
        >
          {isDone ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Circle className="size-3 text-foreground/20 transition-colors hover:text-foreground/50" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate font-semibold leading-tight text-foreground',
              isCompact ? 'text-[10px]' : 'text-[11px]',
              isDone && 'line-through'
            )}
          >
            {task.title}
          </p>
          {!isCompact && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-foreground/40">
              <span>
                {format(item.startTime, 'h:mm')} – {format(item.endTime, 'h:mm a')}
              </span>
              {task.project && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="truncate">{task.project.name}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Unscheduled Row ──────────────────────────────────────────────────────────

function UnscheduledRow({
  task,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}) {
  const isDone = task.status === 'Done';
  const pc = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];

  return (
    <div
      className="group/row flex cursor-pointer items-center gap-2.5 px-4 py-[7px] transition-colors hover:bg-accent/40"
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
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Circle className="size-3 text-foreground/20 hover:text-foreground/50" />
        )}
      </button>
      <span
        className={cn(
          'flex-1 truncate text-[12px] text-foreground/80',
          isDone && 'line-through opacity-40'
        )}
      >
        {task.title}
      </span>
      {task.project && (
        <span className="max-w-[80px] shrink-0 truncate text-[10px] text-foreground/30">
          {task.project.name}
        </span>
      )}
      {pc && (
        <span
          className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold', pc.bg, pc.text)}
        >
          {pc.label}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTaskDelete(task.id);
        }}
        className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100"
        title="Delete task"
      >
        <Trash2 className="size-3 text-red-400 hover:text-red-300" />
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DailyScheduleGrid({ tasks, meetings }: DailyScheduleGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithRelations | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [newTaskDefaultAssignee, setNewTaskDefaultAssignee] = useState<string | null>(null);
  const [newTaskDefaultTime, setNewTaskDefaultTime] = useState<string | null>(null);
  const [collapsedMeetings, setCollapsedMeetings] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const FAWZI_ID = '696cbe99-20fe-437c-97fe-246fb3367d9b';
  const MOAYAD_ID = 'e0472b7b-4378-4311-9c45-9d3e8ca94bd2';

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const h = currentTime.getHours() + currentTime.getMinutes() / 60;
      if (h >= START_HOUR && h <= END_HOUR) {
        const scrollTo = Math.max(0, (h - START_HOUR) * HOUR_HEIGHT - 100);
        scrollRef.current.scrollTop = scrollTo;
      }
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddTask = (assigneeId: string, scheduledTime?: string) => {
    setNewTaskDefaultAssignee(assigneeId);
    setNewTaskDefaultTime(scheduledTime || null);
    setShowNewTaskModal(true);
  };

  const toggleMeetingSpan = useCallback((meetingId: string) => {
    setCollapsedMeetings((prev) => {
      const next = new Set(prev);
      if (next.has(meetingId)) next.delete(meetingId);
      else next.add(meetingId);
      return next;
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleComplete = useCallback(
    async (taskId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      await quickUpdateTask(taskId, { status: t?.status === 'Done' ? 'Todo' : 'Done' });
      invalidateInboxTasks();
      invalidateDailyFlow();
    },
    [tasks]
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    if (!confirm('Delete this task?')) return;
    startTransition(async () => {
      await deleteTask(taskId);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
    });
  }, []);

  const handleDeleteMeeting = useCallback((meetingId: string) => {
    if (!confirm('Delete this meeting?')) return;
    startTransition(async () => {
      await deleteMeeting(meetingId);
      invalidateMeetings(true);
      invalidateTodaysSchedule(true);
      invalidateDailyFlow(true);
    });
  }, []);

  // ── Partition items ────────────────────────────────────────────────────────
  const { scheduledItems, unscheduledTasks } = useMemo(() => {
    const items: ScheduleItem[] = [];
    const unscheduled: Task[] = [];

    for (const t of tasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        const s = parseISO(t.scheduled_start_time);
        if (isToday(s) || isSameDay(s, new Date())) {
          // Unassigned scheduled tasks span both columns (joint task)
          const isJoint =
            !t.assignee_id || (t.assignee_id !== FAWZI_ID && t.assignee_id !== MOAYAD_ID);
          let col = 0;
          if (!isJoint && t.assignee_id === MOAYAD_ID) col = 1;
          items.push({
            id: `task-${t.id}`,
            type: 'task',
            title: t.title,
            startTime: s,
            endTime: parseISO(t.scheduled_end_time),
            task: t,
            col,
            span: isJoint,
          });
        } else {
          unscheduled.push(t);
        }
      } else {
        unscheduled.push(t);
      }
    }

    // Meetings ALWAYS span both columns by default
    for (const m of meetings) {
      const s = parseISO(m.start_time);
      if (isToday(s)) {
        const isCollapsed = collapsedMeetings.has(m.id);

        if (isCollapsed) {
          // When collapsed, assign to a specific column based on attendees
          const attendees = m.attendees.map((a) => a.profile?.id);
          const hasMoayad = attendees.includes(MOAYAD_ID) || m.creator?.id === MOAYAD_ID;
          items.push({
            id: `meeting-${m.id}`,
            type: 'meeting',
            title: m.title,
            startTime: s,
            endTime: parseISO(m.end_time),
            meeting: m,
            col: hasMoayad ? 1 : 0,
            span: false,
          });
        } else {
          // Default: span both columns
          items.push({
            id: `meeting-${m.id}`,
            type: 'meeting',
            title: m.title,
            startTime: s,
            endTime: parseISO(m.end_time),
            meeting: m,
            col: 0,
            span: true,
          });
        }
      }
    }

    return {
      scheduledItems: items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      unscheduledTasks: unscheduled,
    };
  }, [tasks, meetings, collapsedMeetings]);

  // ── Position map ───────────────────────────────────────────────────────────
  const positionMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    const GAP = 3; // px gap between columns

    for (const item of scheduledItems) {
      const top = topPx(item.startTime);
      const height = heightPx(item.startTime, item.endTime);

      if (item.span) {
        map.set(item.id, {
          top: `${top}px`,
          height: `${height}px`,
          left: `${GAP}px`,
          right: `${GAP}px`,
          zIndex: 20,
        });
      } else if (item.col === 0) {
        map.set(item.id, {
          top: `${top}px`,
          height: `${height}px`,
          left: `${GAP}px`,
          right: `calc(50% + ${GAP / 2}px)`,
          zIndex: 10,
        });
      } else {
        map.set(item.id, {
          top: `${top}px`,
          height: `${height}px`,
          left: `calc(50% + ${GAP / 2}px)`,
          right: `${GAP}px`,
          zIndex: 10,
        });
      }
    }

    return map;
  }, [scheduledItems]);

  // ── Current time ───────────────────────────────────────────────────────────
  const nowTop = useMemo(() => {
    const h = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (h < START_HOUR || h > END_HOUR) return null;
    return topPx(currentTime);
  }, [currentTime]);

  const pendingCount = unscheduledTasks.filter((t) => t.status !== 'Done').length;
  const TIME_GUTTER = 56; // px

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2.5">
          <Clock className="size-3.5 text-foreground/50" />
          <span className="text-[13px] font-semibold text-foreground">Schedule</span>
          <span className="text-[12px] tabular-nums text-foreground/35">
            {format(new Date(), 'EEE, MMM d')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-violet-400/60 hover:text-violet-400"
            onClick={() => setShowNewMeetingModal(true)}
            title="Add meeting"
          >
            <CalendarPlus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-foreground/40 hover:text-foreground"
            onClick={() => handleAddTask(FAWZI_ID)}
            title="Add task"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Column Headers ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border/30" style={{ height: 36 }}>
        {/* Time gutter spacer */}
        <div className="shrink-0 border-r border-border/30" style={{ width: TIME_GUTTER }} />
        {/* Fawzi column */}
        <div className="flex flex-1 items-center justify-between border-r border-dashed border-border/25 px-3">
          <div className="flex items-center gap-2">
            <div className="size-[7px] rounded-full bg-sky-400" />
            <span className="text-[11px] font-semibold text-foreground/60">Fawzi</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => handleAddTask(FAWZI_ID)}
          >
            <Plus className="size-3 text-foreground/30" />
          </Button>
        </div>
        {/* Moayad column */}
        <div className="flex flex-1 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="size-[7px] rounded-full bg-violet-400" />
            <span className="text-[11px] font-semibold text-foreground/60">Moayad</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => handleAddTask(MOAYAD_ID)}
          >
            <Plus className="size-3 text-foreground/30" />
          </Button>
        </div>
      </div>

      {/* ── Time Grid ────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative overflow-hidden" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour rows background */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const hour = START_HOUR + i;
            const isCurrentHour = currentTime.getHours() === hour;
            const y = i * HOUR_HEIGHT;
            const timeStr = `${hour}:00`;

            return (
              <div
                key={hour}
                className="group/hour absolute left-0 right-0 border-b border-border/30"
                style={{ top: y, height: HOUR_HEIGHT }}
              >
                {/* Time label */}
                <div
                  className="absolute top-0 flex items-start justify-end border-r border-border/30 pr-3 pt-2"
                  style={{ width: TIME_GUTTER }}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium tabular-nums leading-none',
                      isCurrentHour ? 'text-foreground/60' : 'text-foreground/25'
                    )}
                  >
                    {hourLabel(hour)}
                  </span>
                </div>

                {/* Half-hour line */}
                <div
                  className="absolute left-0 right-0 border-b border-dotted border-border/15"
                  style={{ top: HOUR_HEIGHT / 2, left: TIME_GUTTER }}
                />

                {/* Column divider */}
                <div
                  className="absolute bottom-0 top-0 border-l border-dashed border-border/25"
                  style={{ left: `calc(50% + ${TIME_GUTTER / 2}px)` }}
                />

                {/* Per-block add buttons (Fawzi column) */}
                <button
                  className="absolute top-1 z-[5] flex size-5 items-center justify-center rounded bg-foreground/[0.04] text-foreground/20 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover/hour:opacity-100"
                  style={{ left: `${TIME_GUTTER + 4}px` }}
                  onClick={() => handleAddTask(FAWZI_ID, timeStr)}
                  title={`Add task for Fawzi at ${hourLabel(hour)}`}
                >
                  <Plus className="size-3" />
                </button>

                {/* Per-block add buttons (Moayad column) */}
                <button
                  className="absolute top-1 z-[5] flex size-5 items-center justify-center rounded bg-foreground/[0.04] text-foreground/20 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover/hour:opacity-100"
                  style={{ left: `calc(50% + ${TIME_GUTTER / 2 + 4}px)` }}
                  onClick={() => handleAddTask(MOAYAD_ID, timeStr)}
                  title={`Add task for Moayad at ${hourLabel(hour)}`}
                >
                  <Plus className="size-3" />
                </button>
              </div>
            );
          })}

          {/* ── Event layer ───────────────────────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0"
            style={{ left: TIME_GUTTER }}
          >
            <div className="pointer-events-auto relative h-full w-full">
              {scheduledItems.map((item) => {
                const style = positionMap.get(item.id);
                if (!style) return null;

                if (item.type === 'meeting') {
                  return (
                    <MeetingCard
                      key={item.id}
                      item={item}
                      style={style}
                      isSpanning={item.span}
                      onEdit={setEditingMeeting}
                      onDelete={handleDeleteMeeting}
                      onToggleSpan={toggleMeetingSpan}
                    />
                  );
                }
                return (
                  <TaskCard
                    key={item.id}
                    item={item}
                    style={style}
                    onTaskClick={setEditingTask}
                    onTaskComplete={handleComplete}
                    onTaskDelete={handleDeleteTask}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Current time line ─────────────────────────────────────────── */}
          {nowTop !== null && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
              style={{ top: nowTop }}
            >
              <div className="flex items-center justify-end pr-1.5" style={{ width: TIME_GUTTER }}>
                <div className="size-[6px] rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
              </div>
              <div className="h-[1px] flex-1 bg-red-500/50" />
            </div>
          )}
        </div>
      </div>

      {/* ── Unscheduled Tasks ──────────────────────────────────────────────── */}
      {unscheduledTasks.length > 0 && (
        <div className="shrink-0 border-t border-border/40">
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            {showUnscheduled ? (
              <ChevronDown className="size-3 text-foreground/35" />
            ) : (
              <ChevronRight className="size-3 text-foreground/35" />
            )}
            <span className="text-[11px] font-semibold text-foreground/50">Unscheduled</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/45">
                {pendingCount}
              </span>
            )}
          </button>
          {showUnscheduled && (
            <div className="max-h-40 overflow-y-auto border-t border-border/20 pb-1">
              {unscheduledTasks.map((task) => (
                <UnscheduledRow
                  key={task.id}
                  task={task}
                  onTaskClick={setEditingTask}
                  onTaskComplete={handleComplete}
                  onTaskDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}
      <EditMeetingModal
        meeting={editingMeeting}
        open={!!editingMeeting}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />
      <NewTaskModalControlled
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        defaultAssigneeId={newTaskDefaultAssignee}
        defaultScheduledTime={newTaskDefaultTime}
      />
      <NewMeetingModalInline
        open={showNewMeetingModal}
        onOpenChange={setShowNewMeetingModal}
        onMeetingCreated={() => {
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
          invalidateDailyFlow(true);
        }}
      />
    </div>
  );
}
