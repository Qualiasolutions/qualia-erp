'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import type { Task } from '@/app/actions/inbox';

// Team member email constants
const TEAM_EMAILS = {
  fawzi: 'info@qualiasolutions.net',
  moayad: 'moayad@qualiasolutions.net',
} as const;

// Types for the timeline dashboard
export type TimelineMeeting = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
};

export type TimelineTask = Task & {
  phase?: string | null; // from milestone field or project phase
  project?: {
    id: string;
    name: string;
    project_type: string | null;
  } | null;
};

export type TeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'lead' | 'trainee';
  colorKey: 'fawzi' | 'moayad';
};

export type TimelineDashboardData = {
  meetings: TimelineMeeting[];
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  newAssignments: string[]; // Task IDs that were recently assigned to current user
};

/**
 * Get all data needed for the Timeline Dashboard
 * Fetches meetings, tasks with phase info, and team members in parallel
 */
export async function getTimelineDashboardData(): Promise<TimelineDashboardData> {
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return {
      meetings: [],
      tasks: [],
      teamMembers: [],
      currentUserId: null,
      newAssignments: [],
    };
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];

  // Parallel queries for efficiency
  const [meetingsResult, tasksResult, profilesResult, notificationsResult] = await Promise.all([
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
        client:clients(id, display_name)
      `
      )
      .eq('workspace_id', workspaceId)
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`)
      .order('start_time', { ascending: true }),

    // Active tasks with project and phase info
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
        milestone,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url),
        project:projects!tasks_project_id_fkey(id, name, project_type)
      `
      )
      .eq('workspace_id', workspaceId)
      .in('status', ['Todo', 'In Progress'])
      .order('priority', { ascending: true })
      .order('sort_order', { ascending: true }),

    // Get team member profiles
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('email', [TEAM_EMAILS.fawzi, TEAM_EMAILS.moayad]),

    // Get unread assignment notifications for current user
    user?.id
      ? supabase
          .from('notifications')
          .select('metadata')
          .eq('user_id', user.id)
          .eq('type', 'task_assigned')
          .eq('is_read', false)
      : Promise.resolve({ data: [] }),
  ]);

  // Normalize meetings (handle array FK responses)
  const meetings: TimelineMeeting[] = (meetingsResult.data || []).map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.start_time,
    end_time: m.end_time,
    meeting_link: m.meeting_link,
    project: Array.isArray(m.project) ? m.project[0] : m.project,
    client: Array.isArray(m.client) ? m.client[0] : m.client,
  }));

  // Normalize tasks with phase from milestone
  const tasks: TimelineTask[] = (tasksResult.data || []).map((t) => ({
    ...t,
    assignee: Array.isArray(t.assignee) ? t.assignee[0] : t.assignee,
    project: Array.isArray(t.project) ? t.project[0] : t.project,
    phase: t.milestone || null, // Use milestone field as phase
  })) as TimelineTask[];

  // Build team members list
  const teamMembers: TeamMember[] = (profilesResult.data || []).map((profile) => {
    const isFawzi = profile.email?.toLowerCase().includes('info@qualia');
    return {
      id: profile.id,
      email: profile.email || '',
      full_name: profile.full_name,
      role: isFawzi ? ('lead' as const) : ('trainee' as const),
      colorKey: isFawzi ? ('fawzi' as const) : ('moayad' as const),
    };
  });

  // Extract new assignment task IDs
  const newAssignments: string[] = (notificationsResult.data || [])
    .map((n) => (n.metadata as { task_id?: string })?.task_id)
    .filter((id): id is string => !!id);

  return {
    meetings,
    tasks,
    teamMembers,
    currentUserId: user?.id || null,
    newAssignments,
  };
}

/**
 * Assign a task to a team member
 * Updates task assignee and creates a notification for the assignee
 */
export async function assignTaskToMember(
  taskId: string,
  assigneeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user for the notification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update the task assignee
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create notification for the assignee (only if assigning to someone else)
  if (assigneeId !== user.id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: assigneeId,
      type: 'task_assigned',
      title: 'New task assigned',
      message: 'You have been assigned a new task',
      metadata: {
        task_id: taskId,
        assigned_by: user.id,
      },
      is_read: false,
    });

    if (notifError) {
      // Log but don't fail - task was assigned successfully
      console.error('Failed to create notification:', notifError);
    }
  }

  return { success: true };
}

/**
 * Mark assignment notification as seen (clears the highlight)
 */
export async function markAssignmentSeen(taskId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  // Mark notification as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('type', 'task_assigned')
    .contains('metadata', { task_id: taskId });

  return { success: true };
}
