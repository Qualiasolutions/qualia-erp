import { NextResponse } from 'next/server';
import { getTasksForReminders, sendDailyDigest } from '@/lib/email';

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

/**
 * Daily task reminder cron job
 * Runs at 9am daily (configured in vercel.json)
 *
 * This endpoint:
 * 1. Fetches all tasks with due dates that are overdue or due today/tomorrow
 * 2. Groups them by assignee
 * 3. Sends a daily digest email to each assignee
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require the secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/reminders] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[cron/reminders] Starting daily reminder job...');

    // Get tasks grouped by assignee
    const { tasksByAssignee } = await getTasksForReminders();

    if (tasksByAssignee.size === 0) {
      console.log('[cron/reminders] No tasks to remind about');
      return NextResponse.json({
        success: true,
        message: 'No tasks require reminders',
        emailsSent: 0,
      });
    }

    console.log(`[cron/reminders] Found ${tasksByAssignee.size} users with tasks to remind`);

    // Send digest emails
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const [, userData] of tasksByAssignee) {
      const result = await sendDailyDigest(
        userData.email,
        userData.name,
        userData.overdue,
        userData.upcoming
      );

      results.push({
        email: userData.email,
        success: result.success,
        error: result.error,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(`[cron/reminders] Completed: ${successCount} emails sent, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminder emails`,
      emailsSent: successCount,
      emailsFailed: failureCount,
      details: results,
    });
  } catch (error) {
    console.error('[cron/reminders] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
