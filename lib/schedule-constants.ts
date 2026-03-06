/**
 * Schedule constants for the Team Daily Schedule Hub
 * Defines time blocks, team members, and type definitions
 */

// Time Block Types
export type TimeBlockType = 'standup' | 'focus' | 'break' | 'wrapup';

export interface TimeBlock {
  id: string;
  label: string;
  start: string; // HH:mm format
  end: string; // HH:mm format
  type: TimeBlockType;
  description: string;
  durationMinutes: number;
}

// Working Hours: 8:30 AM - 2:30 PM (6 hours)
export const TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'standup',
    label: 'Morning Standup',
    start: '08:30',
    end: '09:00',
    type: 'standup',
    description: 'Review day, sync priorities',
    durationMinutes: 30,
  },
  {
    id: 'focus-1',
    label: 'Focus Block 1',
    start: '09:00',
    end: '10:30',
    type: 'focus',
    description: 'Deep work - high priority tasks',
    durationMinutes: 90,
  },
  {
    id: 'break-1',
    label: 'Short Break',
    start: '10:30',
    end: '10:45',
    type: 'break',
    description: 'Rest and recharge',
    durationMinutes: 15,
  },
  {
    id: 'focus-2',
    label: 'Focus Block 2',
    start: '10:45',
    end: '12:15',
    type: 'focus',
    description: 'Development and training',
    durationMinutes: 90,
  },
  {
    id: 'lunch',
    label: 'Lunch Break',
    start: '12:15',
    end: '12:45',
    type: 'break',
    description: 'Meal time',
    durationMinutes: 30,
  },
  {
    id: 'focus-3',
    label: 'Focus Block 3',
    start: '12:45',
    end: '14:00',
    type: 'focus',
    description: 'Client work and meetings',
    durationMinutes: 75,
  },
  {
    id: 'wrapup',
    label: 'Wrap-up',
    start: '14:00',
    end: '14:30',
    type: 'wrapup',
    description: 'Review progress, plan tomorrow',
    durationMinutes: 30,
  },
] as const;

// Hasan's Working Hours: 7:00 PM - 12:00 AM (5 hours)
export const HASAN_TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'hasan-standup',
    label: 'Evening Standup',
    start: '19:00',
    end: '19:30',
    type: 'standup',
    description: 'Review day, sync priorities',
    durationMinutes: 30,
  },
  {
    id: 'hasan-focus-1',
    label: 'Focus Block 1',
    start: '19:30',
    end: '21:00',
    type: 'focus',
    description: 'Deep work - high priority tasks',
    durationMinutes: 90,
  },
  {
    id: 'hasan-break',
    label: 'Short Break',
    start: '21:00',
    end: '21:15',
    type: 'break',
    description: 'Rest and recharge',
    durationMinutes: 15,
  },
  {
    id: 'hasan-focus-2',
    label: 'Focus Block 2',
    start: '21:15',
    end: '23:00',
    type: 'focus',
    description: 'Development and training',
    durationMinutes: 105,
  },
  {
    id: 'hasan-wrapup',
    label: 'Wrap-up',
    start: '23:00',
    end: '00:00',
    type: 'wrapup',
    description: 'Review progress, plan tomorrow',
    durationMinutes: 60,
  },
] as const;

// Team Member Configuration
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'trainee';
  colorKey: 'fawzi' | 'moayad' | 'hasan';
}

export const TEAM_MEMBERS: Record<string, TeamMember> = {
  fawzi: {
    id: 'fawzi',
    email: 'info@qualiasolutions.net',
    name: 'Fawzi',
    role: 'admin',
    colorKey: 'fawzi',
  },
  moayad: {
    id: 'moayad',
    email: 'moayad@qualiasolutions.net',
    name: 'Moayad',
    role: 'trainee',
    colorKey: 'moayad',
  },
  hasan: {
    id: 'hasan',
    email: 'hasan@qualiasolutions.net',
    name: 'Hasan',
    role: 'trainee',
    colorKey: 'hasan',
  },
} as const;

// Schedule Visual Constants
export const SCHEDULE_START_HOUR = 8.5; // 8:30 AM
export const SCHEDULE_END_HOUR = 14.5; // 2:30 PM
export const BLOCK_HEIGHT_PX = 80; // Height per time block in pixels

// Time helpers
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function getCurrentBlockId(): string | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const block of TIME_BLOCKS) {
    const startMinutes = parseTimeToMinutes(block.start);
    const endMinutes = parseTimeToMinutes(block.end);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return block.id;
    }
  }

  return null;
}

export function getBlockById(id: string): TimeBlock | undefined {
  return TIME_BLOCKS.find((block) => block.id === id);
}

// Type for task priority scoring
export type TaskPriority = 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';
