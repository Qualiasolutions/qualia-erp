'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { syncPlanningFromGitHubWithServiceRole } from '@/lib/planning-sync-core';
import type { ActionResult } from './shared';

interface SyncResult {
  milestonesFound: number;
  phasesUpserted: number;
  repoFullName: string;
}

/**
 * Manual sync: fetch .planning/ROADMAP.md + STATE.md from GitHub,
 * parse milestones/phases/plans, upsert into project_phases.
 */
export async function syncPlanningFromGitHub(
  projectId: string
): Promise<ActionResult & { data?: SyncResult }> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, workspace_id')
    .eq('id', projectId)
    .single();

  if (!project) return { success: false, error: 'Project not found' };

  // Delegate to shared sync core
  const result = await syncPlanningFromGitHubWithServiceRole(
    supabase,
    projectId,
    project.workspace_id
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Revalidate pages
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/portal');

  return {
    success: true,
    data: {
      milestonesFound: 0, // not tracked in core, but not critical
      phasesUpserted: result.phasesUpserted,
      repoFullName: '', // not exposed from core
    },
  };
}

/**
 * Get sync status for a project (last synced time)
 */
export async function getGitHubSyncStatus(
  projectId: string
): Promise<{ lastSynced: string | null; phaseCount: number }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('project_phases')
    .select('github_synced_at')
    .eq('project_id', projectId)
    .not('github_synced_at', 'is', null)
    .order('github_synced_at', { ascending: false })
    .limit(1);

  const { count } = await supabase
    .from('project_phases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  return {
    lastSynced: data?.[0]?.github_synced_at || null,
    phaseCount: count || 0,
  };
}
