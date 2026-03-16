'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import type { Task } from '@/app/actions/inbox';

export type DailyMeeting = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
  creator?: { id: string; full_name: string | null } | null;
};

export type FocusProject = {
  id: string;
  name: string;
  project_type: string | null;
  status: string;
  progress: number;
  client?: { id: string; display_name: string } | null;
};

export type TeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'lead' | 'trainee';
  colorKey: string;
};

export type DailyFlowData = {
  meetings: DailyMeeting[];
  tasks: Task[];
  focusProject: FocusProject | null;
  teamMembers: TeamMember[];
  currentUserId: string | null;
};

/**
 * Get all data needed for the Daily Flow page
 * Fetches meetings, tasks by assignee, and focus project in parallel
 */
export async function getDailyFlowData(): Promise<DailyFlowData> {
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return {
      meetings: [],
      tasks: [],
      focusProject: null,
      teamMembers: [],
      currentUserId: null,
    };
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  // Parallel queries for efficiency
  const [meetingsResult, tasksResult, projectResult, profilesResult] = await Promise.all([
    // Today's meetings with relations
    supabase
      .from('meetings')
      .select(
        `
        id,
        title,
        start_time,
        end_time,
        meeting_link,
        project:projects(id, name),
        client:clients(id, display_name),
        creator:profiles!meetings_created_by_fkey(id, full_name)
      `
      )
      .eq('workspace_id', workspaceId)
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .order('start_time', { ascending: true }),

    // Active tasks with project info
    supabase
      .from('tasks')
      .select(
        `
        id,
        workspace_id,
        creator_id,
        assignee_id,
        project_id,
        title,
        description,
        status,
        priority,
        item_type,
        sort_order,
        due_date,
        completed_at,
        show_in_inbox,
        created_at,
        updated_at,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
        project:projects!tasks_project_id_fkey(id, name, project_type)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('status', ['Todo', 'In Progress'])
      .order('sort_order', { ascending: true }),

    // Most recently updated active project as focus
    supabase
      .from('projects')
      .select(
        `
        id,
        name,
        project_type,
        status,
        progress,
        client:clients(id, display_name)
      `
      )
      .eq('workspace_id', workspaceId)
      .eq('status', 'Active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Get team member profiles dynamically by role
    supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('workspace_id', workspaceId)
      .in('role', ['admin', 'employee', 'manager']),
  ]);

  // Normalize meetings (handle array FK responses)
  const meetings: DailyMeeting[] = (meetingsResult.data || []).map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.start_time,
    end_time: m.end_time,
    meeting_link: m.meeting_link,
    project: Array.isArray(m.project) ? m.project[0] : m.project,
    client: Array.isArray(m.client) ? m.client[0] : m.client,
    creator: Array.isArray(m.creator) ? m.creator[0] : m.creator,
  }));

  // Normalize tasks
  const tasks: Task[] = (tasksResult.data || []).map((t) => ({
    ...t,
    assignee: Array.isArray(t.assignee) ? t.assignee[0] : t.assignee,
    project: Array.isArray(t.project) ? t.project[0] : t.project,
  })) as Task[];

  // Normalize focus project
  let focusProject: FocusProject | null = null;
  if (projectResult.data) {
    const p = projectResult.data;
    focusProject = {
      id: p.id,
      name: p.name,
      project_type: p.project_type,
      status: p.status,
      progress: p.progress || 0,
      client: Array.isArray(p.client) ? p.client[0] : p.client,
    };
  }

  // Build team members list dynamically from DB roles
  const teamMembers: TeamMember[] = (profilesResult.data || []).map((profile) => ({
    id: profile.id,
    email: profile.email || '',
    full_name: profile.full_name,
    role: profile.role === 'admin' ? ('lead' as const) : ('trainee' as const),
    colorKey: profile.id,
  }));

  return {
    meetings,
    tasks,
    focusProject,
    teamMembers,
    currentUserId: user?.id || null,
  };
}
