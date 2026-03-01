'use client';

import { useMeetings, useScheduledTasks, type MeetingWithRelations } from '@/lib/swr';
import type { Task } from '@/app/actions/inbox';
import { ScheduleBlock } from '@/components/schedule-block';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
  initialTasks?: Task[];
  initialBacklog?: Task[];
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
}

export function ScheduleContent({
  view,
  initialMeetings,
  initialTasks,
  initialBacklog = [],
  profiles = [],
}: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);
  const { tasks } = useScheduledTasks(initialTasks);

  const meetingsWithType = meetings.map((m) => ({ ...m, type: 'meeting' as const }));

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <WeeklyView meetings={meetingsWithType} tasks={tasks} />
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

  // Day view - member-split with toggle (same as dashboard)
  return (
    <ScheduleBlock
      scheduledTasks={tasks}
      backlogTasks={initialBacklog}
      meetings={meetings}
      profiles={profiles}
    />
  );
}
