import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getTasks, getClientVisibleTasks, type Task } from '@/app/actions/inbox';
import { isUserAdmin } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { QualiaTasksList } from '@/components/portal/qualia-tasks-list';
import { QualiaTasksView } from '@/components/portal/qualia-tasks-view';

type TasksMode = 'inbox' | 'all-tasks' | 'client';

export const metadata: Metadata = {
  title: 'Tasks | Qualia',
  description: 'Your tasks across every project',
};

interface PageProps {
  searchParams: Promise<{ scope?: string }>;
}

export default async function PortalTasksPage({ searchParams }: PageProps) {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  const profile = await getPortalProfile(user.id);

  const role = profile?.role || 'client';
  const params = await searchParams;
  const requestedScope = params.scope;

  if (role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'tasks', role);
    if (!allowed) redirect('/');
  }

  // Resolve admin check + workspace in parallel — both depend only on user.id,
  // not on each other. Skip isUserAdmin entirely for clients (caught above).
  const [isAdmin, workspaceId] = await Promise.all([
    role !== 'client' ? isUserAdmin(user.id) : Promise.resolve(false),
    getCurrentWorkspaceId(),
  ]);

  // Resolve mode from role + ?scope=
  let mode: TasksMode;
  if (role === 'client') {
    mode = 'client';
  } else if (requestedScope === 'all') {
    if (!isAdmin) redirect('/tasks'); // employees can't request the workspace-wide view
    mode = 'all-tasks';
  } else {
    mode = 'inbox';
  }

  const supabase = await createClient();
  let initialTasks: Task[] = [];
  let initialNextCursor: string | null = null;
  let assignableMembers: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }> = [];

  if (mode === 'client') {
    const { data: clientProjects } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id);
    const projectIds = (clientProjects || []).map((p) => p.project_id);
    const result = await getClientVisibleTasks(projectIds, role);
    initialTasks = (result.success ? (result.data as Task[]) : []) ?? [];
  } else if (mode === 'all-tasks') {
    // M5 (OPTIMIZE.md): cursor pagination — fetch first page (100) instead of
    // a hard-capped 500. The Load more button in the task list fetches follow-up
    // pages via the loadMoreWorkspaceTasks server action.
    const paged = await getTasks(workspaceId, { scope: 'all', paged: true });
    initialTasks = paged.tasks;
    initialNextCursor = paged.nextCursor;
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'employee'])
      .order('full_name', { ascending: true });
    assignableMembers = (members || []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
    }));
  } else {
    // inbox: my tasks, active by default
    initialTasks = await getTasks(workspaceId, {
      scope: 'mine',
      status: ['Todo', 'In Progress'],
      limit: 200,
      inboxOnly: true,
    });
  }

  // Normalize role to the union TasksView understands. Anything unexpected
  // collapses to 'employee' (least privileged internal) — clients are caught
  // earlier and routed via mode === 'client'.
  const normalizedRole: 'admin' | 'employee' | 'client' =
    role === 'admin' ? 'admin' : role === 'client' ? 'client' : 'employee';

  // Client mode keeps the existing read-only QualiaTasksList. Admin/employee
  // adopt the new QualiaTasksView (Today's Focus + quick add + detail panel).
  if (mode === 'client') {
    return (
      <QualiaTasksList
        mode={mode}
        initialTasks={initialTasks}
        initialNextCursor={initialNextCursor}
        userRole={normalizedRole}
        isAdmin={isAdmin}
        assignableMembers={assignableMembers}
      />
    );
  }

  return (
    <QualiaTasksView
      mode={mode}
      initialTasks={initialTasks}
      userRole={normalizedRole as 'admin' | 'employee'}
    />
  );
}
