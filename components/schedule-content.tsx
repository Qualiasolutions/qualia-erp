'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';
import { MeetingsDayView } from '@/components/meetings-day-view';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
}

export function ScheduleContent({ view, initialMeetings, profiles = [] }: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);

  const meetingsWithType = meetings.map((m) => ({ ...m, type: 'meeting' as const }));

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <WeeklyView meetings={meetingsWithType} />
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

  // Day view — meetings only (tasks are on the dashboard now)
  return (
    <div className="space-y-4">
      <MeetingStats meetings={meetings} />
      <MeetingsDayView meetings={meetings} profiles={profiles} />
    </div>
  );
}
