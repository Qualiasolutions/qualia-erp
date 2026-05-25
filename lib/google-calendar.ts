import { randomUUID } from 'crypto';

type GoogleCalendarAttendee = {
  email: string;
  displayName?: string | null;
};

type GoogleCalendarEventInput = {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  timezone?: string;
  attendees?: GoogleCalendarAttendee[];
};

type GoogleCalendarEventResponse = {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
};

export function isGoogleMeetLink(url: string | null | undefined): boolean {
  return Boolean(url?.match(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/));
}

export function hasGoogleCalendarConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim()
  );
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for automatic Google Meet links`);
  return value;
}

async function getGoogleAccessToken() {
  const clientId = requiredEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = requiredEnv('GOOGLE_CALENDAR_CLIENT_SECRET');
  const refreshToken = requiredEnv('GOOGLE_CALENDAR_REFRESH_TOKEN');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar token refresh failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Google Calendar token refresh returned no access token');
  return data.access_token;
}

function meetLinkFromEvent(event: GoogleCalendarEventResponse) {
  return (
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ||
    null
  );
}

export async function createGoogleMeetCalendarEvent(input: GoogleCalendarEventInput) {
  const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary');
  const timezone = input.timezone || 'Europe/Nicosia';
  const accessToken = await getGoogleAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description || undefined,
        start: {
          dateTime: input.startTime,
          timeZone: timezone,
        },
        end: {
          dateTime: input.endTime,
          timeZone: timezone,
        },
        attendees: (input.attendees || [])
          .filter((attendee) => attendee.email)
          .map((attendee) => ({
            email: attendee.email,
            displayName: attendee.displayName || undefined,
          })),
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar event creation failed: ${response.status} ${text}`);
  }

  const event = (await response.json()) as GoogleCalendarEventResponse;
  const meetingLink = meetLinkFromEvent(event);
  if (!meetingLink) {
    throw new Error('Google Calendar created the event but returned no Google Meet link');
  }

  return {
    eventId: event.id || null,
    htmlLink: event.htmlLink || null,
    meetingLink,
  };
}
