import { getCurrentWorkspaceId, getMeetings, getProfiles, getScheduledIssues } from '@/app/actions';
import { getTasks, type Task } from '@/app/actions/inbox';
import { TodayDashboard } from '@/components/today-dashboard';
import { createClient } from '@/lib/supabase/server';
import type { ProjectType } from '@/types/database';

export default async function TodayPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard</p>
      </div>
    );
  }

  // Fetch all data in parallel
  const supabase = await createClient();
  const [meetingsRaw, tasksRaw, profilesRaw, projectsRaw, issues] = await Promise.all([
    getMeetings(workspaceId),
    getTasks(workspaceId, { status: ['Todo', 'In Progress', 'Done'], limit: 150, inboxOnly: true }),
    getProfiles(workspaceId),
    supabase.rpc('get_project_stats', { p_workspace_id: workspaceId }),
    getScheduledIssues(workspaceId),
  ]);

  const meetings = meetingsRaw;

  // Get only TASKS (not resources/notes/issues) from all projects
  // Filter for Todo/In Progress OR Done today
  const today = new Date().toISOString().split('T')[0];
  const tasks = tasksRaw
    .filter((t) => {
      if (t.item_type !== 'task') return false;
      if (t.status !== 'Done') return true;
      // If done, only show if completed today
      return t.completed_at?.startsWith(today);
    })
    .map((t) => ({
      ...t,
      status: t.status as 'Todo' | 'In Progress' | 'Done',
      priority: t.priority as 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low',
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            full_name: t.assignee.full_name,
            avatar_url: t.assignee.avatar_url,
          }
        : t.project?.lead
          ? {
              id: t.project.lead.id,
              full_name: t.project.lead.full_name,
              avatar_url: t.project.lead.avatar_url,
              isLead: true,
            }
          : null,
      project: t.project
        ? {
            ...t.project,
            id: t.project.id,
            name: t.project.name,
          }
        : null,
    })) as Task[];

  // Get team members for task grouping
  const teamMembers = profilesRaw.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
  }));

  // Get LIVE projects only (filter by is_live = true)
  // Falls back to Active projects if is_live column doesn't exist yet
  const projects = (projectsRaw.data || [])
    .filter((p: Record<string, unknown>) => {
      // If is_live exists, use it; otherwise fall back to Active status
      if (typeof p.is_live === 'boolean') {
        return p.is_live === true;
      }
      // Fallback for before migration: show Active projects
      return !['Archived', 'Canceled'].includes(p.status as string);
    })
    .map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      project_type: p.project_type as ProjectType | null,
      target_date: p.target_date as string | null,
      logo_url: (p.logo_url as string | null) || null,
      issue_stats: {
        total: Number(p.total_issues) || 0,
        done: Number(p.done_issues) || 0,
      },
    }));

  // Get FINISHED projects (filter by is_finished = true)
  const finishedProjects = (projectsRaw.data || [])
    .filter((p: Record<string, unknown>) => {
      if (typeof p.is_finished === 'boolean') {
        return p.is_finished === true;
      }
      // Fallback for before migration: show Launched projects
      return p.status === 'Launched';
    })
    .map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      project_type: p.project_type as ProjectType | null,
      target_date: p.target_date as string | null,
      logo_url: (p.logo_url as string | null) || null,
      issue_stats: {
        total: Number(p.total_issues) || 0,
        done: Number(p.done_issues) || 0,
      },
    }));

  return (
    <TodayDashboard
      meetings={meetings}
      tasks={tasks}
      teamMembers={teamMembers}
      projects={projects}
      finishedProjects={finishedProjects}
      issues={issues}
    />
  );
}
