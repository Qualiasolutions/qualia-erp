import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * POST /api/github/webhook
 *
 * GitHub webhook receiver for push events.
 * Matches the repo to an ERP project via project_integrations (service_type=github),
 * then syncs .planning phase state into project_phases + creates tasks from PLAN.md files.
 *
 * Setup:
 *   1. In each GitHub repo → Settings → Webhooks → Add webhook
 *   2. Payload URL: https://qualia-erp.vercel.app/api/github/webhook
 *   3. Content type: application/json
 *   4. Secret: (same as GITHUB_WEBHOOK_SECRET env var)
 *   5. Events: Just the push event
 *
 * Env vars needed:
 *   GITHUB_WEBHOOK_SECRET — shared secret for signature verification
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
  const phaseFileRegex = /^\.planning\/phases\/(\d+)-([^/]+)\/(.+)$/;

  for (const file of allChangedFiles) {
    const match = file.match(phaseFileRegex);
    if (!match) continue;

    const [, numStr, slug, fileName] = match;
    const phaseNumber = parseInt(numStr, 10);
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
    const secret = process.env.GITHUB_WEBHOOK_SECRET || process.env.GSD_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (secret) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!verifySignature(rawBody, signature, secret)) {
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Match repo to ERP project ────────────────────────────────────────
    // Look up project by matching GitHub URL in project_integrations
    const { data: integration } = await supabase
      .from('project_integrations')
      .select('project_id')
      .eq('service_type', 'github')
      .ilike('external_url', `%${payload.repository.full_name}%`)
      .limit(1)
      .single();

    if (!integration) {
      return NextResponse.json({
        ok: true,
        message: `No ERP project linked to ${payload.repository.html_url}`,
      });
    }

    const projectId = integration.project_id;

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

    // ── Detect .planning phase changes ───────────────────────────────────
    const phaseUpdates = parsePlanningFiles([...allChangedFiles]);

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

    for (const update of phaseUpdates) {
      const existingKey = update.phaseName.toLowerCase();
      const existing = existingPhaseMap.get(existingKey);

      if (existing) {
        // Phase exists — update status based on what files changed
        let newStatus = existing.status;

        if (update.hasVerification) {
          newStatus = 'completed';
        } else if (update.hasNewSummary) {
          // Summary = execution done for those plans
          newStatus = 'in_progress';
        } else if (update.hasNewPlan) {
          newStatus = 'in_progress';
        }

        if (newStatus !== existing.status) {
          const updateData: Record<string, unknown> = { status: newStatus };
          if (newStatus === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }

          await supabase.from('project_phases').update(updateData).eq('id', existing.id);

          results.push({ phase: update.phaseName, action: `status → ${newStatus}` });
        } else {
          results.push({ phase: update.phaseName, action: 'no status change' });
        }
      } else {
        // Phase doesn't exist — create it
        const maxSortOrder = existingPhases?.length
          ? Math.max(...existingPhases.map((p) => p.sort_order || 0))
          : 0;

        let status = 'not_started';
        if (update.hasVerification) status = 'completed';
        else if (update.hasNewSummary) status = 'in_progress';
        else if (update.hasNewPlan) status = 'in_progress';

        const { data: newPhase } = await supabase
          .from('project_phases')
          .insert({
            project_id: projectId,
            workspace_id: project.workspace_id,
            name: update.phaseName,
            sort_order: maxSortOrder + update.phaseNumber,
            status,
            is_locked: false,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
          })
          .select('id')
          .single();

        results.push({ phase: update.phaseName, action: `created (${status})` });

        // Also add to the map for subsequent iterations
        if (newPhase) {
          existingPhaseMap.set(existingKey, {
            id: newPhase.id,
            name: update.phaseName,
            sort_order: maxSortOrder + update.phaseNumber,
            status,
          });
        }
      }
    }

    // ── Log activity ─────────────────────────────────────────────────────
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
      },
    });

    return NextResponse.json({
      ok: true,
      project: project.name,
      commits: commitCount,
      phases_updated: results.length,
      details: results,
    });
  } catch (error) {
    console.error('[/api/github/webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
