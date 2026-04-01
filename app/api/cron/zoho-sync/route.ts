import { NextResponse } from 'next/server';
import { syncZohoFinancials } from '@/app/actions/financials';

export const maxDuration = 60;

/**
 * Zoho Books financial sync cron job
 * Runs every 6 hours (configured in vercel.json)
 *
 * Syncs invoices and payments from Zoho Books into
 * financial_invoices and financial_payments tables.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[cron/zoho-sync] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/zoho-sync] Starting Zoho financial sync...');

    const result = await syncZohoFinancials();

    if (!result.success) {
      console.error('[cron/zoho-sync] Sync failed:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    console.log(
      `[cron/zoho-sync] Completed: ${result.invoiceCount} invoices, ${result.paymentCount} payments`
    );

    return NextResponse.json({
      success: true,
      invoiceCount: result.invoiceCount,
      paymentCount: result.paymentCount,
    });
  } catch (error) {
    console.error('[cron/zoho-sync] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
