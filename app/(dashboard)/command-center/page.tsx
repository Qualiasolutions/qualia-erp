import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CommandCenter } from '@/components/command-center';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Command Center',
  description: 'Your mission control for projects, tasks, and team coordination',
};

async function getCommandCenterData(userId: string, workspaceId: string) {
  const supabase = await createClient();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Run all queries in parallel for performance
  const [
    todayTasksResult,
    completedTodayResult,
    overdueResult,
    meetingsResult,
    activeProjectsResult,
    hotLeadsResult,
    urgentTasksResult,
    weeklyCompletedResult,
    weeklyTotalResult,
  ] = await Promise.all([
    // Today's tasks
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'done'),

    // Completed today
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .gte('updated_at', today.toISOString()),

    // Overdue tasks
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .lt('due_date', today.toISOString())
      .neq('status', 'done'),

    // Today's meetings
    supabase
      .from('meetings')
      .select(
        `
        id,
        title,
        start_time,
        end_time,
        meeting_link,
        client:clients(display_name)
      `
      )
      .eq('workspace_id', workspaceId)
      .gte('start_time', now.toISOString())
      .lt('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true })
      .limit(5),

    // Active projects count
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'in_progress']),

    // Hot leads count
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('lead_status', 'hot'),

    // Urgent tasks (high/critical priority, not done)
    supabase
      .from('issues')
      .select(
        `
        id,
        title,
        priority,
        due_date,
        project:projects(name)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('priority', ['high', 'critical'])
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(6),

    // Weekly completed (for progress calculation)
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .gte('updated_at', weekAgo.toISOString()),

    // Weekly total (for progress calculation)
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .or(`created_at.gte.${weekAgo.toISOString()},updated_at.gte.${weekAgo.toISOString()}`),
  ]);

  // Process meetings data
  const meetings = (meetingsResult.data || []).map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.start_time,
    end_time: m.end_time,
    meeting_link: m.meeting_link,
    client: Array.isArray(m.client) ? m.client[0] : m.client,
  }));

  // Process urgent tasks data
  const urgentTasks = (urgentTasksResult.data || []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    project: Array.isArray(t.project) ? t.project[0] : t.project,
  }));

  // Calculate weekly progress
  const weeklyCompleted = weeklyCompletedResult.count || 0;
  const weeklyTotal = weeklyTotalResult.count || 1; // Avoid division by zero
  const weeklyProgress = Math.min(100, Math.round((weeklyCompleted / weeklyTotal) * 100));

  return {
    stats: {
      todayTasks: todayTasksResult.count || 0,
      completedToday: completedTodayResult.count || 0,
      overdueTasks: overdueResult.count || 0,
      upcomingMeetings: meetings.length,
      activeProjects: activeProjectsResult.count || 0,
      hotLeads: hotLeadsResult.count || 0,
      weeklyProgress,
    },
    meetings,
    urgentTasks,
    recentActivity: [], // TODO: Implement activity tracking
  };
}

export default async function CommandCenterPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Get default workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  const workspaceId = membership?.workspace_id;

  if (!workspaceId) {
    redirect('/onboarding');
  }

  // Fetch all command center data
  const data = await getCommandCenterData(user.id, workspaceId);

  return (
    <CommandCenter
      user={{
        id: profile.id,
        name: profile.full_name || profile.email || 'User',
        email: profile.email || '',
        role: profile.role,
        workspaceId,
      }}
      stats={data.stats}
      meetings={data.meetings}
      urgentTasks={data.urgentTasks}
      recentActivity={data.recentActivity}
    />
  );
}
