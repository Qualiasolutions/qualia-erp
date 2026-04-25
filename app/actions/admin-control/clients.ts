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

  type ClientProjectStats = {
    client_id: string;
    project_count: number;
    active_count: number;
    last_activity: string | null;
  };
  const { data: stats } = await supabase.rpc('get_per_client_project_stats');
  const statsByClient = new Map<string, ClientProjectStats>(
    (stats ?? []).map((s: ClientProjectStats) => [s.client_id, s])
  );

  const rows: ClientSummaryRow[] = clients.map((c) => {
    const s = statsByClient.get(c.id);
    return {
      id: c.id,
      name: c.display_name || c.name || '',
      username: null,
      email: null,
      lead_status: c.lead_status ?? 'active',
      project_count: s?.project_count ?? 0,
      active_project_count: s?.active_count ?? 0,
      last_activity: s?.last_activity ?? null,
    };
  });

  return { clients: rows };
}
