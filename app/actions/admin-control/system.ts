'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
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

export type FrameworkReportCompleteness = {
  checkedReports: number;
  completeReports: number;
  score: number;
  missingClientId: number;
  missingFrameworkVersion: number;
  missingClientReportId: number;
  missingFrameworkProjectId: number;
  missingTeamId: number;
  nonPerUserTokenAuth: number;
};

export type SystemPayload = {
  auditEntries: AuditLogEntry[];
  frameworkReports: FrameworkReportLite[];
  frameworkCompleteness: FrameworkReportCompleteness;
  tokenAssignableProfiles: TokenAssignableProfile[];
};

const EMPTY_FRAMEWORK_COMPLETENESS: FrameworkReportCompleteness = {
  checkedReports: 0,
  completeReports: 0,
  score: 100,
  missingClientId: 0,
  missingFrameworkVersion: 0,
  missingClientReportId: 0,
  missingFrameworkProjectId: 0,
  missingTeamId: 0,
  nonPerUserTokenAuth: 0,
};

export async function loadSystemTab(): Promise<SystemPayload> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isUserAdmin(user.id))) {
    return {
      auditEntries: [],
      frameworkReports: [],
      frameworkCompleteness: EMPTY_FRAMEWORK_COMPLETENESS,
      tokenAssignableProfiles: [],
    };
  }

  const [auditRes, frameworkReports, profilesRes, completenessRes] = await Promise.all([
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
    admin
      .from('session_reports')
      .select(
        'id, client_report_id, client_id, framework_version, framework_project_id, team_id, auth_method, submitted_at'
      )
      .neq('dry_run', true)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(100),
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

  const completenessRows = (completenessRes.data ?? []) as Array<{
    client_report_id: string | null;
    client_id: string | null;
    framework_version: string | null;
    framework_project_id: string | null;
    team_id: string | null;
    auth_method: string | null;
  }>;

  const frameworkCompleteness = completenessRows.reduce<FrameworkReportCompleteness>(
    (acc, row) => {
      const hasClientReportId = Boolean(row.client_report_id);
      const hasClientId = Boolean(row.client_id);
      const hasFrameworkVersion = Boolean(row.framework_version);
      const hasFrameworkProjectId = Boolean(row.framework_project_id);
      const hasTeamId = Boolean(row.team_id);
      const usesPerUserToken = row.auth_method === 'per_user_token';

      acc.checkedReports += 1;
      if (!hasClientReportId) acc.missingClientReportId += 1;
      if (!hasClientId) acc.missingClientId += 1;
      if (!hasFrameworkVersion) acc.missingFrameworkVersion += 1;
      if (!hasFrameworkProjectId) acc.missingFrameworkProjectId += 1;
      if (!hasTeamId) acc.missingTeamId += 1;
      if (!usesPerUserToken) acc.nonPerUserTokenAuth += 1;

      if (
        hasClientReportId &&
        hasClientId &&
        hasFrameworkVersion &&
        hasFrameworkProjectId &&
        hasTeamId &&
        usesPerUserToken
      ) {
        acc.completeReports += 1;
      }

      return acc;
    },
    { ...EMPTY_FRAMEWORK_COMPLETENESS, score: 0 }
  );

  frameworkCompleteness.score =
    frameworkCompleteness.checkedReports === 0
      ? 100
      : Math.round(
          (frameworkCompleteness.completeReports / frameworkCompleteness.checkedReports) * 100
        );

  return {
    auditEntries,
    frameworkReports: reportsList,
    frameworkCompleteness,
    tokenAssignableProfiles,
  };
}
