'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { getScheduledIssues } from '@/app/actions';
import type { Task } from '@/app/actions/inbox';
import { DayView } from '@/components/day-view';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
  initialIssues?: Awaited<ReturnType<typeof getScheduledIssues>>;
  initialTasks?: Task[];
}

export function ScheduleContent({
  view,
  initialMeetings,
  initialIssues = [],
  initialTasks = [],
}: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);

  const meetingsWithType = meetings.map((m) => ({ ...m, type: 'meeting' as const }));

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <WeeklyView meetings={meetingsWithType} tasks={initialTasks} />
      </div>
    );
  }

  if (view === 'month') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <CalendarView meetings={meetingsWithType} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MeetingStats meetings={meetings} />
      <DayView meetings={meetingsWithType} issues={initialIssues} tasks={initialTasks} />
    </div>
  );
}
