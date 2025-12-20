/**
 * Google Meet Link Utilities
 *
 * Generates Google Meet URLs for instant meeting creation.
 */

/**
 * Creates a Google Meet link that starts a new instant meeting.
 * Uses the official Google Meet "new" endpoint which creates a real meeting room.
 *
 * When opened, Google will:
 * 1. Create a new meeting room
 * 2. Redirect to the actual meeting URL (e.g., meet.google.com/abc-defg-hij)
 * 3. The user can then share that URL with others
 */
export function createGoogleMeetLink(): string {
  // This is the official way to start a new Google Meet instantly
  return 'https://meet.google.com/new';
}

/**
 * Creates a Google Calendar event URL with Google Meet attached.
 * This opens Google Calendar with a pre-filled event including a Meet link.
 */
export function createCalendarEventWithMeet(params: {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}): string {
  const { title, startTime, endTime, description } = params;

  // Format dates for Google Calendar (YYYYMMDDTHHmmss format)
  const formatDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const baseUrl = 'https://calendar.google.com/calendar/render';
  const queryParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
    details: description || '',
    add: 'meet', // This adds Google Meet to the event
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Validates if a string is a valid Google Meet link.
 */
export function isValidMeetLink(url: string): boolean {
  const meetPattern = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  return meetPattern.test(url);
}

/**
 * Extracts the meeting code from a Google Meet URL.
 */
export function extractMeetCode(url: string): string | null {
  const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
  return match ? match[1] : null;
}
