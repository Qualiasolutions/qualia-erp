'use server';

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Get assigned employees for a project. Uses the admin client so callers
 * with restricted RLS contexts (clients) can resolve assignments reliably.
 */
export async function getProjectAssignedEmployees(projectId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data: assignments } = await supabase
    .from('project_assignments')
    .select('employee_id')
    .eq('project_id', projectId)
    .is('removed_at', null);
  return assignments?.map((a) => a.employee_id) ?? [];
}

/**
 * Create notifications for assigned employees when a client takes action.
 * Uses the admin client because the caller is typically a client whose RLS
 * context cannot INSERT into other users' notifications rows.
 */
export async function notifyAssignedEmployees(
  projectId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const employeeIds = await getProjectAssignedEmployees(projectId);

  if (employeeIds.length === 0) return;

  const { data: project } = await supabase
    .from('projects')
    .select('name, workspace_id')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const notifications = employeeIds.map((employeeId) => ({
    user_id: employeeId,
    workspace_id: project.workspace_id,
    type: 'client_activity',
    title: `Client activity on ${project.name}`,
    message: action,
    metadata: details,
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('[notifyAssignedEmployees] Failed:', error);
  }
}
