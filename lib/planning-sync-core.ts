/**
 * Core sync logic shared between the manual sync action and the GitHub webhook.
 * Accepts a Supabase client (either user-auth or service-role).
 */

import { parseRoadmap, parseStateTable } from '@/lib/planning-parser';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SyncResult {
  success: boolean;
  phasesUpserted: number;
  error?: string;
}

function parseRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function fetchGitHubFile(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
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
    return { success: false, phasesUpserted: 0, error: 'No GitHub repo linked' };
  }

  // 2. Get GitHub token from workspace
  const { data: settings } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github')
    .single();

  if (!settings?.encrypted_token) {
    return { success: false, phasesUpserted: 0, error: 'No GitHub token configured' };
  }

  const token = settings.encrypted_token;
  const repoParsed = parseRepoFromUrl(integration.external_url);
  if (!repoParsed) {
    return { success: false, phasesUpserted: 0, error: 'Cannot parse repo URL' };
  }

  // 3. Try to fetch ROADMAP.md (try multiple org names)
  let roadmapContent = await fetchGitHubFile(
    token,
    repoParsed.owner,
    repoParsed.repo,
    '.planning/ROADMAP.md'
  );

  if (!roadmapContent) {
    // Try alternate org names
    for (const altOwner of ['SakaniQualia', 'Qualiasolutions']) {
      if (altOwner === repoParsed.owner) continue;
      roadmapContent = await fetchGitHubFile(
        token,
        altOwner,
        repoParsed.repo,
        '.planning/ROADMAP.md'
      );
      if (roadmapContent) {
        repoParsed.owner = altOwner;
        break;
      }
    }
    if (!roadmapContent) {
      return { success: false, phasesUpserted: 0, error: 'No .planning/ROADMAP.md found' };
    }
  }

  // 4. Fetch STATE.md for dates
  const stateContent = await fetchGitHubFile(
    token,
    repoParsed.owner,
    repoParsed.repo,
    '.planning/STATE.md'
  );
  const stateMap = stateContent ? parseStateTable(stateContent) : new Map();

  // 5. Parse ROADMAP.md
  const milestones = parseRoadmap(roadmapContent);

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
  let phasesUpserted = 0;
  let sortOrder = 0;

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
    phasesUpserted++;

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

      if (existing) {
        await supabase.from('project_phases').update(phaseData).eq('id', existing.id);
      } else {
        await supabase.from('project_phases').insert(phaseData);
      }
      phasesUpserted++;
    }
  }

  return { success: true, phasesUpserted };
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
