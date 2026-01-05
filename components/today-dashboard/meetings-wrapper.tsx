'use client';

import { useTodaysMeetings } from '@/lib/swr';
import { MeetingsTimeline } from './meetings-timeline';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
  attendees?: Array<{ profile: { id: string; full_name: string | null } }>;
}

interface MeetingsWrapperProps {
  initialMeetings: Meeting[];
}

export function MeetingsWrapper({ initialMeetings }: MeetingsWrapperProps) {
  const { meetings: swrMeetings } = useTodaysMeetings();

  // Use SWR data if available, otherwise fall back to initial SSR data
  const meetings = swrMeetings.length > 0 ? swrMeetings : initialMeetings;

  // Transform SWR data to match the expected Meeting interface
  const normalizedMeetings: Meeting[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.start_time,
    end_time: m.end_time,
    meeting_link: m.meeting_link,
    project: m.project ? { id: m.project.id, name: m.project.name } : null,
    client: m.client ? { id: m.client.id, display_name: m.client.display_name } : null,
    attendees: m.attendees?.map((a) => ({
      profile: a.profile
        ? { id: a.profile.id, full_name: a.profile.full_name }
        : { id: '', full_name: null },
    })),
  }));

  return <MeetingsTimeline meetings={normalizedMeetings} />;
}
