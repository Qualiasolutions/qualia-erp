'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { format, parseISO, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import {
  Video,
  Check,
  Circle,
  Plus,
  Pencil,
  Trash2,
  Columns2,
  ArrowRightFromLine,
  ExternalLink,
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
import { EditTaskModal } from '@/components/edit-task-modal';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';

// ── Config ───────────────────────────────────────────────────────────────────
const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 72;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const TIME_GUTTER = 48;

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

const PRIORITY_BORDER: Record<string, string> = {
  Urgent: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-amber-400',
  Low: 'border-l-sky-400',
  'No Priority': 'border-l-foreground/[0.06]',
};

// ── Meeting Card ─────────────────────────────────────────────────────────────

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
        'group/meeting absolute overflow-hidden transition-all duration-200',
        isSpanning
          ? [
              'border-violet-500/12 rounded-[10px] border',
              'bg-gradient-to-r from-violet-500/[0.05] via-violet-500/[0.08] to-violet-500/[0.05]',
              'hover:border-violet-500/25 hover:from-violet-500/[0.08] hover:via-violet-500/[0.12] hover:to-violet-500/[0.08]',
              'hover:shadow-[0_4px_20px_-6px_rgba(139,92,246,0.12)]',
            ]
          : [
              'rounded-lg border border-violet-500/15',
              'bg-violet-500/[0.05]',
              'hover:border-violet-500/25 hover:bg-violet-500/[0.10]',
            ]
      )}
      style={style}
    >
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

      <div className="relative flex h-full flex-col px-3 py-2">
        {/* Hover actions */}
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-px rounded-md bg-card/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-150 group-hover/meeting:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSpan(item.meeting!.id);
            }}
            className="flex size-[22px] items-center justify-center rounded-[5px] text-violet-400/60 transition-colors hover:bg-violet-500/15 hover:text-violet-300"
            title={isSpanning ? 'Single column' : 'Both columns'}
          >
            {isSpanning ? (
              <ArrowRightFromLine className="size-3" />
            ) : (
              <Columns2 className="size-3" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.meeting) onEdit(item.meeting);
            }}
            className="flex size-[22px] items-center justify-center rounded-[5px] text-foreground/35 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/60"
            title="Edit"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.meeting!.id);
            }}
            className="flex size-[22px] items-center justify-center rounded-[5px] text-red-400/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="size-3" />
          </button>
        </div>

        <div className="flex items-start gap-2">
          <div className="bg-violet-500/12 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded">
            <Video className="size-2.5 text-violet-400/80" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate font-semibold leading-tight tracking-tight text-violet-700 dark:text-violet-300',
                isCompact ? 'text-[10px]' : 'text-[11.5px]'
              )}
            >
              {item.title}
            </p>
            {!isCompact && (
              <p className="mt-0.5 text-[10px] tabular-nums text-violet-500/40 dark:text-violet-400/35">
                {format(item.startTime, 'h:mm')} – {format(item.endTime, 'h:mm a')}
                {item.meeting?.client && (
                  <span className="ml-1.5 text-violet-500/30 dark:text-violet-400/25">
                    · {(item.meeting.client as { display_name?: string }).display_name}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {!isCompact && item.meeting?.meeting_link && (
          <a
            href={item.meeting.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex w-fit items-center gap-1 rounded-md bg-violet-500/85 px-2 py-[3px] text-[9px] font-semibold tracking-wide text-white transition-all hover:bg-violet-500 hover:shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-2.5" />
            Join
          </a>
        )}
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

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
  const accent = PRIORITY_BORDER[task.priority] || PRIORITY_BORDER['No Priority'];
  const itemHeight = parseFloat(String(style.height)) || 0;
  const isCompact = itemHeight < 40;

  return (
    <div
      className={cn(
        'group/task absolute cursor-pointer overflow-hidden border-l-[3px] transition-all duration-200',
        'rounded-lg border border-border/15 bg-card/80',
        'hover:border-border/30 hover:bg-card',
        'hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.25)]',
        accent,
        isDone && 'opacity-25'
      )}
      style={style}
      onClick={() => onTaskClick(task)}
    >
      {/* Hover actions */}
      <div className="absolute right-1 top-1 z-10 flex items-center gap-px rounded-md bg-card/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-150 group-hover/task:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(task);
          }}
          className="flex size-[22px] items-center justify-center rounded-[5px] text-foreground/35 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/60"
          title="Edit"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskDelete(task.id);
          }}
          className="flex size-[22px] items-center justify-center rounded-[5px] text-red-400/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      <div className="flex h-full items-start gap-2 px-2.5 py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTaskComplete(task.id);
          }}
          className="mt-[1px] shrink-0"
        >
          {isDone ? (
            <div className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500">
              <Check className="size-2 text-white" strokeWidth={3} />
            </div>
          ) : (
            <Circle className="text-foreground/12 size-3.5 transition-colors hover:text-foreground/35" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate font-medium leading-tight tracking-tight text-foreground/85',
              isCompact ? 'text-[10px]' : 'text-[11.5px]',
              isDone && 'text-foreground/35 line-through'
            )}
          >
            {task.title}
          </p>
          {!isCompact && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-foreground/30">
              <span className="tabular-nums">
                {format(item.startTime, 'h:mm')} – {format(item.endTime, 'h:mm a')}
              </span>
              {task.project && (
                <>
                  <span className="text-foreground/10">·</span>
                  <span className="truncate">{task.project.name}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DailyScheduleGrid({ tasks, meetings }: DailyScheduleGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
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

  useEffect(() => {
    if (scrollRef.current) {
      const h = currentTime.getHours() + currentTime.getMinutes() / 60;
      if (h >= START_HOUR && h <= END_HOUR) {
        const scrollTo = Math.max(0, (h - START_HOUR) * HOUR_HEIGHT - 100);
        scrollRef.current.scrollTop = scrollTo;
      }
    }
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

  // ── Partition ──────────────────────────────────────────────────────────────
  const scheduledItems = useMemo(() => {
    const items: ScheduleItem[] = [];

    for (const t of tasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        const s = parseISO(t.scheduled_start_time);
        if (isToday(s) || isSameDay(s, new Date())) {
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
        }
      }
    }

    for (const m of meetings) {
      const s = parseISO(m.start_time);
      if (isToday(s)) {
        const isCollapsed = collapsedMeetings.has(m.id);
        if (isCollapsed) {
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

    return items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [tasks, meetings, collapsedMeetings]);

  // ── Position map ───────────────────────────────────────────────────────────
  const positionMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    const GAP = 3;

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

  return (
    <div className="flex h-full flex-col">
      {/* ── Column Headers ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border/15" style={{ height: 38 }}>
        <div className="shrink-0" style={{ width: TIME_GUTTER }} />

        {/* Fawzi */}
        <div className="flex flex-1 items-center justify-between border-r border-dashed border-border/10 px-3">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-sky-500/10 text-[9px] font-bold text-sky-500">
              F
            </div>
            <span className="text-[11px] font-medium text-foreground/45">Fawzi</span>
          </div>
          <button
            onClick={() => handleAddTask(FAWZI_ID)}
            className="flex size-5 items-center justify-center rounded text-foreground/15 transition-colors hover:bg-accent hover:text-foreground/40"
          >
            <Plus className="size-2.5" />
          </button>
        </div>

        {/* Moayad */}
        <div className="flex flex-1 items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-violet-500/10 text-[9px] font-bold text-violet-500">
              M
            </div>
            <span className="text-[11px] font-medium text-foreground/45">Moayad</span>
          </div>
          <button
            onClick={() => handleAddTask(MOAYAD_ID)}
            className="flex size-5 items-center justify-center rounded text-foreground/15 transition-colors hover:bg-accent hover:text-foreground/40"
          >
            <Plus className="size-2.5" />
          </button>
        </div>
      </div>

      {/* ── Time Grid ────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const hour = START_HOUR + i;
            const isCurrentHour = currentTime.getHours() === hour;
            const y = i * HOUR_HEIGHT;
            const timeStr = `${hour}:00`;

            return (
              <div
                key={hour}
                className="group/hour absolute left-0 right-0"
                style={{ top: y, height: HOUR_HEIGHT }}
              >
                <div className="absolute inset-x-0 bottom-0 h-px bg-border/[0.06]" />

                <div
                  className="absolute top-0 flex items-start justify-end pr-2 pt-1"
                  style={{ width: TIME_GUTTER }}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium tabular-nums leading-none',
                      isCurrentHour ? 'text-foreground/45' : 'text-foreground/18'
                    )}
                  >
                    {hourLabel(hour)}
                  </span>
                </div>

                <div
                  className="absolute right-0 border-b border-dotted border-border/[0.04]"
                  style={{ top: HOUR_HEIGHT / 2, left: TIME_GUTTER }}
                />

                <div
                  className="absolute bottom-0 top-0 border-l border-dashed border-border/[0.06]"
                  style={{ left: `calc(50% + ${TIME_GUTTER / 2}px)` }}
                />

                <button
                  className="absolute top-1 z-[5] flex size-4 items-center justify-center rounded text-foreground/10 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover/hour:opacity-100"
                  style={{ left: `${TIME_GUTTER + 4}px` }}
                  onClick={() => handleAddTask(FAWZI_ID, timeStr)}
                >
                  <Plus className="size-2.5" />
                </button>

                <button
                  className="absolute top-1 z-[5] flex size-4 items-center justify-center rounded text-foreground/10 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover/hour:opacity-100"
                  style={{ left: `calc(50% + ${TIME_GUTTER / 2 + 4}px)` }}
                  onClick={() => handleAddTask(MOAYAD_ID, timeStr)}
                >
                  <Plus className="size-2.5" />
                </button>
              </div>
            );
          })}

          {/* Event layer */}
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

          {/* Current time */}
          {nowTop !== null && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
              style={{ top: nowTop }}
            >
              <div className="flex items-center justify-end pr-1" style={{ width: TIME_GUTTER }}>
                <div className="rounded-full bg-red-500 px-1.5 py-[1px] text-[8px] font-bold tabular-nums text-white shadow-sm">
                  {format(currentTime, 'h:mm')}
                </div>
              </div>
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-red-500/50 via-red-500/20 to-transparent" />
            </div>
          )}
        </div>
      </div>

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
