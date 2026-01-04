/**
 * Timeline Dashboard Utilities
 * Time calculations and auto-scheduling algorithm for the team timeline
 */

import type { TimelineMeeting, TimelineTask } from '@/app/actions/timeline-dashboard';

// Working hours in minutes from midnight
export const WORK_START_MINUTES = 8 * 60 + 30; // 8:30 AM = 510 minutes
export const WORK_END_MINUTES = 14 * 60 + 30; // 2:30 PM = 870 minutes
export const WORK_DURATION_MINUTES = WORK_END_MINUTES - WORK_START_MINUTES; // 360 minutes = 6 hours

// Time slot types
export interface TimeSlot {
  start: number; // minutes from midnight
  end: number;
  type: 'free' | 'meeting';
}

export interface ScheduledTask {
  task: TimelineTask;
  slot: TimeSlot;
  startPercent: number; // Position on timeline (0-100)
  widthPercent: number; // Width on timeline
  estimatedDuration: number; // minutes
}

// Time markers for the grid (every 30 minutes)
export const TIME_MARKERS = [
  { time: '8:30', minutes: 510 },
  { time: '9:00', minutes: 540 },
  { time: '9:30', minutes: 570 },
  { time: '10:00', minutes: 600 },
  { time: '10:30', minutes: 630 },
  { time: '11:00', minutes: 660 },
  { time: '11:30', minutes: 690 },
  { time: '12:00', minutes: 720 },
  { time: '12:30', minutes: 750 },
  { time: '1:00', minutes: 780 },
  { time: '1:30', minutes: 810 },
  { time: '2:00', minutes: 840 },
  { time: '2:30', minutes: 870 },
] as const;

/**
 * Convert a Date or ISO string to minutes from midnight
 */
export function getMinutesFromMidnight(dateOrString: Date | string): number {
  const date = typeof dateOrString === 'string' ? new Date(dateOrString) : dateOrString;
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Get the percentage position on the timeline (0-100)
 */
export function getTimelinePosition(minutes: number): number {
  // Clamp to working hours
  const clampedMinutes = Math.max(WORK_START_MINUTES, Math.min(WORK_END_MINUTES, minutes));
  return ((clampedMinutes - WORK_START_MINUTES) / WORK_DURATION_MINUTES) * 100;
}

/**
 * Get the current time position as a percentage (0-100)
 * Returns null if outside working hours
 */
export function getCurrentTimePosition(): number | null {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  if (minutes < WORK_START_MINUTES || minutes > WORK_END_MINUTES) {
    return null;
  }

  return getTimelinePosition(minutes);
}

/**
 * Check if a time is within working hours
 */
export function isWithinWorkingHours(minutes: number): boolean {
  return minutes >= WORK_START_MINUTES && minutes <= WORK_END_MINUTES;
}

/**
 * Format minutes to display time (e.g., 510 -> "8:30 AM")
 */
export function formatMinutesToDisplay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get meeting slots from meetings array
 * Returns occupied time ranges within working hours
 */
export function getMeetingSlots(meetings: TimelineMeeting[]): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const meeting of meetings) {
    const start = getMinutesFromMidnight(meeting.start_time);
    const end = getMinutesFromMidnight(meeting.end_time);

    // Clamp to working hours
    const clampedStart = Math.max(WORK_START_MINUTES, start);
    const clampedEnd = Math.min(WORK_END_MINUTES, end);

    // Skip if completely outside working hours
    if (clampedStart >= clampedEnd) continue;

    slots.push({
      start: clampedStart,
      end: clampedEnd,
      type: 'meeting',
    });
  }

  return slots.sort((a, b) => a.start - b.start);
}

/**
 * Get free time slots between meetings
 */
export function getFreeSlots(meetings: TimelineMeeting[]): TimeSlot[] {
  const meetingSlots = getMeetingSlots(meetings);
  const freeSlots: TimeSlot[] = [];

  let currentStart = WORK_START_MINUTES;

  for (const meeting of meetingSlots) {
    if (meeting.start > currentStart) {
      freeSlots.push({
        start: currentStart,
        end: meeting.start,
        type: 'free',
      });
    }
    currentStart = Math.max(currentStart, meeting.end);
  }

  // Add remaining time after last meeting
  if (currentStart < WORK_END_MINUTES) {
    freeSlots.push({
      start: currentStart,
      end: WORK_END_MINUTES,
      type: 'free',
    });
  }

  return freeSlots;
}

/**
 * Priority order for sorting tasks
 */
const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  'No Priority': 4,
};

/**
 * Sort tasks by priority and status
 */
function sortTasksByPriority(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort((a, b) => {
    // In Progress tasks first
    if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
    if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;

    // Then by priority
    const priorityA = PRIORITY_ORDER[a.priority] ?? 4;
    const priorityB = PRIORITY_ORDER[b.priority] ?? 4;
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Then by due date (earlier first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    // Finally by sort_order
    return a.sort_order - b.sort_order;
  });
}

/**
 * Estimate task duration based on priority
 * Higher priority tasks get longer slots
 */
function estimateTaskDuration(task: TimelineTask): number {
  switch (task.priority) {
    case 'Urgent':
      return 60; // 1 hour for urgent
    case 'High':
      return 45; // 45 min for high
    case 'Medium':
      return 30; // 30 min for medium
    default:
      return 30; // Default 30 min
  }
}

/**
 * Auto-schedule tasks into free time slots
 * Distributes tasks by priority into available time
 */
export function autoScheduleTasks(
  tasks: TimelineTask[],
  meetings: TimelineMeeting[],
  assigneeId: string
): ScheduledTask[] {
  // Filter tasks for this assignee
  const assigneeTasks = tasks.filter((t) => t.assignee_id === assigneeId && t.status !== 'Done');

  // Sort by priority
  const sortedTasks = sortTasksByPriority(assigneeTasks);

  // Get free slots
  const freeSlots = getFreeSlots(meetings);

  const scheduled: ScheduledTask[] = [];
  let slotIndex = 0;
  let currentSlotStart = freeSlots[0]?.start ?? WORK_START_MINUTES;

  for (const task of sortedTasks) {
    if (slotIndex >= freeSlots.length) break;

    const slot = freeSlots[slotIndex];
    const duration = estimateTaskDuration(task);
    const availableTime = slot.end - currentSlotStart;

    // Check if task fits in remaining slot time
    if (duration <= availableTime) {
      const taskSlot: TimeSlot = {
        start: currentSlotStart,
        end: currentSlotStart + duration,
        type: 'free',
      };

      scheduled.push({
        task,
        slot: taskSlot,
        startPercent: getTimelinePosition(currentSlotStart),
        widthPercent: (duration / WORK_DURATION_MINUTES) * 100,
        estimatedDuration: duration,
      });

      currentSlotStart += duration;

      // Move to next slot if current is exhausted
      if (currentSlotStart >= slot.end) {
        slotIndex++;
        if (slotIndex < freeSlots.length) {
          currentSlotStart = freeSlots[slotIndex].start;
        }
      }
    } else if (availableTime >= 15) {
      // If at least 15 min available, schedule partial
      const partialDuration = Math.min(duration, availableTime);
      const taskSlot: TimeSlot = {
        start: currentSlotStart,
        end: currentSlotStart + partialDuration,
        type: 'free',
      };

      scheduled.push({
        task,
        slot: taskSlot,
        startPercent: getTimelinePosition(currentSlotStart),
        widthPercent: (partialDuration / WORK_DURATION_MINUTES) * 100,
        estimatedDuration: partialDuration,
      });

      // Move to next slot
      slotIndex++;
      if (slotIndex < freeSlots.length) {
        currentSlotStart = freeSlots[slotIndex].start;
      }
    } else {
      // Skip to next slot
      slotIndex++;
      if (slotIndex < freeSlots.length) {
        currentSlotStart = freeSlots[slotIndex].start;
      }
    }
  }

  return scheduled;
}

/**
 * Get meeting position and width for timeline display
 */
export function getMeetingTimelinePosition(meeting: TimelineMeeting): {
  startPercent: number;
  widthPercent: number;
  isLive: boolean;
} {
  const startMinutes = getMinutesFromMidnight(meeting.start_time);
  const endMinutes = getMinutesFromMidnight(meeting.end_time);
  const duration = endMinutes - startMinutes;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isLive = nowMinutes >= startMinutes && nowMinutes < endMinutes;

  return {
    startPercent: getTimelinePosition(startMinutes),
    widthPercent: Math.max((duration / WORK_DURATION_MINUTES) * 100, 3), // Min 3% width
    isLive,
  };
}

/**
 * Group tasks by assignee ID
 */
export function groupTasksByAssignee(tasks: TimelineTask[]): Map<string, TimelineTask[]> {
  const grouped = new Map<string, TimelineTask[]>();

  for (const task of tasks) {
    const assigneeId = task.assignee_id || 'unassigned';
    if (!grouped.has(assigneeId)) {
      grouped.set(assigneeId, []);
    }
    grouped.get(assigneeId)!.push(task);
  }

  return grouped;
}

/**
 * Get tasks for a specific team member
 */
export function getTasksForMember(
  tasks: TimelineTask[],
  memberId: string
): {
  active: TimelineTask | null;
  queue: TimelineTask[];
  all: TimelineTask[];
} {
  const memberTasks = tasks.filter((t) => t.assignee_id === memberId);
  const sortedTasks = sortTasksByPriority(memberTasks);

  const active = sortedTasks.find((t) => t.status === 'In Progress') || null;
  const queue = sortedTasks.filter((t) => t.status === 'Todo').slice(0, 5);

  return {
    active,
    queue,
    all: sortedTasks,
  };
}
