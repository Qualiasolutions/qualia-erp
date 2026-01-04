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
import { deleteMeeting, updateMeeting } from '@/app/actions';
import { EditMeetingModal } from './edit-meeting-modal';

// Cyprus timezone (for Fawzi) - UTC+2 (EET) / UTC+3 (EEST in summer)
const TIMEZONE_CYPRUS = 'Europe/Nicosia';
// Jordan timezone (for Moayad) - UTC+3 (Arabia Standard Time)
const TIMEZONE_JORDAN = 'Asia/Amman';

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

interface DayViewProps {
  meetings: Meeting[];
}

const HOUR_HEIGHT = 55; // pixels per hour (optimized to fit on one page)
const START_HOUR = 7; // 7 AM
const END_HOUR = 21; // 8 PM (inclusive, shows 7am-8pm)

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

// Draggable meeting card component
function DraggableMeeting({
  meeting,
  timezone,
  height,
  onEdit,
  onDelete,
  isPending,
}: {
  meeting: Meeting;
  timezone: string;
  height: number;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meeting.id,
    data: { meeting },
  });

  const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
  const endTime = toZonedTime(parseISO(meeting.end_time), timezone);

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-grab overflow-hidden rounded-lg border border-primary/30 bg-primary/20 p-3 transition-colors hover:bg-primary/30',
        isDragging && 'cursor-grabbing shadow-lg ring-2 ring-primary/50'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Action buttons */}
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(meeting);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-primary/30 hover:text-foreground"
          title="Edit meeting"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(meeting.id);
          }}
          disabled={isPending}
          className="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
          title="Delete meeting"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start justify-between gap-2 pl-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{meeting.title}</div>
          {height > 50 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </span>
            </div>
          )}
          {height > 80 && meeting.project && (
            <div className="mt-2 truncate text-xs text-primary/80">{meeting.project.name}</div>
          )}
          {height > 100 && meeting.description && (
            <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {meeting.description}
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
      className={cn(
        'h-[27.5px] border-b border-border/30 transition-colors',
        isOver && 'bg-primary/20'
      )}
      style={{ height: `${HOUR_HEIGHT / 2}px` }}
    />
  );
}

export function DayView({ meetings }: DayViewProps) {
  const { timezone, setTimezone } = useTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(() => toZonedTime(new Date(), TIMEZONE_CYPRUS));
  const [isPending, startTransition] = useTransition();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDropSlot, setActiveDropSlot] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

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

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Filter meetings for the selected day
  const dayMeetings = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return meetings.filter((meeting) => {
      const meetingInTz = toZonedTime(parseISO(meeting.start_time), timezone);
      return isSameDay(meetingInTz, dayStart);
    });
  }, [meetings, currentDate, timezone]);

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(toZonedTime(new Date(), timezone));

  const getMeetingPosition = useCallback(
    (meeting: Meeting) => {
      // Convert to timezone for accurate positioning
      const start = toZonedTime(parseISO(meeting.start_time), timezone);
      const end = toZonedTime(parseISO(meeting.end_time), timezone);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      const topOffset = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

      return { top: Math.max(0, topOffset), height: Math.max(30, height) };
    },
    [timezone]
  );

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      startTransition(async () => {
        await deleteMeeting(id);
      });
    }
  }, []);

  const handleEdit = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting);
  }, []);

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

      const meetingId = active.id as string;
      const slotId = over.id as string;
      const meeting = meetings.find((m) => m.id === meetingId);

      if (!meeting) return;

      // Parse the slot ID to get hour and minute
      const [hourStr, minuteStr] = slotId.split(':');
      const newHour = parseInt(hourStr, 10);
      const newMinute = parseInt(minuteStr, 10);

      if (isNaN(newHour) || isNaN(newMinute)) return;

      // Calculate the new start and end times
      const originalStart = parseISO(meeting.start_time);
      const originalEnd = parseISO(meeting.end_time);
      const duration = differenceInMinutes(originalEnd, originalStart);

      // Create new times in the selected timezone
      const newStart = setMinutes(setHours(startOfDay(currentDate), newHour), newMinute);
      const newEnd = addMinutes(newStart, duration);

      // Update the meeting
      startTransition(async () => {
        await updateMeeting({
          id: meetingId,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        });
      });
    },
    [meetings, currentDate]
  );

  const isToday = isSameDay(currentDate, todayInTz);

  // Find the active meeting for drag overlay
  const activeMeeting = useMemo(() => {
    if (!activeDragId) return null;
    return meetings.find((m) => m.id === activeDragId) || null;
  }, [activeDragId, meetings]);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="surface overflow-hidden rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-foreground">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={TIMEZONE_CYPRUS}>Cyprus (Fawzi)</option>
                  <option value={TIMEZONE_JORDAN}>Jordan (Moayad)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goToPreviousDay}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextDay}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Time grid */}
          <div
            className="grid grid-cols-[80px_1fr]"
            style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}
          >
            {/* Time labels */}
            <div className="relative">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border/50 pr-2 text-right"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="relative -top-2 text-xs font-medium text-muted-foreground">
                    {format(setHours(setMinutes(new Date(), 0), hour), 'h a')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day column with droppable slots */}
            <div className={cn('relative border-l border-border', isToday && 'bg-primary/[0.02]')}>
              {/* Droppable time slots (30-minute intervals) */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border/50"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
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
                  className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                  style={{
                    top: `${((nowInTz.getHours() * 60 + nowInTz.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  <div className="-ml-1 -mt-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}

              {/* Meetings */}
              {dayMeetings.map((meeting) => {
                const { top, height } = getMeetingPosition(meeting);
                const startTime = toZonedTime(parseISO(meeting.start_time), timezone);
                const endTime = toZonedTime(parseISO(meeting.end_time), timezone);

                // Skip if outside visible hours
                if (startTime.getHours() >= END_HOUR || endTime.getHours() < START_HOUR) {
                  return null;
                }

                return (
                  <div
                    key={meeting.id}
                    className="absolute left-2 right-2"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <DraggableMeeting
                      meeting={meeting}
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

        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {activeMeeting && (
            <div className="w-64 cursor-grabbing rounded-lg border border-primary bg-primary/30 p-3 shadow-lg">
              <div className="truncate text-sm font-semibold text-foreground">
                {activeMeeting.title}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {format(toZonedTime(parseISO(activeMeeting.start_time), timezone), 'h:mm a')} -{' '}
                  {format(toZonedTime(parseISO(activeMeeting.end_time), timezone), 'h:mm a')}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={editingMeeting}
        open={editingMeeting !== null}
        onOpenChange={(open) => !open && setEditingMeeting(null)}
      />
    </>
  );
}
