'use server';

import { createClient } from '@/lib/supabase/server';
import { getFrameworkReports, type FrameworkReportRow } from '@/app/actions/reports';
import { isUserAdmin } from '@/app/actions/shared';

export type IntegrationHealth = {
  service: 'github' | 'vercel' | 'supabase' | 'other';
  label: string;
  connected_count: number;
  last_sync_at: string | null;
  status: 'ok' | 'warn' | 'down';
};

export type AuditLogEntry = {
  id: string;
  action_type: string;
  created_at: string;
  actor_name: string | null;
  target_name: string | null;
};

export type FrameworkReportLite = {
  id: string;
  client_report_id: string | null;
  project_name: string | null;
  recorded_at: string;
  total_phases: number | null;
};

export type SystemPayload = {
  integrations: IntegrationHealth[];
  auditEntries: AuditLogEntry[];
  frameworkReports: FrameworkReportLite[];
};

function resolveHealth(lastSyncAt: string | null): IntegrationHealth['status'] {
  if (!lastSyncAt) return 'warn';
  const hours = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);
  if (hours > 24) return 'warn';
  return 'ok';
}

export async function loadSystemTab(): Promise<SystemPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return { integrations: [], auditEntries: [], frameworkReports: [] };
  }

  const [integrationsRes, auditRes, frameworkReports] = await Promise.all([
    supabase.from('project_integrations').select('service_type, last_sync_at, last_event_at'),
    supabase
      .from('activity_log')
      .select(
        `
        id,
        action_type,
        created_at,
        target_name,
        actor:profiles!activity_log_actor_id_fkey (id, full_name)
      `
      )
      .in('action_type', [
        'member_invite',
        'member_remove',
        'role_change',
        'integration_connect',
        'integration_disconnect',
        'settings_change',
      ])
      .order('created_at', { ascending: false })
      .limit(20),
    getFrameworkReports({ limit: 15 }, { includeDryRun: false }),
  ]);

  const grouped: Record<IntegrationHealth['service'], { count: number; last: string | null }> = {
    github: { count: 0, last: null },
    vercel: { count: 0, last: null },
    supabase: { count: 0, last: null },
    other: { count: 0, last: null },
  };

  for (const row of integrationsRes.data ?? []) {
    const svc = (row.service_type as string) || 'other';
    const key: IntegrationHealth['service'] =
      svc === 'github' || svc === 'vercel' || svc === 'supabase' ? svc : 'other';
    grouped[key].count += 1;
    const last = row.last_sync_at ?? row.last_event_at ?? null;
    if (last && (!grouped[key].last || last > grouped[key].last)) {
      grouped[key].last = last;
    }
  }

  const integrations: IntegrationHealth[] = (['github', 'vercel', 'supabase'] as const).map(
    (service) => ({
      service,
      label: service.charAt(0).toUpperCase() + service.slice(1),
      connected_count: grouped[service].count,
      last_sync_at: grouped[service].last,
      status: grouped[service].count === 0 ? 'down' : resolveHealth(grouped[service].last),
    })
  );

  const auditEntries: AuditLogEntry[] = (auditRes.data ?? []).map((row) => {
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
    return {
      id: row.id,
      action_type: row.action_type,
      created_at: row.created_at,
      actor_name: actor?.full_name ?? null,
      target_name: (row.target_name as string | null) ?? null,
    };
  });

  const reportsList: FrameworkReportLite[] = (frameworkReports as FrameworkReportRow[])
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      client_report_id: r.client_report_id,
      project_name: r.project_name,
      recorded_at: r.submitted_at ?? new Date().toISOString(),
      total_phases: r.total_phases,
    }));

  return {
    integrations,
    auditEntries,
    frameworkReports: reportsList,
  };
}
