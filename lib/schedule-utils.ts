/**
 * Schedule utilities for task scoring and block assignment
 */

import type { Task } from '@/app/actions/inbox';
import { TimeBlock, TIME_BLOCKS, parseTimeToMinutes, TaskPriority } from './schedule-constants';

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
 * Filter tasks for today (due today or in progress)
 */
export function filterTodaysTasks(tasks: Task[]): Task[] {
  const today = new Date().toISOString().split('T')[0];

  return tasks.filter((task) => {
    // Include all in-progress tasks
    if (task.status === 'In Progress') return true;

    // Include tasks due today or overdue
    if (task.due_date) {
      const dueDate = task.due_date.split('T')[0];
      return dueDate <= today;
    }

    // Include todo tasks (they need to be done)
    if (task.status === 'Todo') return true;

    return false;
  });
}

/**
 * Filter meetings for today
 */
export function filterTodaysMeetings<T extends { start_time: string }>(meetings: T[]): T[] {
  const today = new Date().toISOString().split('T')[0];

  return meetings.filter((meeting) => {
    return meeting.start_time.startsWith(today);
  });
}
