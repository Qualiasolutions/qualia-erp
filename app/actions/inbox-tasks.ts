'use server';

import { createClient } from '@/lib/supabase/server';
import { normalizeFKResponse } from '@/lib/server-utils';

export interface InboxTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  project: { id: string; name: string } | null;
}

/**
 * Fetch inbox tasks for a specific employee.
 * Returns tasks where show_in_inbox = true and status is not Done/Canceled.
 */
export async function getMyInboxTasks(
  userId: string
): Promise<{ success: boolean; data?: InboxTask[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, title, due_date, priority, status, project:projects!tasks_project_id_fkey(id, name)'
    )
    .eq('assignee_id', userId)
    .eq('show_in_inbox', true)
    .not('status', 'in', '("Done","Canceled")')
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(10);

  if (error) {
    console.error('[getMyInboxTasks] Error:', error.message);
    return { success: false, error: error.message };
  }

  const normalized: InboxTask[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    due_date: row.due_date as string | null,
    priority: row.priority as string,
    status: row.status as string,
    project: normalizeFKResponse(
      row.project as { id: string; name: string } | Array<{ id: string; name: string }> | null
    ),
  }));

  return { success: true, data: normalized };
}
