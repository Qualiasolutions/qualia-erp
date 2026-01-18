'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTodaysMeetings, type MeetingWithRelations } from '@/lib/swr';
import { differenceInMinutes, parseISO } from 'date-fns';

export interface UpcomingMeeting {
  id: string;
  title: string;
  start_time: string;
  meeting_link: string | null;
  client: { id: string; display_name: string; lead_status: string | null } | null;
  project: { id: string; name: string } | null;
  attendees: Array<{ profile: { id: string; full_name: string | null } | null }>;
  minutesUntil: number;
}

interface MeetingReminderConfig {
  reminderMinutes?: number; // Default: 30 minutes
  checkIntervalMs?: number; // Default: 60000 (1 minute)
  enabled?: boolean;
}

interface MeetingReminderResult {
  upcomingMeeting: UpcomingMeeting | null;
  shouldRemind: boolean;
  dismissReminder: () => void;
  acknowledgedMeetings: Set<string>;
}

/**
 * Hook to check for upcoming meetings and trigger reminders
 * Checks every minute for meetings starting in the next N minutes
 */
export function useMeetingReminder(config: MeetingReminderConfig = {}): MeetingReminderResult {
  const {
    reminderMinutes = 30,
    checkIntervalMs = 60000, // 1 minute
    enabled = true,
  } = config;

  const { meetings, isLoading } = useTodaysMeetings();
  const [upcomingMeeting, setUpcomingMeeting] = useState<UpcomingMeeting | null>(null);
  const [shouldRemind, setShouldRemind] = useState(false);
  const [acknowledgedMeetings, setAcknowledgedMeetings] = useState<Set<string>>(new Set());

  // Track last reminded meeting to avoid duplicate reminders
  const lastRemindedRef = useRef<string | null>(null);

  const checkUpcomingMeetings = useCallback(() => {
    if (!enabled || isLoading || !meetings.length) {
      setUpcomingMeeting(null);
      setShouldRemind(false);
      return;
    }

    const now = new Date();

    // Find meetings starting within the reminder window
    const upcoming = meetings
      .map((meeting: MeetingWithRelations) => {
        try {
          const startTime = parseISO(meeting.start_time);
          const minutesUntil = differenceInMinutes(startTime, now);

          return {
            id: meeting.id,
            title: meeting.title,
            start_time: meeting.start_time,
            meeting_link: meeting.meeting_link,
            client: meeting.client,
            project: meeting.project,
            attendees: meeting.attendees || [],
            minutesUntil,
          } as UpcomingMeeting;
        } catch {
          return null;
        }
      })
      .filter((m): m is UpcomingMeeting => {
        if (!m) return false;
        // Meeting should be:
        // 1. Starting within reminder window (e.g., 30 minutes)
        // 2. Not already started (minutesUntil >= 0)
        // 3. Not already acknowledged
        return (
          m.minutesUntil >= 0 &&
          m.minutesUntil <= reminderMinutes &&
          !acknowledgedMeetings.has(m.id)
        );
      })
      .sort((a, b) => a.minutesUntil - b.minutesUntil);

    const nextMeeting = upcoming[0] || null;
    setUpcomingMeeting(nextMeeting);

    // Should remind if:
    // 1. There's an upcoming meeting
    // 2. We haven't reminded for this meeting yet
    // 3. Meeting is within the reminder window
    if (nextMeeting && lastRemindedRef.current !== nextMeeting.id) {
      setShouldRemind(true);
      lastRemindedRef.current = nextMeeting.id;
    } else if (!nextMeeting) {
      setShouldRemind(false);
    }
  }, [enabled, isLoading, meetings, reminderMinutes, acknowledgedMeetings]);

  // Check on mount and whenever meetings change
  useEffect(() => {
    checkUpcomingMeetings();
  }, [checkUpcomingMeetings]);

  // Set up interval to check periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkUpcomingMeetings, checkIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, checkIntervalMs, checkUpcomingMeetings]);

  // Dismiss the current reminder
  const dismissReminder = useCallback(() => {
    setShouldRemind(false);
    if (upcomingMeeting) {
      setAcknowledgedMeetings((prev) => new Set([...prev, upcomingMeeting.id]));
    }
  }, [upcomingMeeting]);

  // Reset acknowledged meetings at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setAcknowledgedMeetings(new Set());
      lastRemindedRef.current = null;
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  return {
    upcomingMeeting,
    shouldRemind,
    dismissReminder,
    acknowledgedMeetings,
  };
}

/**
 * Generate Arabic reminder message for a meeting
 */
export function generateArabicReminder(userName: string, meeting: UpcomingMeeting): string {
  const minutesText =
    meeting.minutesUntil === 1
      ? 'دقيقة واحدة'
      : meeting.minutesUntil <= 10
        ? `${meeting.minutesUntil} دقائق`
        : `${meeting.minutesUntil} دقيقة`;

  // Get who the meeting is with
  let withWhom = '';
  if (meeting.client?.display_name) {
    withWhom = meeting.client.display_name;
  } else if (meeting.attendees?.length) {
    const attendeeNames = meeting.attendees
      .map((a) => a.profile?.full_name)
      .filter(Boolean)
      .slice(0, 2);
    withWhom = attendeeNames.join(' و ');
  }

  // Build the message
  let message = `مرحباً ${userName}، عندك اجتماع`;

  if (withWhom) {
    message += ` مع ${withWhom}`;
  } else if (meeting.title) {
    message += `: ${meeting.title}`;
  }

  message += ` بعد ${minutesText}`;

  return message;
}

/**
 * Generate English reminder message for a meeting
 */
export function generateEnglishReminder(userName: string, meeting: UpcomingMeeting): string {
  const minutesText = meeting.minutesUntil === 1 ? '1 minute' : `${meeting.minutesUntil} minutes`;

  let withWhom = '';
  if (meeting.client?.display_name) {
    withWhom = meeting.client.display_name;
  } else if (meeting.attendees?.length) {
    const attendeeNames = meeting.attendees
      .map((a) => a.profile?.full_name)
      .filter(Boolean)
      .slice(0, 2);
    withWhom = attendeeNames.join(' and ');
  }

  let message = `Hi ${userName}, you have a meeting`;

  if (withWhom) {
    message += ` with ${withWhom}`;
  } else if (meeting.title) {
    message += `: ${meeting.title}`;
  }

  message += ` in ${minutesText}`;

  return message;
}
