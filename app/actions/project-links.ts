'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';

export type LinkServiceType = 'github' | 'vercel' | 'figma' | 'notion';

export interface ProjectLink {
  id: string;
  project_id: string;
  service_type: LinkServiceType;
  external_url: string;
  external_id: string | null;
  metadata: Record<string, unknown>;
  connected_at: string | null;
}

/**
 * Get all link integrations for a project
 */
export async function getProjectLinks(projectId: string): Promise<ProjectLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .order('connected_at', { ascending: true });

  if (error) {
    console.error('[getProjectLinks] Error:', error);
    return [];
  }

  return (data || []) as ProjectLink[];
}

/**
 * Save or update a project link
 */
export async function saveProjectLink(
  projectId: string,
  serviceType: LinkServiceType,
  externalUrl: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('project_integrations').upsert(
    {
      project_id: projectId,
      service_type: serviceType,
      external_url: externalUrl.trim(),
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,service_type' }
  );

  if (error) {
    console.error('[saveProjectLink] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

/**
 * Remove a project link
 */
export async function removeProjectLink(
  integrationId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from('project_integrations').delete().eq('id', integrationId);

  if (error) {
    console.error('[removeProjectLink] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}
