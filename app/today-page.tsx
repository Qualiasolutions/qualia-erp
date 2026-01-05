import { getCurrentWorkspaceId, getMeetings, getClients, getProfiles } from '@/app/actions';
import { getTasks } from '@/app/actions/inbox';
import { TodayDashboard } from '@/components/today-dashboard';
import { isToday, parseISO, isPast } from 'date-fns';

// Normalize FK arrays to single objects
function normalizeFK<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

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
  const [meetingsRaw, tasksRaw, clientsRaw, profilesRaw] = await Promise.all([
    getMeetings(workspaceId),
    getTasks(workspaceId, { status: ['Todo', 'In Progress'] }),
    getClients(workspaceId),
    getProfiles(),
  ]);

  const meetings = meetingsRaw.map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.start_time,
    end_time: m.end_time,
    meeting_link: m.meeting_link,
    project: normalizeFK(m.project),
    client: normalizeFK(m.client),
    attendees: m.attendees?.map((a) => ({
      profile: normalizeFK(a.profile) || { id: '', full_name: null },
    })),
  }));

  // Filter tasks due today or overdue, limit to active ones
  const tasks = tasksRaw
    .filter((t) => {
      // Include tasks that are:
      // 1. Due today or overdue
      // 2. Or in progress
      // 3. Or recently created (last 7 days) with no due date
      if (t.status === 'Done') return false;
      if (t.due_date) {
        const dueDate = parseISO(t.due_date);
        return isToday(dueDate) || isPast(dueDate);
      }
      return t.status === 'In Progress';
    })
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as 'Todo' | 'In Progress' | 'Done',
      priority: t.priority as 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low',
      due_date: t.due_date,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            full_name: t.assignee.full_name,
            avatar_url: t.assignee.avatar_url,
          }
        : null,
      project: t.project
        ? {
            id: t.project.id,
            name: t.project.name,
          }
        : null,
    }));

  // Filter leads (hot and cold only for Active Leads)
  const leads = clientsRaw
    .filter((c) => c.lead_status === 'hot' || c.lead_status === 'cold')
    .map((c) => ({
      id: c.id,
      name: c.display_name || 'Unnamed',
      display_name: c.display_name,
      phone: c.phone,
      website: c.website,
      lead_status: c.lead_status,
      last_contacted_at: c.last_contacted_at,
      created_at: c.created_at,
      assigned_to: c.assigned?.id || null,
      projects: c.projects?.map((p) => ({ id: p.id, name: '' })),
    }));

  // Get team members for task grouping
  const teamMembers = profilesRaw.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
  }));

  return (
    <TodayDashboard
      meetings={meetings}
      tasks={tasks}
      leads={leads}
      teamMembers={teamMembers}
      workspaceId={workspaceId}
    />
  );
}
