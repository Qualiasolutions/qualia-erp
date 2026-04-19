/**
 * Core sync logic shared between the manual sync action and the GitHub webhook.
 * Accepts a Supabase client (either user-auth or service-role).
 */

import {
  parsePhasePlanTasks,
  parseRoadmap,
  parseStateRoadmap,
  parseStateTable,
} from '@/lib/planning-parser';
import { decryptToken } from '@/lib/token-encryption';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SyncResult {
  success: boolean;
  // Total rows written to project_phases (milestones + phases). Kept for
  // backward compat with all downstream callers that surface a single number.
  phasesUpserted: number;
  // Breakdown of the above so UI toasts can show the real Milestone → Phase
  // hierarchy ("Synced 11 milestones with 42 phases") instead of the
  // misleading "Synced 53 phases".
  milestonesUpserted: number;
  phasesOnly: number;
  error?: string;
}

function parseRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

interface FetchResult {
  content: string | null;
  status: number;
  error?: string;
}

async function fetchGitHubFile(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<FetchResult> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      return { content: null, status: res.status };
    }
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return { content: Buffer.from(data.content, 'base64').toString('utf-8'), status: 200 };
    }
    return { content: null, status: 200, error: 'Unexpected response format' };
  } catch (err) {
    return { content: null, status: 0, error: String(err) };
  }
}

async function listGitHubDir(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: { name: string }) => item.name);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Sync .planning/ROADMAP.md + STATE.md from GitHub into project_phases.
 * Works with any Supabase client (user-auth from server action or service-role from webhook).
 */
export async function syncPlanningFromGitHubWithServiceRole(
  supabase: SupabaseClient,
  projectId: string,
  workspaceId: string
): Promise<SyncResult> {
  // 1. Get GitHub integration for this project
  const { data: integration } = await supabase
    .from('project_integrations')
    .select('external_url')
    .eq('project_id', projectId)
    .eq('service_type', 'github')
    .single();

  if (!integration?.external_url) {
    return {
      success: false,
      phasesUpserted: 0,
      milestonesUpserted: 0,
      phasesOnly: 0,
      error: 'No GitHub repo linked',
    };
  }

  // 2. Get GitHub token from workspace
  const { data: settings } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github')
    .single();

  if (!settings?.encrypted_token) {
    return {
      success: false,
      phasesUpserted: 0,
      milestonesUpserted: 0,
      phasesOnly: 0,
      error: 'No GitHub token configured',
    };
  }

  const token = decryptToken(settings.encrypted_token);
  const repoParsed = parseRepoFromUrl(integration.external_url);
  if (!repoParsed) {
    return {
      success: false,
      phasesUpserted: 0,
      milestonesUpserted: 0,
      phasesOnly: 0,
      error: 'Cannot parse repo URL',
    };
  }

  // 3. Try to fetch ROADMAP.md (try multiple org names)
  let roadmapResult = await fetchGitHubFile(
    token,
    repoParsed.owner,
    repoParsed.repo,
    '.planning/ROADMAP.md'
  );
  let lastStatus = roadmapResult.status;

  if (!roadmapResult.content) {
    // Try alternate org names
    for (const altOwner of ['SakaniQualia', 'Qualiasolutions']) {
      if (altOwner === repoParsed.owner) continue;
      roadmapResult = await fetchGitHubFile(
        token,
        altOwner,
        repoParsed.repo,
        '.planning/ROADMAP.md'
      );
      if (roadmapResult.status !== 0) lastStatus = roadmapResult.status;
      if (roadmapResult.content) {
        repoParsed.owner = altOwner;
        break;
      }
    }
  }

  // 4. Fetch STATE.md (used for both supplemental dates AND fallback parsing).
  const stateResult = await fetchGitHubFile(
    token,
    repoParsed.owner,
    repoParsed.repo,
    '.planning/STATE.md'
  );

  // 5. Choose parsing strategy:
  //    - If ROADMAP.md exists: parse it (the canonical Qualia format).
  //    - Else if STATE.md has a flat roadmap table: use the fallback parser
  //      (handles ad-hoc structures like Moayad's JEC project).
  //    - Else: bail with a clear error.
  let milestones: ReturnType<typeof parseRoadmap>;
  let stateMap: ReturnType<typeof parseStateTable> = new Map();

  if (roadmapResult.content) {
    milestones = parseRoadmap(roadmapResult.content);
    stateMap = stateResult.content ? parseStateTable(stateResult.content) : new Map();
  } else if (stateResult.content) {
    // ROADMAP.md missing — try parseStateRoadmap as a fallback so projects
    // that ship only STATE.md still sync. parseStateTable (the dotted-phase
    // map) doesn't apply here since fallback projects use flat numbering.
    milestones = parseStateRoadmap(stateResult.content);
    if (milestones.length === 0) {
      return {
        success: false,
        phasesUpserted: 0,
        milestonesUpserted: 0,
        phasesOnly: 0,
        error:
          'No .planning/ROADMAP.md found, and .planning/STATE.md does not contain a parseable roadmap table.',
      };
    }
  } else {
    const detail =
      lastStatus === 404
        ? 'No .planning/ROADMAP.md or .planning/STATE.md found'
        : lastStatus === 401 || lastStatus === 403
          ? 'GitHub token lacks access to this repo'
          : `GitHub fetch failed (HTTP ${lastStatus})`;
    return {
      success: false,
      phasesUpserted: 0,
      milestonesUpserted: 0,
      phasesOnly: 0,
      error: detail,
    };
  }

  // 6. For archived milestones with no inline phases, scan phase directories
  for (const ms of milestones) {
    if (ms.phases.length === 0 && ms.number > 0) {
      const prefix = ms.number.toString().padStart(2, '0');
      const dirs = await listGitHubDir(
        token,
        repoParsed.owner,
        repoParsed.repo,
        '.planning/phases'
      );
      const relevantDirs = dirs.filter((d) => d.startsWith(prefix));

      for (const dir of relevantDirs) {
        const phaseNumMatch = dir.match(/^(\d+)\.(\d+)/);
        if (!phaseNumMatch) continue;
        const phaseKey = `${parseInt(phaseNumMatch[1])}.${parseInt(phaseNumMatch[2])}`;
        const stateInfo = stateMap.get(phaseKey);

        const files = await listGitHubDir(
          token,
          repoParsed.owner,
          repoParsed.repo,
          `.planning/phases/${dir}`
        );
        const planFiles = files.filter((f) => f.match(/PLAN\.md$/));
        const summaryFiles = files.filter((f) => f.match(/SUMMARY\.md$/));

        ms.phases.push({
          milestoneNumber: ms.number,
          phaseNumber: phaseKey,
          name: `Phase ${phaseKey}`,
          description: null,
          status: stateInfo?.status || (ms.status === 'complete' ? 'completed' : 'not_started'),
          planCount: planFiles.length,
          plansCompleted: Math.min(summaryFiles.length, planFiles.length),
          startedAt: stateInfo?.started || null,
          completedAt: stateInfo?.completed || null,
        });
      }
      ms.phases.sort((a, b) => parseFloat(a.phaseNumber) - parseFloat(b.phaseNumber));
    }
  }

  // 7. Supplement with STATE.md dates and scan plan counts for parsed phases
  const phaseDirs = await listGitHubDir(
    token,
    repoParsed.owner,
    repoParsed.repo,
    '.planning/phases'
  );

  for (const ms of milestones) {
    for (const phase of ms.phases) {
      // Scan directory for plan counts if not already set
      if (phase.planCount === 0) {
        const padded = phase.phaseNumber
          .split('.')
          .map((n) => n.padStart(2, '0'))
          .join('.');
        const matchingDir = phaseDirs.find((d) => d.startsWith(padded));
        if (matchingDir) {
          const files = await listGitHubDir(
            token,
            repoParsed.owner,
            repoParsed.repo,
            `.planning/phases/${matchingDir}`
          );
          const planFiles = files.filter((f) => f.match(/PLAN\.md$/));
          const summaryFiles = files.filter((f) => f.match(/SUMMARY\.md$/));
          phase.planCount = planFiles.length;
          phase.plansCompleted = Math.min(summaryFiles.length, planFiles.length);
        }
      }

      // Supplement with STATE.md
      const stateInfo = stateMap.get(phase.phaseNumber);
      if (stateInfo) {
        if (stateInfo.status && !phase.status.includes('complete')) {
          phase.status = stateInfo.status;
        }
        if (stateInfo.started && !phase.startedAt) phase.startedAt = stateInfo.started;
        if (stateInfo.completed && !phase.completedAt) phase.completedAt = stateInfo.completed;
      }
    }
  }

  // 8. Upsert milestones and phases
  let milestonesUpserted = 0;
  let phasesOnly = 0;
  let sortOrder = 0;
  const phaseItemQueue: PhaseItemWork[] = [];

  for (const ms of milestones) {
    sortOrder++;

    // 8a. Upsert milestone record (phase_type = 'milestone')
    const msName = ms.number === 0 ? `Phase 0: ${ms.name}` : `Milestone ${ms.number}: ${ms.name}`;
    const msStatus = getMilestoneStatusFromPhases(ms.phases, ms.status);

    const { data: existingMs } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_type', 'milestone')
      .eq('milestone_number', ms.number);

    const msData = {
      project_id: projectId,
      workspace_id: workspaceId,
      name: msName,
      description: null,
      status: msStatus,
      sort_order: sortOrder,
      milestone_number: ms.number,
      phase_type: 'milestone',
      plan_count: 0,
      plans_completed: 0,
      is_locked: false,
      github_synced_at: new Date().toISOString(),
    };

    if (existingMs?.[0]) {
      await supabase.from('project_phases').update(msData).eq('id', existingMs[0].id);
    } else {
      await supabase.from('project_phases').insert(msData);
    }
    milestonesUpserted++;

    // 8b. Upsert phase records within this milestone
    for (const phase of ms.phases) {
      sortOrder++;

      // Match existing by phase number prefix
      const { data: existingList } = await supabase
        .from('project_phases')
        .select('id, status, started_at, completed_at')
        .eq('project_id', projectId)
        .eq('phase_type', 'phase')
        .ilike('name', `${phase.phaseNumber} %`);

      const existing = existingList?.[0] || null;

      // Never downgrade a completed phase — DB is source of truth for status
      const shouldPreserveStatus = existing?.status === 'completed' && phase.status !== 'completed';
      const finalStatus = shouldPreserveStatus ? existing.status : phase.status;
      const safeDate = (v: string | null): string | null => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };
      const finalStartedAt = shouldPreserveStatus ? existing.started_at : safeDate(phase.startedAt);
      const finalCompletedAt = shouldPreserveStatus
        ? existing.completed_at
        : safeDate(phase.completedAt);

      const phaseData = {
        project_id: projectId,
        workspace_id: workspaceId,
        name: `${phase.phaseNumber} — ${phase.name}`,
        description: phase.description,
        status: finalStatus,
        sort_order: sortOrder,
        milestone_number: phase.milestoneNumber,
        phase_type: 'phase',
        plan_count: phase.planCount,
        plans_completed: phase.plansCompleted,
        is_locked: finalStatus === 'not_started',
        completed_at: finalCompletedAt,
        started_at: finalStartedAt,
        github_synced_at: new Date().toISOString(),
      };

      let phaseRowId: string | null = null;
      if (existing) {
        await supabase.from('project_phases').update(phaseData).eq('id', existing.id);
        phaseRowId = existing.id;
      } else {
        const { data: inserted } = await supabase
          .from('project_phases')
          .insert(phaseData)
          .select('id')
          .single();
        phaseRowId = inserted?.id ?? null;
      }
      phasesOnly++;

      // Queue phase_items work for the parallel second pass below.
      if (phaseRowId) {
        phaseItemQueue.push({
          phaseRowId,
          phaseNumber: phase.phaseNumber,
          phaseCompleted: finalStatus === 'completed',
        });
      }
    }
  }

  // 9. Second pass: populate phase_items in parallel.
  //
  // Doing this inline per-phase was too slow for large projects like Sakani
  // (53 phases × ~3 PLAN.md fetches each, strictly sequential) — the server
  // function timed out before all phases processed. Running the GitHub
  // fetches in parallel with a concurrency cap turns ~50s into ~5s.
  await runPhaseItemsSync(
    supabase,
    token,
    repoParsed.owner,
    repoParsed.repo,
    phaseDirs,
    phaseItemQueue
  );

  return {
    success: true,
    phasesUpserted: milestonesUpserted + phasesOnly,
    milestonesUpserted,
    phasesOnly,
  };
}

interface PhaseItemWork {
  phaseRowId: string;
  phaseNumber: string;
  phaseCompleted: boolean;
}

/**
 * Parallelized phase_items population for all phases in one project.
 *
 * Matches each phase to its source directory by parsed-float numeric
 * comparison (tolerates "00.1" vs "00.01" padding variance). For each matched
 * phase it lists the dir, filters to PLAN.md files, fetches their content,
 * and calls syncPhaseItemsFromPlans. Runs up to PARALLELISM phases at once to
 * stay under the Vercel function timeout on large repos.
 */
async function runPhaseItemsSync(
  supabase: SupabaseClient,
  token: string,
  owner: string,
  repo: string,
  phaseDirs: string[],
  queue: PhaseItemWork[]
): Promise<void> {
  const PARALLELISM = 6;

  const processOne = async (work: PhaseItemWork): Promise<void> => {
    try {
      const phaseNumFloat = parseFloat(work.phaseNumber);
      const matchingDir = phaseDirs.find((d) => {
        const m = d.match(/^(\d+(?:\.\d+)?)[-_]/);
        return m ? parseFloat(m[1]) === phaseNumFloat : false;
      });
      if (!matchingDir) return;

      const files = await listGitHubDir(token, owner, repo, `.planning/phases/${matchingDir}`);
      const planFileNames = files.filter((f) => /PLAN\.md$/.test(f));
      if (planFileNames.length === 0) return;
      const summaryFileNames = new Set(files.filter((f) => /SUMMARY\.md$/.test(f)));

      const contents = await Promise.all(
        planFileNames.map((planName) =>
          fetchGitHubFile(token, owner, repo, `.planning/phases/${matchingDir}/${planName}`).then(
            (r) => ({ planName, content: r.content })
          )
        )
      );

      const planFiles = contents
        .filter((c): c is { planName: string; content: string } => !!c.content)
        .map(({ planName, content }) => ({
          name: planName,
          content,
          summaryExists: summaryFileNames.has(planName.replace(/PLAN\.md$/, 'SUMMARY.md')),
        }));

      if (planFiles.length > 0) {
        await syncPhaseItemsFromPlans(supabase, work.phaseRowId, planFiles, work.phaseCompleted);
      }
    } catch (err) {
      console.error('[sync] phase_items failed for', work.phaseNumber, err);
    }
  };

  // Simple worker-pool: PARALLELISM workers drain the queue.
  let cursor = 0;
  const workers = Array.from({ length: Math.min(PARALLELISM, queue.length) }, async () => {
    while (cursor < queue.length) {
      const idx = cursor++;
      await processOne(queue[idx]);
    }
  });
  await Promise.all(workers);
}

/** Derive milestone status from its child phases */
function getMilestoneStatusFromPhases(
  phases: { status: string }[],
  fallbackStatus: string
): string {
  if (phases.length === 0) return fallbackStatus;
  const allDone = phases.every((p) => p.status === 'completed');
  if (allDone) return 'completed';
  const anyInProgress = phases.some((p) => p.status === 'in_progress' || p.status === 'completed');
  if (anyInProgress) return 'in_progress';
  return 'not_started';
}

/**
 * Populate phase_items for a single phase from its framework PLAN.md file(s).
 *
 * A phase directory may contain one PLAN.md or several (e.g. `22-01-PLAN.md`,
 * `22-02-PLAN.md`). Each file has `## Task N -- {title}` headings that become
 * phase_item rows. Matching SUMMARY.md files mark their tasks as completed.
 *
 * Idempotency: deletes any existing framework-sourced phase_items for this
 * phase (is_custom=false) before re-inserting. Custom user-added items survive.
 * display_order is derived from `(planIndex * 1000) + taskNumber` so multi-plan
 * phases don't collide. template_key = `${planFileName}#task${number}`.
 */
export async function syncPhaseItemsFromPlans(
  supabase: SupabaseClient,
  phaseRowId: string,
  planFiles: Array<{ name: string; content: string; summaryExists: boolean }>,
  phaseCompleted: boolean
): Promise<number> {
  // Remove stale framework items first.
  await supabase
    .from('phase_items')
    .delete()
    .eq('phase_id', phaseRowId)
    .or('is_custom.is.null,is_custom.eq.false');

  const rows: Record<string, unknown>[] = [];
  let planIndex = 0;
  for (const pf of planFiles) {
    const tasks = parsePhasePlanTasks(pf.content);
    for (const t of tasks) {
      const isDone = phaseCompleted || pf.summaryExists;
      rows.push({
        phase_id: phaseRowId,
        title: t.title.length > 300 ? t.title.slice(0, 300) : t.title,
        description: t.description || null,
        display_order: planIndex * 1000 + t.number,
        is_completed: isDone,
        completed_at: isDone ? new Date().toISOString() : null,
        status: isDone ? 'Done' : 'Todo',
        template_key: `${pf.name}#task${t.number}`,
        is_custom: false,
      });
    }
    planIndex++;
  }

  if (rows.length === 0) return 0;

  const { error } = await supabase.from('phase_items').insert(rows);
  if (error) {
    console.error('[syncPhaseItemsFromPlans] insert error:', error.message);
    return 0;
  }
  return rows.length;
}
