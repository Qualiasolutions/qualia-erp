'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';

/**
 * Get all integrations for a project
 */
export async function getProjectIntegrations(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .order('service_type', { ascending: true });

  if (error) {
    console.error('Failed to fetch project integrations:', error);
    return [];
  }

  return data || [];
}

/**
 * Upsert a project integration (GitHub or Vercel)
 */
export async function upsertIntegration(
  projectId: string,
  serviceType: string,
  externalUrl: string
): Promise<ActionResult> {
  // Validate inputs
  if (!projectId || !serviceType || !externalUrl) {
    return { success: false, error: 'Missing required fields' };
  }

  // Validate service type
  if (!['github', 'vercel'].includes(serviceType)) {
    return { success: false, error: 'Invalid service type. Must be github or vercel' };
  }

  // Validate URL format
  try {
    new URL(externalUrl);
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  const supabase = await createClient();

  // Check if integration already exists for this project + service type
  const { data: existing } = await supabase
    .from('project_integrations')
    .select('id')
    .eq('project_id', projectId)
    .eq('service_type', serviceType)
    .single();

  let error;

  if (existing) {
    // Update existing integration
    const result = await supabase
      .from('project_integrations')
      .update({ external_url: externalUrl })
      .eq('id', existing.id);
    error = result.error;
  } else {
    // Insert new integration
    const result = await supabase.from('project_integrations').insert({
      project_id: projectId,
      service_type: serviceType,
      external_url: externalUrl,
      connected_at: new Date().toISOString(),
    });
    error = result.error;
  }

  if (error) {
    console.error('Failed to upsert integration:', error);
    return { success: false, error: 'Failed to save integration' };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * Delete a project integration
 */
export async function deleteIntegration(
  integrationId: string,
  projectId: string
): Promise<ActionResult> {
  if (!integrationId || !projectId) {
    return { success: false, error: 'Missing required fields' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('project_integrations').delete().eq('id', integrationId);

  if (error) {
    console.error('Failed to delete integration:', error);
    return { success: false, error: 'Failed to delete integration' };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
