import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { safeCompare } from '@/lib/auth-utils';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMeetingReminderEmail } from '@/lib/meeting-reminder-email';

export const maxDuration = 60;

type DueMeeting = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  google_calendar_event_id: string | null;
  google_calendar_html_link: string | null;
  attendees?: Array<{
    profile?:
      | { full_name: string | null; email: string | null }
      | { full_name: string | null; email: string | null }[]
      | null;
  }>;
  external_attendees?: Array<{
    name: string | null;
    email: string;
  }>;
};

type ReminderRecipient = {
  email: string;
  name: string | null;
};

function recipientsForMeeting(meeting: DueMeeting) {
  const byEmail = new Map<string, ReminderRecipient>();

  for (const attendee of meeting.attendees || []) {
    const profile = Array.isArray(attendee.profile) ? attendee.profile[0] : attendee.profile;
    const email = profile?.email?.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, { email, name: profile?.full_name || null });
  }

  for (const attendee of meeting.external_attendees || []) {
    const email = attendee.email.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, { email, name: attendee.name || null });
  }

  return [...byEmail.values()];
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/meeting-reminders] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() + 110 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 130 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('meetings')
      .select(
        `
          id,
          title,
          description,
          start_time,
          end_time,
          meeting_link,
          google_calendar_event_id,
          google_calendar_html_link,
          attendees:meeting_attendees(profile:profiles(full_name, email)),
          external_attendees:meeting_external_attendees(name, email)
        `
      )
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd)
      .order('start_time', { ascending: true })
      .limit(100);

    if (error) throw error;

    const meetings = (data || []) as unknown as DueMeeting[];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const meeting of meetings) {
      const recipients = recipientsForMeeting(meeting);
      if (recipients.length === 0) {
        skipped += 1;
        continue;
      }

      const meetingLink =
        meeting.meeting_link ||
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://qualia-erp.vercel.app'}/schedule`;

      for (const recipient of recipients) {
        const { data: inserted, error: insertError } = await supabase
          .from('meeting_reminder_deliveries')
          .insert({
            meeting_id: meeting.id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            reminder_offset_minutes: 120,
            status: 'pending',
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          if (insertError.code === '23505') {
            skipped += 1;
            continue;
          }
          failed += 1;
          console.error('[cron/meeting-reminders] delivery insert failed:', insertError);
          continue;
        }

        const result = await sendMeetingReminderEmail({
          to: recipient.email,
          recipientName: recipient.name,
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.start_time,
          endTime: meeting.end_time,
          meetingLink,
        });

        await supabase
          .from('meeting_reminder_deliveries')
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null,
            error: result.error || null,
          })
          .eq('id', inserted?.id);

        if (result.success) sent += 1;
        else failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'erp_calendar_reminders_only',
      meetings: meetings.length,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error('[cron/meeting-reminders] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
