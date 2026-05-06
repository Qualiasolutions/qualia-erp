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
