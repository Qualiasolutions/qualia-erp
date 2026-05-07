/**
 * Cron: daily-brief
 * Schedule: 03:00 UTC daily (= 06:00 EEST / 05:00 EET in Cyprus)
 *
 * Generates today's daily_brief_items for every admin user. Runs idempotent
 * upserts so manual on-demand regeneration earlier in the day doesn't
 * conflict.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { safeCompare } from '@/lib/auth-utils';
import { cyprusToday, generateDailyBrief } from '@/lib/daily-brief-generator';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/daily-brief] Unauthorized request');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const today = cyprusToday();

    const { data: adminMemberships, error: adminsErr } = await supabase
      .from('workspace_members')
      .select('workspace_id, profile_id, is_default, profiles!inner(id, full_name, role)')
      .eq('is_default', true)
      .eq('profiles.role', 'admin');

    if (adminsErr) {
      console.error('[cron/daily-brief] Failed to load admins:', adminsErr.message);
      return NextResponse.json({ ok: false, error: adminsErr.message }, { status: 500 });
    }

    const results: Array<{
      ownerId: string;
      name: string | null;
      inserted?: number;
      bySource?: Record<string, number>;
      error?: string;
    }> = [];

    for (const m of adminMemberships ?? []) {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (!m.workspace_id || !profile?.id) continue;
      try {
        const result = await generateDailyBrief(supabase, profile.id, m.workspace_id, today);
        results.push({
          ownerId: profile.id,
          name: profile.full_name,
          inserted: result.inserted,
          bySource: result.bySource,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[cron/daily-brief] Failed for ${profile.id}:`, message);
        results.push({ ownerId: profile.id, name: profile.full_name, error: message });
      }
    }

    console.log('[cron/daily-brief]', { date: today, admins: results.length });
    return NextResponse.json({ ok: true, date: today, results });
  } catch (err) {
    unstable_rethrow(err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/daily-brief] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
