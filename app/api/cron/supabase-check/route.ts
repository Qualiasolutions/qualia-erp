import { NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Daily Supabase health check task creator
 * Runs daily at 5:10 AM UTC (8:10 AM Cyprus) - configured in vercel.json
 *
 * Creates a task for Moayad to check Supabase projects for errors/warnings
 * and report findings to the Qualia WhatsApp group.
 * Scheduled 9:20-10:00 AM Cyprus, weekdays only.
 */

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/supabase-check] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/supabase-check] Starting daily Supabase check task creation...');

    const supabase = getSupabaseClient();
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });
    const dayOfWeek = new Date(today + 'T12:00:00+03:00').getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isWeekday) {
      return NextResponse.json({ success: true, message: 'Weekend — skipped' });
    }

    // Find Moayad
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('email', '%moayad%')
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Moayad profile not found' },
        { status: 500 }
      );
    }

    // Get workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', profile.id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      return NextResponse.json({ success: false, error: 'No workspace found' }, { status: 500 });
    }

    const workspaceId = membership.workspace_id;

    // Dedup check
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', profile.id)
      .eq('due_date', today)
      .ilike('title', '%Supabase Health Check%')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: 'Already exists' });
    }

    // Get next sort order
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .eq('status', 'Todo')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastTask ? lastTask.sort_order + 1 : 0;

    const { error: createError } = await supabase.from('tasks').insert({
      title: 'Supabase Health Check & Report',
      description: `Daily Supabase project health check:\n\n1. Open Supabase dashboard and go through each project\n2. Check for errors, warnings, and failed functions in the logs\n3. Check edge function invocations and error rates\n4. Use Codex 5.3 to analyze any issues found\n5. Report findings (without fixing) to the Qualia WhatsApp group\n\nProjects to check: All active Qualia client projects on Supabase`,
      status: 'Todo',
      priority: 'Medium',
      item_type: 'task',
      workspace_id: workspaceId,
      creator_id: profile.id,
      assignee_id: profile.id,
      due_date: today,
      sort_order: nextSortOrder,
      show_in_inbox: true,
      scheduled_start_time: `${today}T09:20+03:00`,
      scheduled_end_time: `${today}T10:00+03:00`,
    });

    if (createError) {
      console.error('[cron/supabase-check] Error creating task:', createError);
      return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
    }

    console.log(`[cron/supabase-check] Created Supabase check task for ${profile.full_name}`);
    return NextResponse.json({ success: true, date: today, employee: profile.full_name });
  } catch (error) {
    console.error('[cron/supabase-check] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
