import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getClientVisibleTasks } from '@/app/actions/inbox';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { TasksContent } from './tasks-content';

export default async function PortalTasksPage() {
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

  // App Library guard: block clients if the "tasks" app is disabled
  if (role === 'client') {
    const workspaceId = await getCurrentWorkspaceId();
    const allowed = await assertAppEnabledForClient(user.id, workspaceId, 'tasks', role);
    if (!allowed) redirect('/');
  }

  // Get all project IDs the user has access to
  let projectIds: string[] = [];
  if (role === 'admin' || role === 'manager') {
    const { data } = await supabase.from('projects').select('id').not('status', 'eq', 'Canceled');
    projectIds = (data || []).map((p) => p.id);
  } else if (role === 'client') {
    const { data } = await supabase
      .from('client_projects')
      .select('project_id')
      .eq('client_id', user.id);
    projectIds = (data || []).map((p) => p.project_id);
  } else {
    // Employee: use project_assignments
    const { data } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('profile_id', user.id);
    projectIds = (data || []).map((p) => p.project_id);
  }

  const result = await getClientVisibleTasks(projectIds);
  const tasks = (result.success ? result.data : []) as Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    project_id: string | null;
    assignee: { id: string; full_name: string | null; avatar_url: string | null } | null;
    project: { id: string; name: string } | null;
  }>;

  // Build project list for filter from the tasks data
  const projectNames = new Map<string, string>();
  tasks.forEach((t) => {
    if (t.project) projectNames.set(t.project.id, t.project.name);
  });

  return (
    <div className="animate-fade-in-up space-y-6 px-[clamp(1.5rem,4vw,2.5rem)] pb-[clamp(1.5rem,3vw,2.5rem)] pt-16 md:pt-[clamp(1.5rem,3vw,2.5rem)]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track progress across your projects</p>
      </div>
      <TasksContent
        tasks={tasks}
        projects={Array.from(projectNames, ([id, name]) => ({ id, name }))}
        userRole={role}
      />
    </div>
  );
}
