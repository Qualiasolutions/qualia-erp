import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/app/actions/shared';
import { syncPlanningFromGitHubWithServiceRole } from '@/lib/planning-sync-core';
import { safeCompare } from '@/lib/auth-utils';

// Cap at 5 min since this can take a while for many repos.
export const maxDuration = 300;

/**
 * POST /api/admin/resync-planning
 *
 * Bulk re-trigger of planning sync for every project with a GitHub integration.
 * Auth: admin session cookie OR `Authorization: Bearer ${CRON_SECRET}`.
 * Runs sequentially to respect GitHub API rate limits.
 */
export async function POST(request: NextRequest) {
  // Cron-secret bypass (ops invocation — no user in context).
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized = !!cronSecret && safeCompare(authHeader, `Bearer ${cronSecret}`) === true;

  let actorId: string | null = null;

  if (!isCronAuthorized) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
    }

    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    actorId = user.id;
  }

  const admin = createAdminClient();

  const { data: projects, error: projErr } = await admin
    .from('projects')
    .select('id, name, workspace_id')
    .not('workspace_id', 'is', null);

  if (projErr) {
    return NextResponse.json({ ok: false, error: projErr.message }, { status: 500 });
  }

  const { data: ghIntegrations, error: intErr } = await admin
    .from('project_integrations')
    .select('project_id')
    .eq('service_type', 'github');

  if (intErr) {
    return NextResponse.json({ ok: false, error: intErr.message }, { status: 500 });
  }

  const githubLinkedIds = new Set((ghIntegrations ?? []).map((r) => r.project_id));
  const targets = (projects ?? []).filter((p) => githubLinkedIds.has(p.id));

  const results: Array<{
    project_id: string;
    name: string;
    success: boolean;
    phases_upserted?: number;
    error?: string;
  }> = [];

  for (const project of targets) {
    if (!project.workspace_id) continue;
    try {
      const result = await syncPlanningFromGitHubWithServiceRole(
        admin,
        project.id,
        project.workspace_id
      );
      if (!result.success) {
        console.warn(
          `[resync-planning] ${project.name} (${project.id}) failed: ${result.error ?? 'unknown'}`
        );
      }
      results.push({
        project_id: project.id,
        name: project.name,
        success: result.success,
        phases_upserted: result.phasesUpserted,
        error: result.success ? undefined : result.error,
      });
    } catch (err) {
      console.error(`[resync-planning] ${project.name} threw:`, err);
      results.push({
        project_id: project.id,
        name: project.name,
        success: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  console.log('[resync-planning] summary:', {
    actor: actorId ?? 'cron',
    total: targets.length,
    succeeded: results.filter((r) => r.success).length,
  });

  const summary = {
    total: targets.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total_phases_upserted: results.reduce((sum, r) => sum + (r.phases_upserted ?? 0), 0),
  };

  return NextResponse.json({ ok: true, summary, results });
}
