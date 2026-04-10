import { NextResponse } from 'next/server';

/**
 * Daily task reminder cron job — DISABLED
 *
 * The underlying getTasksForReminders() and sendDailyDigest() functions are
 * unimplemented stubs (lib/email.ts). This route now returns immediately
 * instead of burning compute on no-op calls every day.
 *
 * To re-enable: implement the stubs in lib/email.ts then restore the logic.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: 'Reminders cron disabled — underlying email stubs not yet implemented',
    emailsSent: 0,
  });
}
