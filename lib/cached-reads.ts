/**
 * Cached read functions using Next.js 16 Cache Components ('use cache' directive).
 *
 * These functions use `createAdminClient()` (service-role, no cookies) because
 * `'use cache'` functions cannot call `cookies()` or `headers()`.
 *
 * Auth checks must happen in the CALLING page/action, never inside these functions.
 * Data returned here is not scoped to a user — callers must verify access.
 */

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Cached version of getProjectById from app/actions/projects.ts.
 * Fetches project with lead, team, client joins and issues + issue_stats.
 *
 * Tag: `project-{id}` — invalidated via `updateTag('project-{id}')` in mutations.
 * Life: 'minutes' (stale 5min, revalidate 1min, expire 1hr).
 */
export async function getCachedProjectById(id: string) {
  'use cache';
  cacheTag(`project-${id}`);
  cacheLife('minutes');

  const supabase = createAdminClient();

  // Parallelize project + issues queries — they're independent
  const [projectResult, issuesResult] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `
        *,
        lead:profiles!projects_lead_id_fkey (id, full_name, email, avatar_url),
        team:teams (id, name, key),
        client:clients (id, name)
        `
      )
      .eq('id', id)
      .single(),
    supabase
      .from('issues')
      .select(
        `
        id,
        title,
        status,
        priority,
        created_at
        `
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const { data: project, error } = projectResult;
  const { data: issues } = issuesResult;

  if (error) {
    console.error('[getCachedProjectById] Error fetching project:', error);
    return null;
  }

  // Compute stats from already-fetched issues
  const totalIssues = issues?.length || 0;
  const doneIssues = issues?.filter((i) => i.status === 'Done')?.length || 0;

  return {
    ...project,
    lead: Array.isArray(project.lead) ? project.lead[0] || null : project.lead,
    team: Array.isArray(project.team) ? project.team[0] || null : project.team,
    client: Array.isArray(project.client) ? project.client[0] || null : project.client,
    issues: issues || [],
    issue_stats: {
      total: totalIssues || 0,
      done: doneIssues || 0,
    },
  };
}

/**
 * Cached version of getProjectIntegrationStatus from lib/integration-utils.ts.
 * Returns portal access and ERP client linkage status for a project.
 *
 * Tag: `project-integrations-{id}` — invalidated when project integration data changes.
 * Life: 'minutes'.
 */
export async function getCachedProjectIntegrationStatus(projectId: string) {
  'use cache';
  cacheTag(`project-integrations-${projectId}`);
  cacheLife('minutes');

  const supabase = createAdminClient();

  const [portalCountResult, projectResult] = await Promise.all([
    supabase
      .from('client_projects')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId),
    supabase
      .from('projects')
      .select('client_id, client:clients(id, name, display_name)')
      .eq('id', projectId)
      .single(),
  ]);

  const { count: portalCount } = portalCountResult;
  const { data: project } = projectResult;

  const erpClient =
    project?.client && !Array.isArray(project.client)
      ? project.client
      : Array.isArray(project?.client) && project.client.length > 0
        ? project.client[0]
        : null;

  return {
    hasPortalAccess: (portalCount ?? 0) > 0,
    hasERPClient: !!erpClient,
    portalClientCount: portalCount ?? 0,
    erpClientName: erpClient?.name ?? null,
    erpClientCompany: erpClient?.display_name ?? null,
  };
}

/**
 * Cached version of getClientDashboardData from app/actions/client-portal/projects.ts.
 * Returns dashboard summary: project count, pending requests, unpaid invoices, recent activity.
 *
 * No auth check here — caller must verify the user is the client or an admin.
 *
 * Tag: `client-dashboard-{clientId}` — invalidated when client data changes.
 * Life: 'minutes'.
 */
export async function getCachedClientDashboardData(clientId: string) {
  'use cache';
  cacheTag(`client-dashboard-${clientId}`);
  cacheLife('minutes');

  const supabase = createAdminClient();

  // Single JOIN: client_projects -> projects gives us projectIds + crmClientIds.
  const { data: clientProjectLinks } = await supabase
    .from('client_projects')
    .select('project_id, project:projects!inner(client_id)')
    .eq('client_id', clientId);

  type LinkRow = {
    project_id: string;
    project: { client_id: string | null } | { client_id: string | null }[] | null;
  };
  const links = (clientProjectLinks || []) as unknown as LinkRow[];

  const clientProjectIds = links.map((l) => l.project_id);
  const projectCount = clientProjectIds.length;
  const crmClientIds = Array.from(
    new Set(
      links
        .map((l) => (Array.isArray(l.project) ? l.project[0] : l.project))
        .map((p) => p?.client_id)
        .filter((cid): cid is string => !!cid)
    )
  );

  // Run all remaining dashboard queries in parallel.
  const [{ count: pendingRequests }, { data: unpaidInvoices }, { data: recentActivity }] =
    await Promise.all([
      supabase
        .from('client_feature_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .in('status', ['pending', 'in_review']),
      crmClientIds.length > 0
        ? supabase
            .from('financial_invoices')
            .select('balance')
            .in('client_id', crmClientIds)
            .eq('is_hidden', false)
            .in('status', ['pending', 'overdue'])
        : Promise.resolve({ data: [] as Array<{ balance: number | string }> }),
      clientProjectIds.length > 0
        ? supabase
            .from('activity_log')
            .select(
              `id, action_type, action_data, created_at,
               actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url),
               project:projects!activity_log_project_id_fkey(id, name)`
            )
            .eq('is_client_visible', true)
            .in('project_id', clientProjectIds)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] }),
    ]);

  const unpaidTotal = (unpaidInvoices || []).reduce((sum, inv) => sum + Number(inv.balance), 0);

  const normalizedActivity = (recentActivity || []).map((a: Record<string, unknown>) => ({
    ...a,
    actor: Array.isArray(a.actor) ? (a.actor as unknown[])[0] || null : a.actor,
    project: Array.isArray(a.project) ? (a.project as unknown[])[0] || null : a.project,
  }));

  return {
    projectCount,
    pendingRequests: pendingRequests || 0,
    unpaidInvoiceCount: (unpaidInvoices || []).length,
    unpaidTotal,
    recentActivity: normalizedActivity,
  };
}

/**
 * Cached version of getClientDashboardProjects from app/actions/client-portal/projects.ts.
 * Returns projects with phase progress for the client dashboard.
 *
 * No auth check here — caller must verify the user is the client or an admin.
 *
 * Tag: `client-dashboard-{clientId}` — same tag as dashboard data.
 * Life: 'minutes'.
 */
export async function getCachedClientDashboardProjects(clientId: string) {
  'use cache';
  cacheTag(`client-dashboard-${clientId}`);
  cacheLife('minutes');

  const supabase = createAdminClient();

  // Single JOIN: client_projects -> projects -> project_phases.
  const { data: rawRows } = await supabase
    .from('client_projects')
    .select(
      `
      project:projects!inner(
        id,
        name,
        status,
        project_type,
        description,
        phases:project_phases(id, name, status, sort_order, phase_type)
      )
    `
    )
    .eq('client_id', clientId);

  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  type PhaseRow = {
    id: string;
    name: string;
    status: string | null;
    sort_order: number | null;
    phase_type: string | null;
  };
  type ProjectRow = {
    id: string;
    name: string;
    status: string | null;
    project_type: string | null;
    description: string | null;
    phases: PhaseRow[] | null;
  };
  type RawLinkRow = { project: ProjectRow | ProjectRow[] | null };

  // Normalize + sort + dedupe by project id.
  const byId = new Map<string, ProjectRow>();
  for (const row of rawRows as unknown as RawLinkRow[]) {
    const proj = Array.isArray(row.project) ? row.project[0] : row.project;
    if (!proj || byId.has(proj.id)) continue;
    byId.set(proj.id, proj);
  }
  const projects = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

  const projectsWithPhases = projects.map((project) => {
    // Exclude milestone rollup rows — they're derived headers, not real phases.
    const projectPhases = [...(project.phases || [])]
      .filter((p) => p.phase_type !== 'milestone')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const completedCount = projectPhases.filter(
      (p) => p.status === 'completed' || p.status === 'done'
    ).length;
    const progress =
      projectPhases.length > 0 ? Math.round((completedCount / projectPhases.length) * 100) : 0;

    const currentPhase = projectPhases.find((p) => p.status !== 'completed' && p.status !== 'done');
    const currentPhaseIndex = currentPhase ? projectPhases.indexOf(currentPhase) : -1;
    const nextPhase =
      currentPhaseIndex >= 0 && currentPhaseIndex < projectPhases.length - 1
        ? projectPhases[currentPhaseIndex + 1]
        : null;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      project_type: project.project_type,
      description: project.description,
      progress,
      totalPhases: projectPhases.length,
      completedPhases: completedCount,
      currentPhase: currentPhase ? { name: currentPhase.name, status: currentPhase.status } : null,
      nextPhase: nextPhase ? { name: nextPhase.name } : null,
    };
  });

  return projectsWithPhases;
}
