'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';

export async function isStaffOnProject(userId: string, projectId: string): Promise<boolean> {
  if (await isUserAdmin(userId)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('project_assignments')
    .select('id')
    .eq('employee_id', userId)
    .eq('project_id', projectId)
    .is('removed_at', null)
    .maybeSingle();

  return Boolean(data);
}

export async function getEmployeeProjectIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('employee_id', userId)
    .is('removed_at', null);
  return (data || []).map((row) => row.project_id);
}

/**
 * Returns the set of project IDs a client-role user is linked to via
 * `client_projects`. Used by request and activity queries to scope a
 * client to "every project I share with my teammates", not just the
 * rows where I'm the creator. Empty array if the user has no linked
 * projects.
 */
export async function getClientSharedProjectIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('client_projects')
    .select('project_id')
    .eq('client_id', userId);
  return (data || []).map((row) => row.project_id);
}
