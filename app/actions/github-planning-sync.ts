'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

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

  // Use admin client for sync — workspace_integrations token is RLS-restricted
  // but sync should work for any authenticated team member
  const adminClient = createAdminClient();
  const result = await syncPlanningFromGitHubWithServiceRole(
    adminClient,
    projectId,
    project.workspace_id
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

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

  // Single query — compute both lastSynced and phaseCount from one result
  const { data } = await supabase
    .from('project_phases')
    .select('id, github_synced_at')
    .eq('project_id', projectId);

  const phases = data || [];
  const synced = phases
    .map((p) => p.github_synced_at)
    .filter((d): d is string => !!d)
    .sort()
    .reverse();

  return {
    lastSynced: synced[0] || null,
    phaseCount: phases.length,
  };
}
