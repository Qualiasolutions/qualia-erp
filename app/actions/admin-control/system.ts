'use server';

import { createClient } from '@/lib/supabase/server';
import { getFrameworkReports, type FrameworkReportRow } from '@/app/actions/reports';
import { isUserAdmin } from '@/app/actions/shared';

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

export type TokenAssignableProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type SystemPayload = {
  auditEntries: AuditLogEntry[];
  frameworkReports: FrameworkReportLite[];
  tokenAssignableProfiles: TokenAssignableProfile[];
};

export async function loadSystemTab(): Promise<SystemPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return {
      auditEntries: [],
      frameworkReports: [],
      tokenAssignableProfiles: [],
    };
  }

  const [auditRes, frameworkReports, profilesRes] = await Promise.all([
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
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .neq('role', 'client')
      .order('full_name', { ascending: true }),
  ]);

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

  const tokenAssignableProfiles: TokenAssignableProfile[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }));

  return {
    auditEntries,
    frameworkReports: reportsList,
    tokenAssignableProfiles,
  };
}
