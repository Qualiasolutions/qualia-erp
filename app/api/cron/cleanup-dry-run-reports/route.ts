/**
 * Cron: cleanup-dry-run-reports
 * Schedule: daily at 03:00 UTC
 *
 * Deletes synthetic `dry_run=true` session_reports older than 7 days.
 * These rows are connectivity pings from `qualia-framework erp-ping`
 * and serve no purpose once their freshness window has passed.
 *
 * Uses the partial index `session_reports_dry_run_expiry_idx` for
 * an efficient, index-only DELETE scan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { safeCompare } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/cleanup-dry-run-reports] Unauthorized request');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Compute 7-day cutoff
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Delete expired dry_run rows (admin client bypasses RLS)
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('session_reports')
      .delete()
      .eq('dry_run', true)
      .lt('submitted_at', cutoff)
      .select('id');

    if (error) {
      console.error('[cron/cleanup-dry-run-reports] DB error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const deleted = data?.length ?? 0;

    // 4. Structured log + response
    console.log('[cron/cleanup-dry-run-reports]', { deleted, cutoff });
    return NextResponse.json({ ok: true, deleted, cutoff });
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/cleanup-dry-run-reports] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
