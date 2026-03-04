'use client';

/**
 * Schedule utilities for task scoring, block assignment, and timezone handling
 * Consolidated from schedule-shared.ts and schedule-utils.ts
 */

import { useState, useEffect } from 'react';
import { isToday, parseISO } from 'date-fns';
import type { Task } from '@/app/actions/inbox';
import { TimeBlock, TIME_BLOCKS, parseTimeToMinutes, TaskPriority } from './schedule-constants';

// === Timezone Constants ===
export const TIMEZONE_CYPRUS = 'Europe/Nicosia';
export const TIMEZONE_JORDAN = 'Asia/Amman';

// === Schedule Types ===
export type ScheduleItemType = 'meeting' | 'task' | 'issue';

export interface ScheduleTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_time: string;
  end_time: string;
  type: 'task';
  project: {
    id: string;
    name: string;
    project_type?: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface ScheduleMeeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: 'meeting';
  location?: string | null;
  meeting_link?: string | null;
  project: {
    id: string;
    name: string;
    project_group?: string;
  } | null;
  creator?: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
  attendees?: Array<{ id: string; profile?: { id: string; full_name?: string | null } | null }>;
}

export type ScheduleItem = ScheduleMeeting | ScheduleTask;

// === Type Guards ===
export function isScheduleMeeting(item: ScheduleItem): item is ScheduleMeeting {
  return item.type === 'meeting';
}

export function isScheduleTask(item: ScheduleItem): item is ScheduleTask {
  return item.type === 'task';
}

// === Hooks ===
/**
 * Shared timezone hook - get timezone from localStorage or detect from browser
 * Extracted from day-view, weekly-view, calendar-view, meeting-list
 */
export function useTimezone() {
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
    window.dispatchEvent(new Event('timezone-change'));
  };

  return { timezone, setTimezone: setAndStoreTimezone };
}

// === Converters ===
/**
 * Convert raw Task[] from getScheduledTasks into ScheduleTask[]
 */
export function tasksToScheduleItems(tasks: Task[]): ScheduleTask[] {
  return tasks
    .filter((t) => t.scheduled_start_time && t.scheduled_end_time)
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      start_time: t.scheduled_start_time!,
      end_time: t.scheduled_end_time!,
      type: 'task' as const,
      project: t.project
        ? { id: t.project.id, name: t.project.name, project_type: t.project.project_type }
        : null,
      assignee: t.assignee
        ? { id: t.assignee.id, full_name: t.assignee.full_name, avatar_url: t.assignee.avatar_url }
        : null,
    }));
}

// === Scoring and Filtering ===

// Scoring weights for task prioritization
const PRIORITY_SCORES: Record<TaskPriority, number> = {
  Urgent: 80,
  High: 60,
  Medium: 40,
  Low: 20,
  'No Priority': 10,
};

interface TaskScore {
  task: Task;
  score: number;
  reasons: string[];
}

/**
 * Score a task for priority-based scheduling
 * Higher scores = higher priority for focus blocks
 */
export function scoreTask(task: Task, currentUserId?: string | null): TaskScore {
  let score = 0;
  const reasons: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Due date scoring (most important)
  if (task.due_date) {
    const dueDate = task.due_date.split('T')[0];
    if (dueDate < today) {
      score += 150;
      reasons.push('Overdue');
    } else if (dueDate === today) {
      score += 100;
      reasons.push('Due today');
    } else {
      // Due in the future - minor boost
      score += 20;
    }
  }

  // 2. Priority scoring
  const priorityScore = PRIORITY_SCORES[task.priority as TaskPriority] || 10;
  score += priorityScore;
  if (task.priority === 'Urgent' || task.priority === 'High') {
    reasons.push(task.priority);
  }

  // 3. Status scoring (In Progress gets boost)
  if (task.status === 'In Progress') {
    score += 30;
    reasons.push('In progress');
  }

  // 4. Assignment bonus (assigned to current user)
  if (currentUserId && task.assignee_id === currentUserId) {
    score += 15;
  }

  return { task, score, reasons };
}

/**
 * Get tasks sorted by priority score
 */
export function getSortedTasks(tasks: Task[], currentUserId?: string | null): Task[] {
  return tasks
    .map((task) => scoreTask(task, currentUserId))
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.task);
}

/**
 * Get tasks assigned to focus blocks (auto-population)
 * Each focus block gets up to maxTasksPerBlock tasks
 */
export function getTasksForBlocks(tasks: Task[], maxTasksPerBlock = 3): Map<string, Task[]> {
  const blockTasks = new Map<string, Task[]>();
  const assignedTaskIds = new Set<string>();

  // Only assign to focus blocks
  const focusBlocks = TIME_BLOCKS.filter((block) => block.type === 'focus');

  // Sort all tasks by score
  const sortedTasks = getSortedTasks(tasks);

  // Distribute tasks across focus blocks
  for (const block of focusBlocks) {
    const tasksForBlock: Task[] = [];

    for (const task of sortedTasks) {
      if (assignedTaskIds.has(task.id)) continue;
      if (tasksForBlock.length >= maxTasksPerBlock) break;

      tasksForBlock.push(task);
      assignedTaskIds.add(task.id);
    }

    blockTasks.set(block.id, tasksForBlock);
  }

  return blockTasks;
}

/**
 * Get meetings that fall within a specific time block
 */
export function getMeetingsInBlock<T extends { start_time: string; end_time: string }>(
  meetings: T[],
  block: TimeBlock
): T[] {
  const blockStart = parseTimeToMinutes(block.start);
  const blockEnd = parseTimeToMinutes(block.end);

  return meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.start_time);
    const meetingMinutes = meetingDate.getHours() * 60 + meetingDate.getMinutes();

    // Meeting starts within this block
    return meetingMinutes >= blockStart && meetingMinutes < blockEnd;
  });
}

/**
 * Check if a time is within working hours (8:30 AM - 2:30 PM)
 */
export function isWithinWorkingHours(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = 8 * 60 + 30; // 8:30 AM
  const endMinutes = 14 * 60 + 30; // 2:30 PM
  return minutes >= startMinutes && minutes <= endMinutes;
}

/**
 * Get progress percentage through current block
 */
export function getBlockProgress(block: TimeBlock): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(block.start);
  const endMinutes = parseTimeToMinutes(block.end);

  if (currentMinutes < startMinutes) return 0;
  if (currentMinutes >= endMinutes) return 100;

  const elapsed = currentMinutes - startMinutes;
  const total = endMinutes - startMinutes;
  return Math.round((elapsed / total) * 100);
}

/**
 * Get the current time position as percentage of total schedule
 */
export function getScheduleTimePosition(): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 8 * 60 + 30; // 8:30 AM
  const endMinutes = 14 * 60 + 30; // 2:30 PM
  const totalMinutes = endMinutes - startMinutes;

  if (currentMinutes < startMinutes) return 0;
  if (currentMinutes >= endMinutes) return 100;

  return ((currentMinutes - startMinutes) / totalMinutes) * 100;
}

/**
 * Get user color key from email
 */
export function getUserColorKey(email: string | null | undefined): 'fawzi' | 'moayad' | null {
  if (!email) return null;
  const emailLower = email.toLowerCase();

  if (emailLower.includes('info@qualia') || emailLower.includes('fawzi')) {
    return 'fawzi';
  }
  if (emailLower.includes('moayad')) {
    return 'moayad';
  }
  return null;
}

/**
 * Filter tasks for today (due today, overdue, or in progress)
 * Only shows tasks with actual due dates - not all Todo tasks
 */
export function filterTodaysTasks(tasks: Task[]): Task[] {
  const today = new Date().toISOString().split('T')[0];

  return tasks.filter((task) => {
    // Include all in-progress tasks (active work)
    if (task.status === 'In Progress') return true;

    // Include tasks due today or overdue (must have a due date)
    if (task.due_date) {
      const dueDate = task.due_date.split('T')[0];
      return dueDate <= today;
    }

    // Don't include random Todo tasks without due dates
    return false;
  });
}

/**
 * Filter meetings for today using proper date comparison
 */
export function filterTodaysMeetings<T extends { start_time: string }>(meetings: T[]): T[] {
  return meetings.filter((meeting) => {
    try {
      const meetingDate = parseISO(meeting.start_time);
      return isToday(meetingDate);
    } catch {
      return false;
    }
  });
}
