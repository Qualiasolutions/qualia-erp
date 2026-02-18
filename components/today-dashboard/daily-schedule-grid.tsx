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
  col: number; // 0 = Left (Fawzi), 1 = Right (Moayad)
  span: boolean; // True if spans both columns
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
  const [newTaskDefaultAssignee, setNewTaskDefaultAssignee] = useState<string | null>(null);

  // User IDs
  const FAWZI_ID = '696cbe99-20fe-437c-97fe-246fb3367d9b';
  const MOAYAD_ID = 'e0472b7b-4378-4311-9c45-9d3e8ca94bd2';

  // Tick every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleAddTask = (assigneeId: string) => {
    setNewTaskDefaultAssignee(assigneeId);
    setShowNewTaskModal(true);
  };

  // ── Partition tasks ──────────────────────────────────────────────────────
  const { scheduledItems, unscheduledTasks } = useMemo(() => {
    const items: ScheduleItem[] = [];
    const unscheduled: Task[] = [];

    // Process tasks
    for (const t of tasks) {
      if (t.scheduled_start_time && t.scheduled_end_time) {
        const s = parseISO(t.scheduled_start_time);
        if (isToday(s) || isSameDay(s, new Date())) {
          // Assign col based on assignee (0=Fawzi, 1=Moayad, default=0/Fawzi if unknown)
          // Actually, if unknown, maybe show for both or just Fawzi? Let's default to Fawzi (left)
          // or filter out if not one of them?
          // The prompt implies "one for fawzi and one for moayad", so maybe we only show theirs.
          // Let's check assignee.
          let col = 0; // Default Fawzi
          if (t.assignee_id === MOAYAD_ID) col = 1;
          else if (t.assignee_id === FAWZI_ID) col = 0;
          else {
            // Task assigned to someone else?
            // For now, let's put unassigned or others in Fawzi's column or handle logic?
            // Let's stick to the specific user request: "one for fawzi and one for moayad"
            // If it's unassigned, maybe show in Fawzi's for visibility or check creator?
            // Let's assume left column is main/admin/Fawzi.
            col = 0;
          }

          items.push({
            id: `task-${t.id}`,
            type: 'task',
            title: t.title,
            startTime: s,
            endTime: parseISO(t.scheduled_end_time),
            task: t,
            col,
            span: false, // Tasks generally don't span unless we implement shared tasks later
          });
        } else {
          unscheduled.push(t);
        }
      } else {
        unscheduled.push(t);
      }
    }

    // Process meetings
    for (const m of meetings) {
      const s = parseISO(m.start_time);
      if (isToday(s)) {
        // Check attendees
        const attendees = m.attendees.map((a) => a.profile?.id);
        const hasFawzi = attendees.includes(FAWZI_ID) || m.creator?.id === FAWZI_ID; // Creator is usually attendee
        const hasMoayad = attendees.includes(MOAYAD_ID) || m.creator?.id === MOAYAD_ID;

        if (hasFawzi && hasMoayad) {
          // Merged meeting
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
          // Individual meeting
          if (hasMoayad) {
            items.push({
              id: `meeting-${m.id}`,
              type: 'meeting',
              title: m.title,
              startTime: s,
              endTime: parseISO(m.end_time),
              meeting: m,
              col: 1,
              span: false,
            });
          } else {
            // Default to Fawzi/Left if only Fawzi or neither (e.g. system meeting?)
            items.push({
              id: `meeting-${m.id}`,
              type: 'meeting',
              title: m.title,
              startTime: s,
              endTime: parseISO(m.end_time),
              meeting: m,
              col: 0,
              span: false,
            });
          }
        }
      }
    }

    return {
      scheduledItems: items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      unscheduledTasks: unscheduled,
    };
  }, [tasks, meetings]);

  // ── Overlap detection / Visual Position ──────────────────────────────────
  // We need to calculate width and left position.
  // Col 0: Left 0, Width 50% (if not span)
  // Col 1: Left 50%, Width 50%
  // Span: Left 0, Width 100%
  // AND we need to handle overlaps within the same column if multiple items stack.
  // For simplicity V1: Just place them side-by-side based on Col.
  // TODO: Intra-column overlap handling (like narrowing them further) would be ideal but complex.
  // Let's assume simple 2-column grid for now as requested.

  const positionMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();

    // We also need to handle overlaps *within* a column?
    // The previous implementation handled overlaps by "narrowing".
    // Let's keep it simple:
    // If span: left 0, width 100%
    // If col 0: left 0, width 48% (gap 2%)
    // If col 1: left 52%, width 48%

    // But what if 2 tasks for Fawzi at same time?
    // Let's run the overlap logic per column.

    const resolveColumnOverlaps = (
      colItems: ScheduleItem[],
      baseLeft: number,
      baseWidth: number
    ) => {
      // Simple greedy layout or just stack them?
      // Stacking with z-index or slight offset is easier for "quick" implementation.
      // Let's stick to the provided requirement: "divide schedule into 2 columns".
      // Use basic full width of the column.

      for (const item of colItems) {
        const top = pct(item.startTime);
        const height = pctHeight(item.startTime, item.endTime);

        map.set(item.id, {
          top: `${top}%`,
          height: `${height}%`,
          left: `${baseLeft}%`,
          width: `${baseWidth}%`,
          zIndex: 10, // Base z-index
        });
      }
    };

    const fawziItems = scheduledItems.filter((i) => i.col === 0 && !i.span);
    const moayadItems = scheduledItems.filter((i) => i.col === 1 && !i.span);
    const mergedItems = scheduledItems.filter((i) => i.span);

    // Span items
    for (const item of mergedItems) {
      const top = pct(item.startTime);
      const height = pctHeight(item.startTime, item.endTime);
      map.set(item.id, {
        top: `${top}%`,
        height: `${height}%`,
        left: '0%',
        width: '100%',
        zIndex: 20, // Higher z-index for spanned events
      });
    }

    resolveColumnOverlaps(fawziItems, 0.5, 49); // Leave tiny gap for borders
    resolveColumnOverlaps(moayadItems, 50.5, 49);

    return map;
  }, [scheduledItems]);

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

  const pendingCount = unscheduledTasks.filter((t) => t.status !== 'Done').length;

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
        {/* Global Add - defaults to Fawzi/Unassigned or generic */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-foreground/50 hover:text-foreground"
          onClick={() => handleAddTask(FAWZI_ID)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* ── Column Headers ────────────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 border-b border-border/20 bg-muted/20">
        <div className="w-16 shrink-0 border-r border-border/20" /> {/* Time gutter spacer */}
        <div className="flex flex-1">
          <div className="flex flex-1 items-center justify-between border-r border-border/20 px-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
              <div className="size-2 rounded-full bg-blue-400" />
              Fawzi
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => handleAddTask(FAWZI_ID)}
            >
              <Plus className="size-3 text-muted-foreground" />
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-between px-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
              <div className="size-2 rounded-full bg-purple-400" />
              Moayad
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => handleAddTask(MOAYAD_ID)}
            >
              <Plus className="size-3 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Time Grid ──────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {/* Background Grid */}
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
              >
                {/* Time gutter */}
                <div className="flex w-16 shrink-0 items-start justify-end border-r border-border/30 bg-muted/5 pr-4 pt-3">
                  <span
                    className={cn(
                      'text-xs font-medium tabular-nums leading-none',
                      isCurrentHour ? 'text-foreground/70' : 'text-foreground/30'
                    )}
                  >
                    {hourLabel(hour)}
                  </span>
                </div>
                {/* Column Dividers Background */}
                <div className="relative flex flex-1">
                  <div className="flex-1 border-r border-dashed border-border/20" />
                  <div className="flex-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Event layer (absolute over the grid) ──────────────────── */}
        <div className="pointer-events-none absolute inset-0" style={{ left: '4rem' }}>
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
                    isNarrow={false} // Handled by width in style
                  />
                );
              }
              return (
                <TaskCard
                  key={item.id}
                  item={item}
                  style={style}
                  isNarrow={false} // Handled by width in style
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
            className="pointer-events-none absolute left-0 right-0 z-50 flex items-center"
            style={{ top: `${nowPct}%` }}
          >
            <div className="flex w-16 items-center justify-end pr-2">
              <div className="size-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            </div>
            <div className="h-[1.5px] flex-1 bg-red-500/60 shadow-[0_1px_2px_rgba(239,68,68,0.3)]" />
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
        <NewTaskModalControlled
          open={showNewTaskModal}
          onOpenChange={setShowNewTaskModal}
          defaultAssigneeId={newTaskDefaultAssignee}
        />
      </div>
    </div>
  );
}

// Re-add ScheduleItem interface that was lost in replacement if defined within component file,
// otherwise assume it's at top level.
// Looking at previous view_file, interfaces were defined at top level.
// But I need to update ScheduleItem to include `col` and `span`.

// Since I replaced the *Function*, I should ensure the Interfaces are compatible or if I need to update them too.
// The replace_file_content tool replaces a CONTIGUOUS block.
// I replaced `export function DailyScheduleGrid...`. Use `multi_replace` to update interface as well.
