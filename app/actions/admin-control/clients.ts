'use server';

import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';

export type ClientSummaryRow = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  lead_status: string;
  project_count: number;
  active_project_count: number;
  last_activity: string | null;
};

export type ClientsPayload = {
  clients: ClientSummaryRow[];
};

export async function loadClientsTab(): Promise<ClientsPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) return { clients: [] };

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, display_name, lead_status, created_at')
    .order('name', { ascending: true });

  if (error || !clients) return { clients: [] };

  const { data: projects } = await supabase
    .from('projects')
    .select('id, client_id, status, updated_at');

  const projectsByClient = new Map<string, Array<{ status: string; updated_at: string | null }>>();
  for (const p of projects ?? []) {
    if (!p.client_id) continue;
    const list = projectsByClient.get(p.client_id) ?? [];
    list.push({ status: p.status, updated_at: p.updated_at });
    projectsByClient.set(p.client_id, list);
  }

  const rows: ClientSummaryRow[] = clients.map((c) => {
    const list = projectsByClient.get(c.id) ?? [];
    const active = list.filter((p) => p.status === 'Active' || p.status === 'Delayed').length;
    const lastActivity =
      list
        .map((p) => p.updated_at)
        .filter((t): t is string => !!t)
        .sort()
        .reverse()[0] ?? null;

    return {
      id: c.id,
      name: c.display_name || c.name || '',
      username: null,
      email: null,
      lead_status: c.lead_status ?? 'active',
      project_count: list.length,
      active_project_count: active,
      last_activity: lastActivity,
    };
  });

  return { clients: rows };
}
