import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { DashboardClient, type Meeting } from '@/components/dashboard-client';
import { getCurrentUserProfile } from './actions';
import type { Task } from './actions/inbox';

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  project_group: string | null;
  target_date: string | null;
  client?: { id: string; display_name: string } | null;
}

// Helper function to get user's dashboard data
async function getDashboardData(userId: string, workspaceId?: string) {
  const supabase = await createClient();

  // Get current time
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get meetings for next 7 days (including ongoing ones from 1 hour ago)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: meetings } = await supabase
    .from('meetings')
    .select(
      `
      id,
      title,
      description,
      start_time,
      end_time,
      meeting_link,
      project:projects(id, name),
      client:clients(id, display_name),
      creator:profiles!meetings_created_by_fkey(id, full_name)
    `
    )
    .gte('start_time', oneHourAgo.toISOString())
    .lte('start_time', oneWeekFromNow.toISOString())
    .eq('workspace_id', workspaceId)
    .order('start_time', { ascending: true })
    .limit(10);

  // Get active projects
  const { data: projects } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      status,
      project_type,
      project_group,
      target_date,
      client:clients(id, display_name)
    `
    )
    .eq('workspace_id', workspaceId)
    .neq('status', 'Completed')
    .neq('status', 'Finished')
    .order('updated_at', { ascending: false });

  // Get today's tasks (due today or overdue, not done)
  const { data: todaysTasks } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      status,
      due_date,
      priority,
      project_id,
      project:projects(id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .in('status', ['Todo', 'In Progress'])
    .lte('due_date', tomorrow.toISOString())
    .order('due_date', { ascending: true })
    .limit(10);

  // Get pending tasks assigned to user (in Todo status)
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select(
      `
      id,
      title,
      status,
      due_date,
      priority,
      project_id,
      project:projects(id, name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('assigned_to', userId)
    .eq('status', 'Todo')
    .order('created_at', { ascending: false })
    .limit(5);

  // Normalize FK arrays to single objects
  const normalizeMeeting = (m: Record<string, unknown>): Meeting => ({
    id: m.id as string,
    title: m.title as string,
    description: m.description as string | null,
    start_time: m.start_time as string,
    end_time: m.end_time as string,
    meeting_link: m.meeting_link as string | null,
    project: Array.isArray(m.project) ? m.project[0] || null : (m.project as Meeting['project']),
    client: Array.isArray(m.client) ? m.client[0] || null : (m.client as Meeting['client']),
    creator: Array.isArray(m.creator) ? m.creator[0] || null : (m.creator as Meeting['creator']),
  });

  const normalizeProject = (p: Record<string, unknown>): DashboardProject => ({
    id: p.id as string,
    name: p.name as string,
    status: p.status as string,
    project_type: p.project_type as string | null,
    project_group: p.project_group as string | null,
    target_date: p.target_date as string | null,
    client: Array.isArray(p.client)
      ? p.client[0] || null
      : (p.client as DashboardProject['client']),
  });

  const normalizeTask = (t: Record<string, unknown>): Task => ({
    id: t.id as string,
    title: t.title as string,
    status: t.status as Task['status'],
    due_date: t.due_date as string | null,
    priority: t.priority as Task['priority'],
    project_id: t.project_id as string | null,
    project: Array.isArray(t.project) ? t.project[0] || null : (t.project as Task['project']),
    // Add required fields with defaults
    description: null,
    item_type: 'task',
    phase_name: (t.phase_name as string | null) || null,
    show_in_inbox: false,
    sort_order: 0,
    workspace_id: workspaceId || '',
    creator_id: null,
    assignee_id: null,
    completed_at: null,
    created_at: '',
    updated_at: '',
  });

  return {
    meetings: (meetings || []).map((m) => normalizeMeeting(m as Record<string, unknown>)),
    projects: (projects || []).map((p) => normalizeProject(p as Record<string, unknown>)),
    todaysTasks: (todaysTasks || []).map((t) => normalizeTask(t as Record<string, unknown>)),
    pendingTasks: (pendingTasks || []).map((t) => normalizeTask(t as Record<string, unknown>)),
  };
}

// Helper function to get current workspace ID
async function getCurrentWorkspaceId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  return membership?.workspace_id || null;
}

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();
  const workspaceId = await getCurrentWorkspaceId();

  // Fetch dashboard data if user is logged in
  let dashboardData = { meetings: [], projects: [], todaysTasks: [], pendingTasks: [] } as Awaited<
    ReturnType<typeof getDashboardData>
  >;

  if (profile?.id && workspaceId) {
    dashboardData = await getDashboardData(profile.id, workspaceId);
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardClient
      greeting={greeting}
      dateString={format(now, 'EEEE, MMMM d')}
      user={
        profile
          ? {
              id: profile.id,
              name: profile.full_name || profile.email || 'User',
              email: profile.email || '',
              workspaceId: workspaceId || undefined,
            }
          : undefined
      }
      todaysTasks={dashboardData.todaysTasks}
      upcomingMeetings={dashboardData.meetings}
      projects={dashboardData.projects}
      pendingTasks={dashboardData.pendingTasks}
    />
  );
}
