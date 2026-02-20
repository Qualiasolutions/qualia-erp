'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/app/actions/inbox';

// Timezone constants
export const TIMEZONE_CYPRUS = 'Europe/Nicosia';
export const TIMEZONE_JORDAN = 'Asia/Amman';

// Unified schedule item types
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

export function isScheduleMeeting(item: ScheduleItem): item is ScheduleMeeting {
  return item.type === 'meeting';
}

export function isScheduleTask(item: ScheduleItem): item is ScheduleTask {
  return item.type === 'task';
}

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
