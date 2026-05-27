'use server';

import { Resend } from 'resend';

const FROM_EMAIL = 'Qualia Platform <notifications@qualiasolutions.net>';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendMeetingReminderEmail(params: {
  to: string;
  recipientName?: string | null;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  description?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const resendClient = getResendClient();
  if (!resendClient) {
    console.warn('[sendMeetingReminderEmail] Resend not configured, skipping');
    return { success: true };
  }

  const start = new Date(params.startTime);
  const end = new Date(params.endTime);
  const timeLabel = `${start.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Nicosia',
  })} - ${end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Nicosia',
  })}`;

  const greeting = params.recipientName?.trim()
    ? params.recipientName.trim().split(/\s+/)[0]
    : 'there';
  const subject = `Reminder: ${params.title} in 2 hours`;
  const isGoogleMeet = params.meetingLink.includes('meet.google.com');
  const buttonLabel = isGoogleMeet ? 'Join Google Meet' : 'Open meeting';

  const html = `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f7f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px;background:#f5f7f7;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,164,172,.08);">
          <tr>
            <td style="padding:28px 30px 22px;background:#0f172a;">
              <p style="margin:0 0 6px;color:#67e8f9;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Meeting reminder</p>
              <h1 style="margin:0;color:#fff;font-size:22px;line-height:1.25;">${params.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px;color:#111827;">
              <p style="margin:0 0 16px;font-size:15px;">Hi ${greeting}, this meeting starts in 2 hours.</p>
              <p style="margin:0 0 10px;font-size:14px;color:#4b5563;"><strong style="color:#111827;">Time:</strong> ${timeLabel}</p>
              ${
                params.description
                  ? `<p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.5;">${params.description}</p>`
                  : ''
              }
              <a href="${params.meetingLink}" style="display:inline-block;background:#00A4AC;color:#fff;text-decoration:none;padding:11px 22px;border-radius:7px;font-weight:700;font-size:14px;">${buttonLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    `Reminder: ${params.title}`,
    '',
    `Hi ${greeting}, this meeting starts in 2 hours.`,
    `Time: ${timeLabel}`,
    params.description ? `Notes: ${params.description}` : '',
    `${buttonLabel}: ${params.meetingLink}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await resendClient.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error(`[sendMeetingReminderEmail] Failed to send to ${params.to}:`, error);
    return { success: false, error: String(error.message ?? error) };
  }

  return { success: true };
}
