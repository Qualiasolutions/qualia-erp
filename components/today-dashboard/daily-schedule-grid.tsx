'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, Check, Circle, ChevronDown, ChevronRight, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, quickUpdateTask } from '@/app/actions/inbox';
import { type MeetingWithRelations, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import { EditTaskModal } from '@/components/edit-task-modal';
import { NewTaskModalControlled } from '@/components/new-task-modal';

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

function MeetingCard({ item, style }: { item: ScheduleItem; style: React.CSSProperties }) {
  return (
    <div
      className="absolute overflow-hidden rounded-md border border-violet-500/25 bg-violet-500/[0.08] px-2.5 py-1.5 transition-all hover:bg-violet-500/[0.13] hover:shadow-sm"
      style={style}
    >
      <p className="truncate text-[11px] font-semibold leading-tight text-violet-700 dark:text-violet-300">
        {item.title}
      </p>
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
      {item.meeting?.meeting_link && (
        <a
          href={item.meeting.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 rounded bg-violet-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white transition-colors hover:bg-violet-600"
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
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}) {
  const task = item.task;
  if (!task) return null;

  const isDone = task.status === 'Done';
  const accent = PRIORITY_ACCENT[task.priority] || PRIORITY_ACCENT['No Priority'];

  return (
    <div
      className={cn(
        'absolute cursor-pointer overflow-hidden rounded-md border border-l-[3px] border-border/30 bg-card px-2.5 py-1.5 transition-all hover:border-border/50 hover:shadow-sm',
        accent,
        isDone && 'opacity-35'
      )}
      style={style}
      onClick={() => onTaskClick(task)}
    >
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
              'truncate text-[11px] font-semibold leading-tight text-foreground',
              isDone && 'line-through'
            )}
          >
            {task.title}
          </p>
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
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}) {
  const isDone = task.status === 'Done';
  const pc = TASK_PRIORITY_COLORS[task.priority as TaskPriorityKey];

  return (
    <div
      className="flex cursor-pointer items-center gap-2.5 px-4 py-[7px] transition-colors hover:bg-accent/40"
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
        <span className="max-w-[100px] shrink-0 truncate text-[10px] text-foreground/30">
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
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DailyScheduleGrid({ tasks, meetings }: DailyScheduleGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskDefaultAssignee, setNewTaskDefaultAssignee] = useState<string | null>(null);
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

  const handleAddTask = (assigneeId: string) => {
    setNewTaskDefaultAssignee(assigneeId);
    setShowNewTaskModal(true);
  };

  // ── Partition items ────────────────────────────────────────────────────────
  const { scheduledItems, unscheduledTasks } = useMemo(() => {
    const items: ScheduleItem[] = [];
    const unscheduled: Task[] = [];

    for (const t of tasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        const s = parseISO(t.scheduled_start_time);
        if (isToday(s) || isSameDay(s, new Date())) {
          let col = 0;
          if (t.assignee_id === MOAYAD_ID) col = 1;
          items.push({
            id: `task-${t.id}`,
            type: 'task',
            title: t.title,
            startTime: s,
            endTime: parseISO(t.scheduled_end_time),
            task: t,
            col,
            span: false,
          });
        } else {
          unscheduled.push(t);
        }
      } else {
        unscheduled.push(t);
      }
    }

    for (const m of meetings) {
      const s = parseISO(m.start_time);
      if (isToday(s)) {
        const attendees = m.attendees.map((a) => a.profile?.id);
        const hasFawzi = attendees.includes(FAWZI_ID) || m.creator?.id === FAWZI_ID;
        const hasMoayad = attendees.includes(MOAYAD_ID) || m.creator?.id === MOAYAD_ID;

        if (hasFawzi && hasMoayad) {
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
        } else {
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
        }
      }
    }

    return {
      scheduledItems: items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      unscheduledTasks: unscheduled,
    };
  }, [tasks, meetings]);

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
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-foreground/40 hover:text-foreground"
          onClick={() => handleAddTask(FAWZI_ID)}
        >
          <Plus className="size-3.5" />
        </Button>
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

            return (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-border/30"
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
                  return <MeetingCard key={item.id} item={item} style={style} />;
                }
                return (
                  <TaskCard
                    key={item.id}
                    item={item}
                    style={style}
                    onTaskClick={setEditingTask}
                    onTaskComplete={handleComplete}
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
      <div className="hidden">
        <NewTaskModalControlled
          open={showNewTaskModal}
          onOpenChange={setShowNewTaskModal}
          defaultAssigneeId={newTaskDefaultAssignee}
        />
      </div>
    </div>
  );
}
