import { NextResponse } from 'next/server';
import { sendMorningEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

/**
 * Morning briefing cron job
 * Runs at 6 AM UTC Monday-Friday (configured in vercel.json)
 *
 * This endpoint:
 * 1. Fetches all active profiles (admin + employee)
 * 2. For each user: gets overdue tasks, due-today tasks, and today's meetings
 * 3. Sends a morning briefing email to each user
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[cron/morning-email] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/morning-email] Starting morning briefing job...');

    const supabase = await createClient();

    // Fetch all active team profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, workspace_id')
      .in('role', ['admin', 'employee'])
      .not('email', 'is', null);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('[cron/morning-email] No profiles found');
      return NextResponse.json({
        success: true,
        message: 'No profiles to email',
        emailsSent: 0,
      });
    }

    console.log(`[cron/morning-email] Processing ${profiles.length} team members`);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles) {
      if (!profile.email || !profile.workspace_id) continue;

      try {
        // Fetch overdue tasks (due before today, not done)
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('id, title, priority, due_date, project:projects(name)')
          .eq('workspace_id', profile.workspace_id)
          .eq('assignee_id', profile.id)
          .in('status', ['Todo', 'In Progress'])
          .lt('due_date', todayStr)
          .order('due_date', { ascending: true });

        // Fetch due-today tasks
        const { data: todayTasks } = await supabase
          .from('tasks')
          .select('id, title, priority, due_date, project:projects(name)')
          .eq('workspace_id', profile.workspace_id)
          .eq('assignee_id', profile.id)
          .in('status', ['Todo', 'In Progress'])
          .eq('due_date', todayStr);

        // Fetch today's meetings
        const startOfDay = `${todayStr}T00:00:00.000Z`;
        const endOfDay = `${todayStr}T23:59:59.999Z`;
        const { data: todayMeetings } = await supabase
          .from('meetings')
          .select('id, title, start_time, end_time, meeting_link')
          .eq('workspace_id', profile.workspace_id)
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
          .order('start_time', { ascending: true });

        // Helper to extract project name from Supabase FK array or object
        const getProjectName = (raw: unknown): string | null => {
          if (!raw) return null;
          if (Array.isArray(raw)) return (raw[0] as { name?: string } | undefined)?.name ?? null;
          return (raw as { name?: string }).name ?? null;
        };

        const result = await sendMorningEmail(
          profile.email,
          profile.full_name || 'there',
          (overdueTasks || []).map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            due_date: t.due_date,
            project_name: getProjectName(t.project),
          })),
          (todayTasks || []).map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            due_date: t.due_date,
            project_name: getProjectName(t.project),
          })),
          (todayMeetings || []).map((m) => ({
            id: m.id,
            title: m.title,
            start_time: m.start_time,
            end_time: m.end_time,
            meeting_link: m.meeting_link,
          }))
        );

        results.push({ email: profile.email, success: result.success, error: result.error });
      } catch (err) {
        console.error(`[cron/morning-email] Error processing ${profile.email}:`, err);
        results.push({ email: profile.email, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[cron/morning-email] Completed: ${successCount} emails sent, ${failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} morning briefing emails`,
      emailsSent: successCount,
      emailsFailed: failureCount,
      details: results,
    });
  } catch (error) {
    console.error('[cron/morning-email] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
