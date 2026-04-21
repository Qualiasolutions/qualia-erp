'use server';

import { createClient } from '@/lib/supabase/server';

import { type ActionResult, isUserAdmin, canAccessProject } from './shared';

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
 * Get all link integrations for a project.
 * BH-A1: Added auth + project access check.
 */
export async function getProjectLinks(projectId: string): Promise<ProjectLink[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const hasAccess = await canAccessProject(user.id, projectId);
  if (!hasAccess) return [];

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
 * Save or update a project link.
 * BH-A2: Added admin-or-project-lead check.
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

  // Admins can always save; others must have project access
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    const hasAccess = await canAccessProject(user.id, projectId);
    if (!hasAccess) return { success: false, error: 'Unauthorized' };
  }

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

  return { success: true };
}

/**
 * Remove a project link.
 * BH-A3: Added admin-or-project-lead check.
 */
export async function removeProjectLink(
  integrationId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Admins can always remove; others must have project access
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    const hasAccess = await canAccessProject(user.id, projectId);
    if (!hasAccess) return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.from('project_integrations').delete().eq('id', integrationId);

  if (error) {
    console.error('[removeProjectLink] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
