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
import { EditMeetingModal } from './edit-meeting-modal';
import { NewIssueModal } from './new-issue-modal';

// Cyprus timezone (for Fawzi) - UTC+2 (EET) / UTC+3 (EEST in summer)
const TIMEZONE_CYPRUS = 'Europe/Nicosia';
// Jordan timezone (for Moayad) - UTC+3 (Arabia Standard Time)
const TIMEZONE_JORDAN = 'Asia/Amman';

type ScheduleItemType = 'meeting' | 'issue';

interface BaseScheduleItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: ScheduleItemType;
  project: {
    id: string;
    name: string;
    project_group?: string;
  } | null;
}

interface Meeting extends BaseScheduleItem {
  type: 'meeting';
  location?: string | null;
  meeting_link?: string | null;
  creator?: { id: string; full_name: string | null; email: string | null } | null;
}

interface Issue extends BaseScheduleItem {
  type: 'issue';
  status: string;
  priority: string;
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
}

type ScheduleItem = Meeting | Issue;

// Type guard for Meeting
function isMeeting(item: BaseScheduleItem): item is Meeting {
  return item.type === 'meeting';
}

interface DayViewProps {
  meetings: Meeting[];
  issues?: Issue[];
}

const HOUR_HEIGHT = 80; // Taller for better readability
const START_HOUR = 8; // 8 AM
const END_HOUR = 21; // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Get timezone from localStorage or detect from browser
function useTimezone() {
  const [timezone, setTimezone] = useState(TIMEZONE_CYPRUS);

  useEffect(() => {
    const loadTimezone = () => {
      const stored = localStorage.getItem('preferred_timezone');
      if (stored && (stored === TIMEZONE_CYPRUS || stored === TIMEZONE_JORDAN)) {
        setTimezone(stored);
      } else {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (
          browserTz.includes('Amman') ||
          browserTz.includes('Jerusalem') ||
          browserTz.includes('Beirut')
        ) {
          setTimezone(TIMEZONE_JORDAN);
        }
      }
    };

    loadTimezone();

    // Listen for timezone changes from the toggle
    const handleTimezoneChange = () => loadTimezone();
    window.addEventListener('timezone-change', handleTimezoneChange);
    return () => window.removeEventListener('timezone-change', handleTimezoneChange);
  }, []);

  const setAndStoreTimezone = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem('preferred_timezone', tz);
  };

  return { timezone, setTimezone: setAndStoreTimezone };
}

// Draggable item component
function DraggableItem({
  item,
  timezone,
  height,
  onEdit,
  onDelete,
  isPending,
}: {
  item: ScheduleItem;
  timezone: string;
  height: number;
  onEdit: (item: ScheduleItem) => void;
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
          <span className="text-[10px] font-medium">Join</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute right-2 top-2 flex gap-1 rounded-md border border-border/50 bg-background/50 p-0.5 opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
        {!isItemMeeting && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
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
            {!isItemMeeting && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
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

export function DayView({ meetings, issues = [] }: DayViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDropSlot, setActiveDropSlot] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newIssueTime, setNewIssueTime] = useState<{ start: Date; end: Date } | null>(null);

  // Combine meetings and issues
  const allItems = useMemo(() => {
    const meetingItems: ScheduleItem[] = meetings.map((m) => ({ ...m, type: 'meeting' }));
    const issueItems: ScheduleItem[] = issues.map((i) => ({ ...i, type: 'issue' }));
    return [...meetingItems, ...issueItems];
  }, [meetings, issues]);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start drag after 8px movement
      },
    })
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Get the current time in the selected timezone
  const nowInTz = useMemo(() => toZonedTime(currentTime, timezone), [currentTime, timezone]);
  const todayInTz = startOfDay(nowInTz);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Filter items for the selected day
  const dayItems = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return allItems.filter((item) => {
      const itemStart = toZonedTime(parseISO(item.start_time), timezone);
      return isSameDay(itemStart, dayStart);
    });
  }, [allItems, currentDate, timezone]);

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getItemPosition = useCallback(
    (item: ScheduleItem) => {
      // Convert to timezone for accurate positioning
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
        } else {
          await unscheduleIssue(id);
        }
      });
    }
  }, []);

  const handleEdit = useCallback((item: ScheduleItem) => {
    if (isMeeting(item)) {
      setEditingMeeting(item);
    } else {
      // For now, no edit modal for issues, just drag to reschedule
      console.log('Edit issue', item);
    }
  }, []);

  const handleSlotClick = (hour: number, minute: number) => {
    const clickDate = setMinutes(setHours(currentDate, hour), minute);
    const endDate = addMinutes(clickDate, 60); // Default 1 hour

    setNewIssueTime({ start: clickDate, end: endDate });
    setIsIssueModalOpen(true);
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

      // Parse the slot ID to get hour and minute
      const [hourStr, minuteStr] = slotId.split(':');
      const newHour = parseInt(hourStr, 10);
      const newMinute = parseInt(minuteStr, 10);

      if (isNaN(newHour) || isNaN(newMinute)) return;

      // Calculate the new start and end times
      const originalStart = parseISO(item.start_time);
      const originalEnd = parseISO(item.end_time);
      const duration = differenceInMinutes(originalEnd, originalStart);

      // Create new times in the selected timezone
      const newStart = setMinutes(setHours(startOfDay(currentDate), newHour), newMinute);
      const newEnd = addMinutes(newStart, duration);

      // Update the item
      startTransition(async () => {
        if (isMeeting(item)) {
          await updateMeeting({
            id: itemId,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          });
        } else {
          await scheduleIssue(itemId, newStart.toISOString(), newEnd.toISOString());
        }
      });
    },
    [allItems, currentDate]
  );

  const isToday = isSameDay(currentDate, todayInTz);

  // Find the active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeDragId) return null;
    return allItems.find((m) => m.id === activeDragId) || null;
  }, [activeDragId, allItems]);

  return (
    <>
      <div className="flex h-full flex-col space-y-4">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {format(currentDate, 'EEEE, MMMM d')}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-transparent text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <option value={TIMEZONE_CYPRUS}>Cyprus (Fawzi)</option>
                  <option value={TIMEZONE_JORDAN}>Jordan (Moayad)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-1">
            <button
              onClick={goToPreviousDay}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isToday
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Today
            </button>
            <button
              onClick={goToNextDay}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
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
          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card/50 shadow-lg backdrop-blur-xl">
            {/* Time grid wrapper with Scroll Area if needed */}
            <div className="h-full overflow-y-auto">
              <div
                className="grid grid-cols-[80px_1fr]"
                style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px`, minHeight: '100%' }}
              >
                {/* Time labels */}
                <div className="relative border-r border-border/50 bg-secondary/20">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="relative flex items-start justify-end pr-4 pt-2"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="text-xs font-semibold text-muted-foreground/80">
                        {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day column with droppable slots */}
                <div className={cn('relative', isToday && 'bg-primary/[0.01]')}>
                  {/* Droppable time slots (30-minute intervals) */}
                  {hours.map((hour) => (
                    <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                      {/* Add Task Button Overlay (Visible on Hover) */}
                      <div className="absolute inset-0 z-10 opacity-0 transition-opacity hover:opacity-100">
                        <button
                          onClick={() => handleSlotClick(hour, 0)}
                          className="absolute right-2 top-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm transition-transform hover:scale-110"
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

                  {/* Items */}
                  {dayItems.map((item) => {
                    const { top, height } = getItemPosition(item);
                    const startTime = toZonedTime(parseISO(item.start_time), timezone);
                    const endTime = toZonedTime(parseISO(item.end_time), timezone);

                    // Skip if completely outside visible hours
                    if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                      return null;
                    }

                    return (
                      <div
                        key={item.id}
                        className="absolute left-2 right-2 transition-all"
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
              </div>
            </div>
          </div>

          {/* Drag overlay for visual feedback */}
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

      {/* New Issue Modal */}
      <NewIssueModal
        open={isIssueModalOpen}
        onOpenChange={setIsIssueModalOpen}
        defaultStartTime={newIssueTime?.start}
        defaultEndTime={newIssueTime?.end}
      />
    </>
  );
}
