import { addMinutes } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createGoogleMeetCalendarEvent } from '@/lib/google-calendar';

const DEFAULT_HORIZON_DAYS = 90;
const DEFAULT_MAX_OCCURRENCES_PER_RULE = 4;
const DEFAULT_TIMEZONE = 'Europe/Nicosia';

type RecurrenceRule = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  timezone: string | null;
  starts_on: string;
  ends_on: string | null;
  created_by: string | null;
};

type RuleProfileAttendee = {
  rule_id: string;
  profile_id: string;
};

type RuleExternalAttendee = {
  rule_id: string;
  name: string | null;
  email: string;
};

type ProfileAttendee = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type MeetingMissingLink = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  attendees?: Array<{
    profile?: ProfileAttendee | ProfileAttendee[] | null;
  }>;
  external_attendees?: Array<{
    name: string | null;
    email: string;
  }>;
};

function dateString(date: Date, timezone = DEFAULT_TIMEZONE) {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function compareDateStrings(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function maxDateString(a: string, b: string) {
  return compareDateStrings(a, b) >= 0 ? a : b;
}

function dayOfWeek(date: string, timezone: string) {
  return Number(formatInTimeZone(fromZonedTime(`${date}T12:00:00`, timezone), timezone, 'i')) % 7;
}

function startDateTime(date: string, time: string, timezone: string) {
  return fromZonedTime(`${date}T${time}`, timezone);
}

export async function materializeRecurringMeetings(
  supabase: SupabaseClient,
  options: {
    horizonDays?: number;
    now?: Date;
    maxOccurrencesPerRule?: number;
    createCalendarEvents?: boolean;
  } = {}
) {
  const now = options.now || new Date();
  const today = dateString(now);
  const horizonEnd = addDays(today, options.horizonDays ?? DEFAULT_HORIZON_DAYS);
  const maxOccurrencesPerRule = options.maxOccurrencesPerRule ?? DEFAULT_MAX_OCCURRENCES_PER_RULE;
  const createCalendarEvents = options.createCalendarEvents ?? true;

  const { data: rules, error: rulesError } = await supabase
    .from('meeting_recurrence_rules')
    .select(
      'id, workspace_id, title, description, client_id, project_id, day_of_week, start_time, duration_minutes, timezone, starts_on, ends_on, created_by'
    )
    .eq('is_active', true)
    .lte('starts_on', horizonEnd)
    .or(`ends_on.is.null,ends_on.gte.${today}`);

  if (rulesError) throw rulesError;
  const activeRules = (rules || []) as RecurrenceRule[];
  if (activeRules.length === 0) return { rules: 0, meetings: 0 };

  const ruleIds = activeRules.map((rule) => rule.id);
  const [
    { data: internalRows, error: internalError },
    { data: externalRows, error: externalError },
  ] = await Promise.all([
    supabase
      .from('meeting_recurrence_rule_attendees')
      .select('rule_id, profile_id')
      .in('rule_id', ruleIds),
    supabase
      .from('meeting_recurrence_rule_external_attendees')
      .select('rule_id, name, email')
      .in('rule_id', ruleIds),
  ]);

  if (internalError) throw internalError;
  if (externalError) throw externalError;

  const internalProfileIds = Array.from(
    new Set(((internalRows || []) as RuleProfileAttendee[]).map((row) => row.profile_id))
  );
  const profileById = new Map<string, ProfileAttendee>();
  if (internalProfileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', internalProfileIds);
    if (profilesError) throw profilesError;
    for (const profile of (profiles || []) as ProfileAttendee[]) {
      profileById.set(profile.id, profile);
    }
  }

  const internalByRule = new Map<string, RuleProfileAttendee[]>();
  for (const row of (internalRows || []) as RuleProfileAttendee[]) {
    internalByRule.set(row.rule_id, [...(internalByRule.get(row.rule_id) || []), row]);
  }

  const externalByRule = new Map<string, RuleExternalAttendee[]>();
  for (const row of (externalRows || []) as RuleExternalAttendee[]) {
    externalByRule.set(row.rule_id, [...(externalByRule.get(row.rule_id) || []), row]);
  }

  const { data: existingMeetings, error: existingMeetingsError } = await supabase
    .from('meetings')
    .select('id, recurrence_rule_id, recurrence_occurrence_date, meeting_link')
    .in('recurrence_rule_id', ruleIds)
    .gte('recurrence_occurrence_date', today)
    .lte('recurrence_occurrence_date', horizonEnd);
  if (existingMeetingsError) throw existingMeetingsError;

  const existingByRuleDate = new Map<string, { id: string; meeting_link: string | null }>();
  for (const meeting of (existingMeetings || []) as Array<{
    id: string;
    recurrence_rule_id: string;
    recurrence_occurrence_date: string;
    meeting_link: string | null;
  }>) {
    existingByRuleDate.set(`${meeting.recurrence_rule_id}:${meeting.recurrence_occurrence_date}`, {
      id: meeting.id,
      meeting_link: meeting.meeting_link,
    });
  }

  const meetingRows: Record<string, unknown>[] = [];
  for (const rule of activeRules) {
    const timezone = rule.timezone || DEFAULT_TIMEZONE;
    const ruleStart = maxDateString(rule.starts_on, today);
    const ruleEnd =
      rule.ends_on && compareDateStrings(rule.ends_on, horizonEnd) < 0 ? rule.ends_on : horizonEnd;
    let occurrencesForRule = 0;

    for (let date = ruleStart; compareDateStrings(date, ruleEnd) <= 0; date = addDays(date, 1)) {
      if (occurrencesForRule >= maxOccurrencesPerRule) break;
      if (dayOfWeek(date, timezone) !== rule.day_of_week) continue;
      const start = startDateTime(date, rule.start_time, timezone);
      if (start <= now) continue;
      const existingMeeting = existingByRuleDate.get(`${rule.id}:${date}`);
      if (existingMeeting?.meeting_link) {
        occurrencesForRule += 1;
        continue;
      }
      if (existingMeeting && !createCalendarEvents) {
        occurrencesForRule += 1;
        continue;
      }

      const end = addMinutes(start, rule.duration_minutes);
      const internalAttendees = (internalByRule.get(rule.id) || [])
        .map((attendee) => profileById.get(attendee.profile_id))
        .filter((profile): profile is ProfileAttendee => Boolean(profile?.email))
        .map((profile) => ({ email: profile.email as string, displayName: profile.full_name }));
      const externalAttendees = (externalByRule.get(rule.id) || []).map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
      }));

      const calendarEvent = createCalendarEvents
        ? await createGoogleMeetCalendarEvent({
            title: rule.title,
            description: rule.description,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            timezone,
            attendees: [...internalAttendees, ...externalAttendees],
          })
        : null;

      meetingRows.push({
        recurrence_rule_id: rule.id,
        recurrence_occurrence_date: date,
        workspace_id: rule.workspace_id,
        title: rule.title,
        description: rule.description,
        client_id: rule.client_id,
        project_id: rule.project_id,
        meeting_link: calendarEvent?.meetingLink ?? null,
        google_calendar_event_id: calendarEvent?.eventId ?? null,
        google_calendar_html_link: calendarEvent?.htmlLink ?? null,
        created_by: rule.created_by,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        updated_at: new Date().toISOString(),
      });
      occurrencesForRule += 1;
    }
  }

  if (meetingRows.length === 0) return { rules: activeRules.length, meetings: 0 };

  const insertedOrUpdatedMeetings: Array<{ id: string; recurrence_rule_id: string }> = [];
  const newRows = meetingRows.filter((row) => {
    const ruleId = row.recurrence_rule_id as string;
    const date = row.recurrence_occurrence_date as string;
    return !existingByRuleDate.has(`${ruleId}:${date}`);
  });
  const existingRows = meetingRows.filter((row) => {
    const ruleId = row.recurrence_rule_id as string;
    const date = row.recurrence_occurrence_date as string;
    return existingByRuleDate.has(`${ruleId}:${date}`);
  });

  if (newRows.length > 0) {
    const { data: insertedMeetings, error: insertError } = await supabase
      .from('meetings')
      .insert(newRows)
      .select('id, recurrence_rule_id');

    if (insertError) throw insertError;
    insertedOrUpdatedMeetings.push(
      ...((insertedMeetings || []) as Array<{ id: string; recurrence_rule_id: string }>)
    );
  }

  for (const row of existingRows) {
    const ruleId = row.recurrence_rule_id as string;
    const date = row.recurrence_occurrence_date as string;
    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update(row)
      .eq('recurrence_rule_id', ruleId)
      .eq('recurrence_occurrence_date', date)
      .select('id, recurrence_rule_id')
      .single();

    if (updateError) throw updateError;
    if (updatedMeeting) insertedOrUpdatedMeetings.push(updatedMeeting);
  }

  const attendeeRows: Record<string, string>[] = [];
  const externalAttendeeRows: Record<string, string | null>[] = [];

  for (const meeting of insertedOrUpdatedMeetings) {
    const ruleId = meeting.recurrence_rule_id;
    for (const attendee of internalByRule.get(ruleId) || []) {
      attendeeRows.push({ meeting_id: meeting.id, profile_id: attendee.profile_id });
    }
    for (const attendee of externalByRule.get(ruleId) || []) {
      externalAttendeeRows.push({
        meeting_id: meeting.id,
        name: attendee.name,
        email: attendee.email.toLowerCase(),
      });
    }
  }

  const writes: Array<PromiseLike<unknown>> = [];
  if (attendeeRows.length > 0) {
    writes.push(
      supabase
        .from('meeting_attendees')
        .upsert(attendeeRows, { onConflict: 'meeting_id,profile_id', ignoreDuplicates: true })
    );
  }
  if (externalAttendeeRows.length > 0) {
    writes.push(
      supabase.from('meeting_external_attendees').upsert(externalAttendeeRows, {
        onConflict: 'meeting_id,email',
        ignoreDuplicates: true,
      })
    );
  }

  await Promise.all(writes);

  return { rules: activeRules.length, meetings: meetingRows.length };
}

export async function ensureUpcomingMeetingsHaveGoogleMeetLinks(
  supabase: SupabaseClient,
  options: { horizonDays?: number; now?: Date; limit?: number } = {}
) {
  const now = options.now || new Date();
  const windowEnd = new Date(
    now.getTime() + (options.horizonDays ?? DEFAULT_HORIZON_DAYS) * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('meetings')
    .select(
      `
        id,
        title,
        description,
        start_time,
        end_time,
        attendees:meeting_attendees(profile:profiles(id, full_name, email)),
        external_attendees:meeting_external_attendees(name, email)
      `
    )
    .is('meeting_link', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', windowEnd)
    .order('start_time', { ascending: true })
    .limit(options.limit ?? 50);

  if (error) throw error;

  let updated = 0;
  for (const meeting of (data || []) as unknown as MeetingMissingLink[]) {
    const recipients = new Map<string, { email: string; displayName?: string | null }>();

    for (const attendee of meeting.attendees || []) {
      const profile = Array.isArray(attendee.profile) ? attendee.profile[0] : attendee.profile;
      if (!profile?.email) continue;
      recipients.set(profile.email.toLowerCase(), {
        email: profile.email,
        displayName: profile.full_name,
      });
    }

    for (const attendee of meeting.external_attendees || []) {
      recipients.set(attendee.email.toLowerCase(), {
        email: attendee.email,
        displayName: attendee.name,
      });
    }

    const calendarEvent = await createGoogleMeetCalendarEvent({
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.start_time,
      endTime: meeting.end_time,
      timezone: DEFAULT_TIMEZONE,
      attendees: [...recipients.values()],
    });

    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        meeting_link: calendarEvent.meetingLink,
        google_calendar_event_id: calendarEvent.eventId,
        google_calendar_html_link: calendarEvent.htmlLink,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meeting.id);

    if (updateError) throw updateError;
    updated += 1;
  }

  return { scanned: data?.length || 0, updated };
}
