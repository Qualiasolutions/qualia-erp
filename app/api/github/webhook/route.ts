import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const maxDuration = 60;

/**
 * POST /api/github/webhook
 *
 * GitHub webhook receiver for push events.
 * Matches the repo to an ERP project via project_integrations (service_type=github),
 * then syncs .planning phase state into project_phases + creates tasks from PLAN.md files.
 *
 * Setup:
 *   1. In each GitHub repo → Settings → Webhooks → Add webhook
 *   2. Payload URL: https://portal.qualiasolutions.net/api/github/webhook
 *   3. Content type: application/json
 *   4. Secret: (same as GITHUB_WEBHOOK_SECRET env var)
 *   5. Events: Just the push event
 *
 * Env vars needed:
 *   GITHUB_WEBHOOK_SECRET — shared secret for signature verification
 *   NEXT_PUBLIC_SUPABASE_URL
 *   Supabase server admin key
 */

// ─── Signature verification ─────────────────────────────────────────────────

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PushCommit {
  id: string;
  message: string;
  timestamp: string;
  author: { name: string; email: string; username?: string };
  added: string[];
  modified: string[];
  removed: string[];
}

interface PushPayload {
  ref: string;
  repository: {
    full_name: string;
    html_url: string;
    name: string;
  };
  commits: PushCommit[];
  head_commit: PushCommit | null;
  pusher: { name: string; email: string };
}

// ─── Phase detection from .planning file paths ──────────────────────────────

interface PhaseUpdate {
  phaseDirName: string; // e.g. "01-trainee-interactive-system"
  phaseName: string; // e.g. "trainee interactive system"
  phaseNumber: number; // e.g. 1
  hasNewPlan: boolean;
  hasNewSummary: boolean;
  hasVerification: boolean;
  planNumbers: number[];
  summaryNumbers: number[];
}

function parsePlanningFiles(allChangedFiles: string[]): PhaseUpdate[] {
  const phaseMap = new Map<string, PhaseUpdate>();

  // Match .planning/phases/<dir>/<file> patterns
  const phaseFileRegex = /^\.planning\/phases\/(\d+(?:\.\d+)?)-([^/]+)\/(.+)$/;

  for (const file of allChangedFiles) {
    const match = file.match(phaseFileRegex);
    if (!match) continue;

    const [, numStr, slug, fileName] = match;
    const phaseNumber = parseFloat(numStr);
    const dirName = `${numStr}-${slug}`;
    const phaseName = slug.replace(/-/g, ' ');

    if (!phaseMap.has(dirName)) {
      phaseMap.set(dirName, {
        phaseDirName: dirName,
        phaseName,
        phaseNumber,
        hasNewPlan: false,
        hasNewSummary: false,
        hasVerification: false,
        planNumbers: [],
        summaryNumbers: [],
      });
    }

    const phase = phaseMap.get(dirName)!;

    // Detect file types
    const planMatch = fileName.match(/^\d+-(\d+)-PLAN\.md$/);
    const summaryMatch = fileName.match(/^\d+-(\d+)-SUMMARY\.md$/);
    const verificationMatch = fileName.match(/^\d+-VERIFICATION\.md$/);

    if (planMatch) {
      phase.hasNewPlan = true;
      phase.planNumbers.push(parseInt(planMatch[1], 10));
    }
    if (summaryMatch) {
      phase.hasNewSummary = true;
      phase.summaryNumbers.push(parseInt(summaryMatch[1], 10));
    }
    if (verificationMatch) {
      phase.hasVerification = true;
    }
  }

  return Array.from(phaseMap.values()).sort((a, b) => a.phaseNumber - b.phaseNumber);
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify auth: GitHub HMAC signature OR X-API-Key header
    if (!secret) {
      console.error('[GitHub webhook] No webhook secret configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    {
      const signature = request.headers.get('x-hub-signature-256');
      const apiKey = request.headers.get('x-api-key');

      const signatureValid = signature ? verifySignature(rawBody, signature, secret) : false;
      const apiKeyValid = apiKey
        ? apiKey.length === secret.length &&
          timingSafeEqual(Buffer.from(apiKey), Buffer.from(secret))
        : false;

      if (!signatureValid && !apiKeyValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Only handle push events
    const event = request.headers.get('x-github-event');
    if (event === 'ping') {
      return NextResponse.json({ ok: true, message: 'Pong' });
    }
    if (event !== 'push') {
      return NextResponse.json({ ok: true, message: `Ignored event: ${event}` });
    }

    const payload: PushPayload = JSON.parse(rawBody);

    // Only process pushes to main/master
    const branch = payload.ref.replace('refs/heads/', '');
    if (!['main', 'master'].includes(branch)) {
      return NextResponse.json({
        ok: true,
        message: `Ignored push to ${branch} (only main/master syncs)`,
      });
    }

    // ── DB setup ──────────────────────────────────────────────────────────
    const supabase = createAdminClient();

    // ── Match repo to ERP project ────────────────────────────────────────
    // Match on the *exact* repo full_name (case-insensitive) rather than a
    // substring. An earlier bug matched with `ilike '%…%'` + `limit(1)`, which
    // would silently pick one row when two integrations differed only by the
    // casing of the org segment — splitting syncs across duplicate projects
    // in a non-deterministic way. If more than one row matches we bail and
    // surface the conflict instead of guessing.
    const { data: integrations, error: integrationError } = await supabase
      .from('project_integrations')
      .select('project_id, external_url')
      .eq('service_type', 'github')
      .or(
        `external_url.ilike.https://github.com/${payload.repository.full_name},` +
          `external_url.ilike.http://github.com/${payload.repository.full_name},` +
          `external_url.ilike.https://github.com/${payload.repository.full_name}/,` +
          `external_url.ilike.http://github.com/${payload.repository.full_name}/`
      );

    if (integrationError) {
      console.error('[GitHub webhook] Integration lookup error:', integrationError);
      return NextResponse.json({ error: 'Integration lookup failed' }, { status: 500 });
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        ok: true,
        message: `No ERP project linked to ${payload.repository.html_url}`,
      });
    }

    if (integrations.length > 1) {
      console.error(
        '[GitHub webhook] Multiple ERP projects linked to',
        payload.repository.html_url,
        '→',
        integrations.map((i) => i.project_id)
      );
      return NextResponse.json(
        {
          error: 'Multiple projects linked to this repository — resolve the duplicate in the ERP',
          project_ids: integrations.map((i) => i.project_id),
        },
        { status: 409 }
      );
    }

    const projectId = integrations[0].project_id;

    // Get the project's workspace_id for task creation
    const { data: project } = await supabase
      .from('projects')
      .select('id, workspace_id, name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // ── Collect all changed files from all commits ───────────────────────
    const allChangedFiles = new Set<string>();

    for (const commit of payload.commits) {
      for (const f of commit.added) allChangedFiles.add(f);
      for (const f of commit.modified) allChangedFiles.add(f);
    }

    // ── Check if ROADMAP.md or STATE.md changed → full sync ─────────
    // A PLAN.md push also triggers full sync so phase_items gets populated
    // from the framework task breakdown (idempotent).
    const planningMetaChanged = [...allChangedFiles].some(
      (f) =>
        f === '.planning/ROADMAP.md' ||
        f === '.planning/STATE.md' ||
        /^\.planning\/phases\/[^/]+\/.*PLAN\.md$/.test(f)
    );

    if (planningMetaChanged) {
      const { syncPlanningFromGitHubWithServiceRole } = await import('@/lib/planning-sync-core');
      const syncResult = await syncPlanningFromGitHubWithServiceRole(
        supabase,
        projectId,
        project.workspace_id
      );

      return NextResponse.json({
        ok: true,
        project: project.name,
        commits: payload.commits.length,
        sync_mode: 'full_roadmap',
        phases_synced: syncResult.success ? syncResult.phasesUpserted : 0,
      });
    }

    // ── Detect incremental .planning phase changes ────────────────────
    const phaseUpdates = parsePlanningFiles([...allChangedFiles]);

    // ── Resolve actor for client-visible activity_log ────────────────
    // Use project lead_id, fallback to first admin profile
    const { data: projectFull } = await supabase
      .from('projects')
      .select('lead_id')
      .eq('id', projectId)
      .single();

    let actorId = projectFull?.lead_id;
    if (!actorId) {
      const { data: admin } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      actorId = admin?.id;
    }

    if (phaseUpdates.length === 0) {
      // No planning file changes — just log the push as activity
      const commitCount = payload.commits.length;

      await supabase.from('activities').insert({
        project_id: projectId,
        workspace_id: project.workspace_id,
        type: 'project_updated',
        metadata: {
          source: 'github_push',
          branch,
          commit_count: commitCount,
          pusher: payload.pusher.name,
          head_sha: payload.head_commit?.id?.slice(0, 7),
          commit_messages: payload.commits.slice(0, 5).map((c) => c.message.split('\n')[0]),
        },
      });

      // Also log client-visible activity
      if (actorId) {
        const commitSummary = payload.commits
          .slice(0, 5)
          .map((c) => c.message.split('\n')[0])
          .join('; ');

        await supabase.from('activity_log').insert({
          project_id: projectId,
          action_type: 'code_push',
          actor_id: actorId,
          action_data: {
            title: `${commitCount} commit${commitCount === 1 ? '' : 's'} pushed to ${branch}`,
            description: commitSummary,
            branch,
            commit_count: commitCount,
            head_sha: payload.head_commit?.id?.slice(0, 7),
          },
          is_client_visible: true,
        });
      }

      return NextResponse.json({
        ok: true,
        project: project.name,
        commits: commitCount,
        phases_updated: 0,
      });
    }

    // ── Sync phases to ERP ───────────────────────────────────────────────
    const results: { phase: string; action: string }[] = [];

    // Get existing phases for this project
    const { data: existingPhases } = await supabase
      .from('project_phases')
      .select('id, name, sort_order, status')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    const existingPhaseMap = new Map((existingPhases || []).map((p) => [p.name.toLowerCase(), p]));

    // ── Collect updates and inserts in a single pass, then batch DB calls ──
    // Group existing-phase status changes by identical payload (typically 1-2
    // distinct statuses: 'completed' and 'in_progress') so we can issue one
    // .update().in('id', ids) per group instead of one query per phase.
    const updatesByPayload = new Map<string, { payload: Record<string, unknown>; ids: string[] }>();
    const newPhases: {
      project_id: string;
      workspace_id: string;
      name: string;
      sort_order: number;
      status: string;
      is_locked: boolean;
      completed_at: string | null;
    }[] = [];
    const newPhaseUpdateRefs: {
      key: string;
      update: PhaseUpdate;
      sortOrder: number;
      status: string;
    }[] = [];

    const maxSortOrder = existingPhases?.length
      ? Math.max(...existingPhases.map((p) => p.sort_order || 0))
      : 0;

    for (const update of phaseUpdates) {
      const existingKey = update.phaseName.toLowerCase();
      const existing = existingPhaseMap.get(existingKey);

      if (existing) {
        // Phase exists — determine new status based on what files changed
        let newStatus = existing.status;

        if (update.hasVerification) {
          newStatus = 'completed';
        } else if (update.hasNewSummary) {
          newStatus = 'in_progress';
        } else if (update.hasNewPlan) {
          newStatus = 'in_progress';
        }

        if (newStatus !== existing.status) {
          const updateData: Record<string, unknown> = { status: newStatus };
          if (newStatus === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }

          // Group by serialized payload so identical updates are batched
          const payloadKey = JSON.stringify(updateData);
          if (!updatesByPayload.has(payloadKey)) {
            updatesByPayload.set(payloadKey, { payload: updateData, ids: [] });
          }
          updatesByPayload.get(payloadKey)!.ids.push(existing.id);

          results.push({ phase: update.phaseName, action: `status → ${newStatus}` });
        } else {
          results.push({ phase: update.phaseName, action: 'no status change' });
        }
      } else {
        // Phase doesn't exist — collect for batch insert
        let status = 'not_started';
        if (update.hasVerification) status = 'completed';
        else if (update.hasNewSummary) status = 'in_progress';
        else if (update.hasNewPlan) status = 'in_progress';

        const sortOrder = maxSortOrder + update.phaseNumber;

        newPhases.push({
          project_id: projectId,
          workspace_id: project.workspace_id,
          name: update.phaseName,
          sort_order: sortOrder,
          status,
          is_locked: false,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        });
        newPhaseUpdateRefs.push({ key: existingKey, update, sortOrder, status });

        results.push({ phase: update.phaseName, action: `created (${status})` });
      }
    }

    // Batch update: one query per distinct status payload (typically 1-2)
    for (const { payload, ids } of updatesByPayload.values()) {
      await supabase.from('project_phases').update(payload).in('id', ids);
    }

    // Batch insert: single query for all new phases
    if (newPhases.length > 0) {
      const { data: insertedPhases } = await supabase
        .from('project_phases')
        .insert(newPhases)
        .select('id');

      // Populate existingPhaseMap with newly inserted phases for milestone lookup
      if (insertedPhases) {
        for (let i = 0; i < insertedPhases.length; i++) {
          const ref = newPhaseUpdateRefs[i];
          existingPhaseMap.set(ref.key, {
            id: insertedPhases[i].id,
            name: ref.update.phaseName,
            sort_order: ref.sortOrder,
            status: ref.status,
          });
        }
      }
    }

    // ── Milestone cascade: detect completion → auto-assign next ────────
    const cascadeResults: {
      milestone: number;
      tasksDone: number;
      tasksCreated: number;
      assignees: string[];
    }[] = [];

    // Collect milestone_numbers of phases that just became completed
    const newlyCompletedMilestones = new Set<number>();

    // Gather IDs of phases that just completed (have verification files)
    const completedPhaseIds: string[] = [];
    for (const update of phaseUpdates) {
      if (!update.hasVerification) continue;
      const phaseRecord = existingPhaseMap.get(update.phaseName.toLowerCase());
      if (phaseRecord) completedPhaseIds.push(phaseRecord.id);
    }

    // Single batched query to fetch milestone_numbers for all completed phases
    if (completedPhaseIds.length > 0) {
      const { data: phasesWithMilestones } = await supabase
        .from('project_phases')
        .select('milestone_number')
        .in('id', completedPhaseIds);

      if (phasesWithMilestones) {
        for (const p of phasesWithMilestones) {
          if (p.milestone_number != null) {
            newlyCompletedMilestones.add(p.milestone_number);
          }
        }
      }
    }

    // For each candidate milestone, check if ALL its phases are now completed.
    // Single batched query for all candidate milestones instead of one per milestone.
    if (newlyCompletedMilestones.size > 0) {
      const milestoneNums = [...newlyCompletedMilestones];

      const { data: allMilestonePhases } = await supabase
        .from('project_phases')
        .select('milestone_number, status')
        .eq('project_id', projectId)
        .in('milestone_number', milestoneNums)
        // Exclude the milestone rollup row — its status is derived from these
        // phases, so including it can mask a drift between rollup and children.
        .neq('phase_type', 'milestone');

      if (allMilestonePhases && allMilestonePhases.length > 0) {
        // Group by milestone_number and check completion per group
        const phasesByMilestone = new Map<number, { status: string }[]>();
        for (const p of allMilestonePhases) {
          if (p.milestone_number == null) continue;
          if (!phasesByMilestone.has(p.milestone_number)) {
            phasesByMilestone.set(p.milestone_number, []);
          }
          phasesByMilestone.get(p.milestone_number)!.push(p);
        }

        for (const [milestoneNum, phases] of phasesByMilestone) {
          const allCompleted = phases.every((p) => p.status === 'completed');
          if (!allCompleted) continue;

          // Milestone fully completed — tasks system removed, no cascade needed.
          cascadeResults.push({
            milestone: milestoneNum,
            tasksDone: 0,
            tasksCreated: 0,
            assignees: [],
          });
        }
      }
    }

    // ── Log activity (internal) ──────────────────────────────────────────
    const commitCount = payload.commits.length;

    await supabase.from('activities').insert({
      project_id: projectId,
      workspace_id: project.workspace_id,
      type: 'project_updated',
      metadata: {
        source: 'github_push',
        branch,
        commit_count: commitCount,
        pusher: payload.pusher.name,
        head_sha: payload.head_commit?.id?.slice(0, 7),
        commit_messages: payload.commits.slice(0, 5).map((c) => c.message.split('\n')[0]),
        phase_updates: results,
        ...(cascadeResults.length > 0 && { milestone_cascades: cascadeResults }),
      },
    });

    // ── Log activity (client-visible) ──────────────────────────────────
    if (actorId) {
      const completedPhases = results.filter((r) => r.action.includes('completed'));
      const inProgressPhases = results.filter(
        (r) => r.action.includes('in_progress') || r.action.includes('created')
      );

      let title = `${commitCount} commit${commitCount === 1 ? '' : 's'} pushed`;
      let description = '';

      if (completedPhases.length > 0) {
        title = `Phase${completedPhases.length > 1 ? 's' : ''} completed: ${completedPhases.map((p) => p.phase).join(', ')}`;
        description = `${completedPhases.length} phase${completedPhases.length > 1 ? 's' : ''} completed with ${commitCount} commits.`;
      } else if (inProgressPhases.length > 0) {
        title = `Development progress: ${inProgressPhases.map((p) => p.phase).join(', ')}`;
        description = `${commitCount} commits advancing ${inProgressPhases.length} phase${inProgressPhases.length > 1 ? 's' : ''}.`;
      }

      const commitSummary = payload.commits
        .slice(0, 5)
        .map((c) => c.message.split('\n')[0])
        .join('; ');
      if (commitSummary) {
        description += ` Latest: ${commitSummary}`;
      }

      await supabase.from('activity_log').insert({
        project_id: projectId,
        action_type: completedPhases.length > 0 ? 'phase_approved' : 'code_push',
        actor_id: actorId,
        action_data: {
          title,
          description: description.trim(),
          branch,
          commit_count: commitCount,
          head_sha: payload.head_commit?.id?.slice(0, 7),
          phase_updates: results,
        },
        is_client_visible: true,
      });
    }

    return NextResponse.json({
      ok: true,
      project: project.name,
      commits: commitCount,
      phases_updated: results.length,
      details: results,
      ...(cascadeResults.length > 0 && { milestone_cascades: cascadeResults }),
    });
  } catch (error) {
    console.error('[/api/github/webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
