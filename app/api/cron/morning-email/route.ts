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
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    // Only profiles with both email + workspace are eligible for briefing
    const eligible = profiles.filter((p) => p.email && p.workspace_id);
    const profileIds = eligible.map((p) => p.id);
    const workspaceIds = Array.from(
      new Set(eligible.map((p) => p.workspace_id).filter((w): w is string => Boolean(w)))
    );

    // Batch-fetch tasks and meetings for everyone in parallel.
    // 3 queries total instead of 3 × N profiles.
    const [overdueRes, todayTasksRes, meetingsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, priority, due_date, assignee_id, workspace_id, project:projects(name)')
        .in('workspace_id', workspaceIds)
        .in('assignee_id', profileIds)
        .in('status', ['Todo', 'In Progress'])
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true }),
      supabase
        .from('tasks')
        .select('id, title, priority, due_date, assignee_id, workspace_id, project:projects(name)')
        .in('workspace_id', workspaceIds)
        .in('assignee_id', profileIds)
        .in('status', ['Todo', 'In Progress'])
        .eq('due_date', todayStr),
      supabase
        .from('meetings')
        .select('id, title, start_time, end_time, meeting_link, workspace_id')
        .in('workspace_id', workspaceIds)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true }),
    ]);

    // Helper to extract project name from Supabase FK array or object
    const getProjectName = (raw: unknown): string | null => {
      if (!raw) return null;
      if (Array.isArray(raw)) return (raw[0] as { name?: string } | undefined)?.name ?? null;
      return (raw as { name?: string }).name ?? null;
    };

    // Group tasks by assignee_id, meetings by workspace_id
    type TaskRow = NonNullable<typeof overdueRes.data>[number];
    type MeetingRow = NonNullable<typeof meetingsRes.data>[number];

    const overdueByAssignee = new Map<string, TaskRow[]>();
    for (const t of overdueRes.data || []) {
      if (!t.assignee_id) continue;
      const list = overdueByAssignee.get(t.assignee_id) || [];
      list.push(t);
      overdueByAssignee.set(t.assignee_id, list);
    }

    const todayByAssignee = new Map<string, TaskRow[]>();
    for (const t of todayTasksRes.data || []) {
      if (!t.assignee_id) continue;
      const list = todayByAssignee.get(t.assignee_id) || [];
      list.push(t);
      todayByAssignee.set(t.assignee_id, list);
    }

    const meetingsByWorkspace = new Map<string, MeetingRow[]>();
    for (const m of meetingsRes.data || []) {
      if (!m.workspace_id) continue;
      const list = meetingsByWorkspace.get(m.workspace_id) || [];
      list.push(m);
      meetingsByWorkspace.set(m.workspace_id, list);
    }

    // Send emails in parallel — each profile gets its own slice of the batched data.
    const results = await Promise.all(
      eligible.map(async (profile) => {
        const email = profile.email as string;
        const workspaceId = profile.workspace_id as string;
        try {
          const overdueTasks = overdueByAssignee.get(profile.id) || [];
          const todayTasks = todayByAssignee.get(profile.id) || [];
          const todayMeetings = meetingsByWorkspace.get(workspaceId) || [];

          const result = await sendMorningEmail(
            email,
            profile.full_name || 'there',
            overdueTasks.map((t) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              due_date: t.due_date,
              project_name: getProjectName(t.project),
            })),
            todayTasks.map((t) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              due_date: t.due_date,
              project_name: getProjectName(t.project),
            })),
            todayMeetings.map((m) => ({
              id: m.id,
              title: m.title,
              start_time: m.start_time,
              end_time: m.end_time,
              meeting_link: m.meeting_link,
            }))
          );

          return { email, success: result.success, error: result.error };
        } catch (err) {
          console.error(`[cron/morning-email] Error processing ${email}:`, err);
          return { email, success: false, error: 'Send failed' };
        }
      })
    );

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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
