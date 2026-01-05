'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { DayView } from '@/components/day-view';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
}

export function ScheduleContent({ view, initialMeetings }: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);

  const ViewComponent = view === 'week' ? WeeklyView : view === 'month' ? CalendarView : DayView;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <MeetingStats meetings={meetings} />

      {/* View content */}
      <ViewComponent meetings={meetings} />
    </div>
  );
}
