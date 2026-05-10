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
 *
 * Title carries the headline ("Giulio submitted a feature request") so the
 * dashboard pulse reads as a sentence; the project name moves into message
 * so the row shows actor + verb + project without truncating either side.
 * details.link is hoisted onto the notification's link column so clicking
 * the row navigates to the relevant surface.
 */
export async function notifyAssignedEmployees(
  projectId: string,
  action: string,
  details: Record<string, unknown> & { link?: string }
): Promise<void> {
  await fanOutClientActivity({
    projectId,
    action,
    details,
    includeAdmins: false,
  });
}

/**
 * Same fan-out as notifyAssignedEmployees but ALSO notifies workspace admins
 * so the owner sees client activity on every project, not just ones they're
 * personally assigned to.
 */
export async function notifyAdminsAndAssignedEmployees(
  projectId: string,
  action: string,
  details: Record<string, unknown> & { link?: string }
): Promise<void> {
  await fanOutClientActivity({
    projectId,
    action,
    details,
    includeAdmins: true,
  });
}

async function fanOutClientActivity({
  projectId,
  action,
  details,
  includeAdmins,
}: {
  projectId: string;
  action: string;
  details: Record<string, unknown> & { link?: string };
  includeAdmins: boolean;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from('projects')
    .select('name, workspace_id')
    .eq('id', projectId)
    .single();

  if (!project) return;

  const recipients = new Set<string>(await getProjectAssignedEmployees(projectId));

  if (includeAdmins) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('workspace_id', project.workspace_id);
    for (const a of admins || []) recipients.add(a.id);
  }

  if (recipients.size === 0) return;

  const link = typeof details.link === 'string' ? details.link : null;

  const notifications = Array.from(recipients).map((userId) => ({
    user_id: userId,
    workspace_id: project.workspace_id,
    type: 'client_activity',
    title: action,
    message: project.name,
    link,
    metadata: details,
    read: false,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('[fanOutClientActivity] Failed:', error);
  }
}
