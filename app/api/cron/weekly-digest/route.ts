import { NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-utils';
import { sendWeeklyDigests } from '@/lib/email';

export const maxDuration = 60;

/**
 * Weekly client progress digest cron job.
 * Runs every Friday at 9am (configured in vercel.json).
 *
 * Sends each active client a branded email summarizing:
 * - Project progress (phases completed, % done)
 * - Current phase and what's next
 * - Recent activity from the past week
 * - Pending action items requiring their input
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/weekly-digest] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/weekly-digest] Starting weekly digest job...');

    const { sent, errors } = await sendWeeklyDigests();

    console.log(`[cron/weekly-digest] Complete: ${sent} sent, ${errors} errors`);

    return NextResponse.json({
      success: true,
      emailsSent: sent,
      errors,
    });
  } catch (error) {
    console.error('[cron/weekly-digest] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
