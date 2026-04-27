'use server';

import { createClient } from '@/lib/supabase/server';
import { getFrameworkReports, type FrameworkReportRow } from '@/app/actions/reports';
import { isUserAdmin } from '@/app/actions/shared';

/**
 * Renamed from AuditLogEntry — the activity_log table is not wired up, so we
 * surface real deploy events instead. Same row shape so the existing UI just
 * keeps rendering.
 */
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
    // Recent deploys (the previous "audit log" widget read from the
    // never-populated activity_log table — replaced with project_deployments
    // which actually has rows).
    supabase
      .from('project_deployments')
      .select(
        `
        id,
        status,
        created_at,
        environment,
        project:projects!project_deployments_project_id_fkey (id, name),
        actor:profiles!project_deployments_triggered_by_fkey (id, full_name)
      `
      )
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
    const r = row as unknown as {
      id: string;
      status: string | null;
      created_at: string;
      environment: string | null;
      project: { name: string | null } | null | Array<{ name: string | null }>;
      actor: { full_name: string | null } | null | Array<{ full_name: string | null }>;
    };
    const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
    const project = Array.isArray(r.project) ? r.project[0] : r.project;
    const status = (r.status ?? 'deployed').toLowerCase();
    return {
      id: r.id,
      action_type: status === 'success' || status === 'ready' ? 'deployed' : `deploy_${status}`,
      created_at: r.created_at,
      actor_name: actor?.full_name ?? null,
      target_name: project?.name
        ? r.environment
          ? `${project.name} → ${r.environment}`
          : project.name
        : null,
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
