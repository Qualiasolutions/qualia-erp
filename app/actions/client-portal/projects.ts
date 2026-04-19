'use server';

import { createClient } from '@/lib/supabase/server';
import { type ActionResult, isUserManagerOrAbove } from '../shared';

// ============================================================================
// SECTION: Client Dashboard Data
// ============================================================================

/**
 * Get dashboard summary data for a client.
 *
 * H13 (OPTIMIZE.md): collapsed the previous 3-layer sequential chain
 * (client_projects -> projects -> financial_invoices) into a single JOIN.
 * The `client_projects` select now pulls each linked project's `client_id`
 * via a FK join so we have both portal project ids AND CRM client ids after
 * one round-trip. `projectCount` comes from the same array instead of a
 * duplicate head-only COUNT query.
 */
export async function getClientDashboardData(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

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

    const normalizedActivity = (recentActivity || []).map((a) => ({
      ...a,
      actor: Array.isArray(a.actor) ? a.actor[0] || null : a.actor,
      project: Array.isArray(a.project) ? a.project[0] || null : a.project,
    }));

    return {
      success: true,
      data: {
        projectCount,
        pendingRequests: pendingRequests || 0,
        unpaidInvoiceCount: (unpaidInvoices || []).length,
        unpaidTotal,
        recentActivity: normalizedActivity,
      },
    };
  } catch (error) {
    console.error('[getClientDashboardData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard data',
    };
  }
}

/**
 * Get client dashboard projects with phase progress.
 *
 * H13 (OPTIMIZE.md): collapsed the 3-query chain
 * (client_projects -> projects -> project_phases) into a single JOIN:
 * `client_projects -> projects -> project_phases`. One round-trip returns
 * each linked project and its ordered phase array in one shot.
 */
export async function getClientDashboardProjects(clientId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id !== clientId && !(await isUserManagerOrAbove(user.id))) {
      return { success: false, error: 'Not authorized' };
    }

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
      return { success: true, data: [] };
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
    type LinkRow = { project: ProjectRow | ProjectRow[] | null };

    // Normalize + sort + dedupe by project id.
    const byId = new Map<string, ProjectRow>();
    for (const row of rawRows as unknown as LinkRow[]) {
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

      const currentPhase = projectPhases.find(
        (p) => p.status !== 'completed' && p.status !== 'done'
      );
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
        currentPhase: currentPhase
          ? { name: currentPhase.name, status: currentPhase.status }
          : null,
        nextPhase: nextPhase ? { name: nextPhase.name } : null,
      };
    });

    return { success: true, data: projectsWithPhases };
  } catch (error) {
    console.error('[getClientDashboardProjects] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard projects',
    };
  }
}
