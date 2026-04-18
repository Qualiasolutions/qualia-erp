import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getTasks, getClientVisibleTasks, type Task } from '@/app/actions/inbox';
import { isUserAdmin } from '@/app/actions/shared';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { TasksView, type TasksMode } from './tasks-view';

export const metadata: Metadata = {
  title: 'Tasks | Qualia',
  description: 'Your tasks across every project',
};

interface PageProps {
  searchParams: Promise<{ scope?: string }>;
}

export default async function PortalTasksPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'client';
  const params = await searchParams;
  const requestedScope = params.scope;

  if (role === 'client') {
    const allowed = await assertAppEnabledForClient(user.id, 'tasks', role);
    if (!allowed) redirect('/');
  }

  const isAdmin = role !== 'client' && (await isUserAdmin(user.id));

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

  const workspaceId = await getCurrentWorkspaceId();

  let initialTasks: Task[] = [];
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
    initialTasks = await getTasks(workspaceId, { scope: 'all', limit: 500 });
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

  return (
    <TasksView
      mode={mode}
      initialTasks={initialTasks}
      assignableMembers={assignableMembers}
      userRole={normalizedRole}
    />
  );
}
