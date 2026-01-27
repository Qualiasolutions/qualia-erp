import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { getScheduledIssues } from '@/app/actions';
import { DayView } from '@/components/day-view';

interface MeetingsWrapperProps {
  initialMeetings: MeetingWithRelations[];
  initialIssues?: Awaited<ReturnType<typeof getScheduledIssues>>;
}

export function MeetingsWrapper({ initialMeetings, initialIssues = [] }: MeetingsWrapperProps) {
  const { meetings } = useMeetings(initialMeetings);

  // Transform meetings to include type: 'meeting' for DayView AND normalize relations
  const dayViewMeetings = meetings.map((m) => ({
    ...m,
    type: 'meeting' as const,
    // Normalize arrays to single objects if needed (SWR/Actions return arrays for relations)
    project: Array.isArray(m.project) ? m.project[0] || null : m.project,
    client: Array.isArray(m.client) ? m.client[0] || null : m.client,
    creator: Array.isArray(m.creator) ? m.creator[0] || null : m.creator,
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Use DayView but we need to ensure it fits the container */}
      <DayView meetings={dayViewMeetings} issues={initialIssues} />
    </div>
  );
}
