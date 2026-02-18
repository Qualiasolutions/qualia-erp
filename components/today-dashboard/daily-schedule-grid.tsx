'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { format, parseISO, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, Check, Circle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, quickUpdateTask } from '@/app/actions/inbox';
import { type MeetingWithRelations, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { TASK_PRIORITY_COLORS, type TaskPriorityKey } from '@/lib/color-constants';
import { EditTaskModal } from '@/components/edit-task-modal';
import { NewTaskModalControlled } from '@/components/new-task-modal';

// ── Schedule config ──────────────────────────────────────────────────────────
const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 10

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function hourLabel(hour: number): string {
  const d = setMinutes(setHours(new Date(), hour), 0);
  return format(d, 'h a');
}

/** Returns a 0-100 percentage for where `time` falls in the schedule range */
function pct(time: Date): number {
  const h = time.getHours() + time.getMinutes() / 60;
  return Math.max(0, Math.min(((h - START_HOUR) / TOTAL_HOURS) * 100, 100));
}

/** Returns a percentage height for a duration */
function pctHeight(start: Date, end: Date): number {
  const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  // Min height = 40% of one hour slot so tiny items are still visible
  return Math.max((1 / TOTAL_HOURS) * 100 * 0.4, (dur / TOTAL_HOURS) * 100);
}

// Priority left-border accent
const PRIORITY_ACCENT: Record<string, string> = {
  Urgent: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-yellow-500',
  Low: 'border-l-blue-400',
  'No Priority': 'border-l-zinc-300 dark:border-l-zinc-600',
};

// ── Event Cards ──────────────────────────────────────────────────────────────

function MeetingCard({
  item,
  style,
  isNarrow,
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  isNarrow: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 overflow-hidden rounded-[5px] border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 transition-colors hover:bg-violet-500/[0.15]',
        isNarrow && 'right-[52%]'
      )}
      style={style}
    >
      <p className="truncate text-[11px] font-semibold text-violet-700 dark:text-violet-300">
        {item.title}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-violet-600/70 dark:text-violet-400/60">
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
          className="mt-1 inline-flex items-center gap-1 rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-semibold text-white transition-colors hover:bg-violet-600"
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
  isNarrow,
  onTaskClick,
  onTaskComplete,
}: {
  item: ScheduleItem;
  style: React.CSSProperties;
  isNarrow: boolean;
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
        'absolute inset-x-0 cursor-pointer overflow-hidden rounded-[5px] border border-l-[3px] border-border/40 bg-card px-2.5 py-1.5 transition-all hover:border-border/60 hover:shadow-sm',
        accent,
        isDone && 'opacity-40',
        isNarrow && 'left-[52%]'
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
            <Circle className="size-3 text-foreground/25 transition-colors hover:text-foreground/50" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[11px] font-semibold text-foreground',
              isDone && 'line-through'
            )}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-foreground/45">
            <span>
              {format(item.startTime, 'h:mm')} – {format(item.endTime, 'h:mm a')}
            </span>
            {task.project && (
              <>
                <span className="opacity-40">·</span>
                <span className="truncate">{task.project.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Unscheduled row ──────────────────────────────────────────────────────────

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
      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors hover:bg-accent/40"
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
          <Circle className="size-3 text-foreground/25 hover:text-foreground/50" />
        )}
      </button>
      <span
        className={cn(
          'flex-1 truncate text-[12px] text-foreground',
          isDone && 'line-through opacity-40'
        )}
      >
        {task.title}
      </span>
      {task.project && (
        <span className="max-w-[90px] shrink-0 truncate text-[10px] text-foreground/35">
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

  // Tick every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Partition tasks ──────────────────────────────────────────────────────
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];
    for (const t of tasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        const s = parseISO(t.scheduled_start_time);
        if (isToday(s) || isSameDay(s, new Date())) scheduled.push(t);
        else unscheduled.push(t);
      } else {
        unscheduled.push(t);
      }
    }
    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks]);

  // ── Build schedule items ─────────────────────────────────────────────────
  const items = useMemo(() => {
    const all: ScheduleItem[] = [];
    for (const t of scheduledTasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        all.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          startTime: parseISO(t.scheduled_start_time),
          endTime: parseISO(t.scheduled_end_time),
          task: t,
        });
      }
    }
    for (const m of meetings) {
      const s = parseISO(m.start_time);
      if (isToday(s)) {
        all.push({
          id: `meeting-${m.id}`,
          type: 'meeting',
          title: m.title,
          startTime: s,
          endTime: parseISO(m.end_time),
          meeting: m,
        });
      }
    }
    return all.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [scheduledTasks, meetings]);

  // ── Overlap detection → position map ─────────────────────────────────────
  const positions = useMemo(() => {
    const map = new Map<string, { top: number; height: number; isNarrow: boolean; col: number }>();
    const sorted = [...items].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const top = pct(item.startTime);
      const height = pctHeight(item.startTime, item.endTime);
      let hasOverlap = false;
      let col = 0;

      for (let j = 0; j < i; j++) {
        const other = sorted[j];
        if (item.startTime < other.endTime && item.endTime > other.startTime) {
          hasOverlap = true;
          const prev = map.get(other.id);
          if (prev && prev.col === 0) col = 1;
          // Also mark the other as narrow
          if (prev) map.set(other.id, { ...prev, isNarrow: true });
        }
      }

      map.set(item.id, { top, height, isNarrow: hasOverlap, col });
    }
    return map;
  }, [items]);

  // ── Current time line ────────────────────────────────────────────────────
  const nowPct = useMemo(() => {
    const h = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (h < START_HOUR || h > END_HOUR) return null;
    return pct(currentTime);
  }, [currentTime]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleComplete = useCallback(
    async (taskId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      await quickUpdateTask(taskId, { status: t?.status === 'Done' ? 'Todo' : 'Done' });
      invalidateInboxTasks();
      invalidateDailyFlow();
    },
    [tasks]
  );

  const handleSlotClick = useCallback((hour: number) => {
    // Could pre-fill time in future
    void hour;
    setShowNewTaskModal(true);
  }, []);

  const pendingCount = unscheduledTasks.filter((t) => t.status !== 'Done').length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Schedule</h2>
          <span className="text-xs tabular-nums text-foreground/40">
            {format(new Date(), 'EEE, MMM d')}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-foreground/50 hover:text-foreground"
          onClick={() => setShowNewTaskModal(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* ── Time Grid ──────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {/* Hour rows - using CSS grid for even distribution */}
        <div className="grid h-full" style={{ gridTemplateRows: `repeat(${TOTAL_HOURS}, 1fr)` }}>
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const hour = START_HOUR + i;
            const isCurrentHour = currentTime.getHours() === hour;
            return (
              <div
                key={hour}
                className={cn(
                  'group relative flex border-b border-border/20 transition-colors hover:bg-accent/20',
                  isCurrentHour && 'bg-accent/10'
                )}
                onClick={() => handleSlotClick(hour)}
              >
                {/* Time gutter */}
                <div className="flex w-16 shrink-0 items-start justify-end pr-4 pt-3">
                  <span
                    className={cn(
                      'text-xs font-medium tabular-nums leading-none',
                      isCurrentHour ? 'text-foreground/70' : 'text-foreground/30'
                    )}
                  >
                    {hourLabel(hour)}
                  </span>
                </div>
                {/* Vertical separator */}
                <div className="w-px shrink-0 bg-border/30" />
                {/* Empty event area (items are absolutely positioned over this) */}
                <div className="flex-1" />
              </div>
            );
          })}
        </div>

        {/* ── Event layer (absolute over the grid) ──────────────────── */}
        <div className="pointer-events-none absolute inset-0" style={{ left: 'calc(4rem + 1px)' }}>
          <div className="pointer-events-auto relative h-full px-1.5">
            {items.map((item) => {
              const pos = positions.get(item.id);
              if (!pos) return null;

              const style: React.CSSProperties = {
                top: `${pos.top}%`,
                height: `${pos.height}%`,
              };

              if (item.type === 'meeting') {
                return (
                  <MeetingCard
                    key={item.id}
                    item={item}
                    style={style}
                    isNarrow={pos.isNarrow && pos.col === 0}
                  />
                );
              }
              return (
                <TaskCard
                  key={item.id}
                  item={item}
                  style={style}
                  isNarrow={pos.isNarrow && pos.col === 1}
                  onTaskClick={setEditingTask}
                  onTaskComplete={handleComplete}
                />
              );
            })}
          </div>
        </div>

        {/* ── Current time indicator ────────────────────────────────── */}
        {nowPct !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
            style={{ top: `${nowPct}%` }}
          >
            <div className="flex w-14 items-center justify-end pr-2">
              <div className="size-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            </div>
            <div className="h-[1.5px] flex-1 bg-red-500/60" />
          </div>
        )}
      </div>

      {/* ── Unscheduled Tasks ──────────────────────────────────────────── */}
      {unscheduledTasks.length > 0 && (
        <div className="shrink-0 border-t border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            className="flex w-full items-center gap-2 px-6 py-3 text-left transition-colors hover:bg-muted/50"
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            {showUnscheduled ? (
              <ChevronDown className="size-3.5 text-foreground/40" />
            ) : (
              <ChevronRight className="size-3.5 text-foreground/40" />
            )}
            <span className="text-xs font-semibold text-foreground/60">Unscheduled Tasks</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground/60">
                {pendingCount}
              </span>
            )}
          </button>
          {showUnscheduled && (
            <div className="max-h-36 overflow-y-auto pb-1">
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

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}
      <div className="hidden">
        <NewTaskModalControlled open={showNewTaskModal} onOpenChange={setShowNewTaskModal} />
      </div>
    </div>
  );
}
