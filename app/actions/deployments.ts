'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Deployment {
  id: string;
  project_id: string;
  environment: string;
  vercel_deployment_id: string | null;
  status: 'building' | 'ready' | 'error' | 'canceled';
  url: string | null;
  branch: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  created_at: string;
  ready_at: string | null;
  error_message: string | null;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  url: string | null;
  vercel_project_id: string | null;
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown';
  last_checked_at: string | null;
  last_deployment?: Deployment | null;
}

/**
 * Get recent deployments for a project
 */
export async function getProjectDeployments(projectId: string, limit = 10): Promise<Deployment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getProjectDeployments] Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get environments for a project (production, staging)
 */
export async function getProjectEnvironments(projectId: string): Promise<Environment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_environments')
    .select(
      `
      *,
      last_deployment:project_deployments(*)
    `
    )
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[getProjectEnvironments] Error:', error);
    return [];
  }

  // Normalize the FK array response
  return (data || []).map((env) => ({
    ...env,
    last_deployment: Array.isArray(env.last_deployment)
      ? env.last_deployment[0] || null
      : env.last_deployment,
  }));
}

/**
 * Get deployment stats for a project
 */
export async function getDeploymentStats(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, successful: 0, failed: 0, byEnvironment: {} };

  // Get counts by status from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('project_deployments')
    .select('status, environment')
    .eq('project_id', projectId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('[getDeploymentStats] Error:', error);
    return { total: 0, successful: 0, failed: 0, byEnvironment: {} };
  }

  const stats = {
    total: data?.length || 0,
    successful: data?.filter((d) => d.status === 'ready').length || 0,
    failed: data?.filter((d) => d.status === 'error').length || 0,
    byEnvironment: {} as Record<string, number>,
  };

  (data || []).forEach((d) => {
    stats.byEnvironment[d.environment] = (stats.byEnvironment[d.environment] || 0) + 1;
  });

  return stats;
}

/**
 * Manually trigger a health check for an environment
 */
export async function checkEnvironmentHealth(environmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Get the environment
  const { data: env, error: fetchError } = await supabase
    .from('project_environments')
    .select('url, project_id')
    .eq('id', environmentId)
    .single();

  if (fetchError || !env?.url) {
    return { success: false, error: 'Environment not found or no URL' };
  }

  try {
    // Simple health check - just verify the URL responds
    const response = await fetch(env.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    });

    const healthStatus = response.ok ? 'healthy' : 'degraded';

    // Update the environment
    const { error: updateError } = await supabase
      .from('project_environments')
      .update({
        health_status: healthStatus,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', environmentId);

    if (updateError) {
      console.error('[checkEnvironmentHealth] Update error:', updateError);
    }

    revalidatePath(`/portal/${env.project_id}`);
    return { success: true, status: healthStatus };
  } catch {
    // URL didn't respond
    await supabase
      .from('project_environments')
      .update({
        health_status: 'down',
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', environmentId);

    revalidatePath(`/portal/${env.project_id}`);
    return { success: true, status: 'down' };
  }
}

/**
 * Link a Vercel project to our project
 */
export async function linkVercelProject(projectId: string, vercelProjectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('projects')
    .update({ vercel_project_id: vercelProjectId })
    .eq('id', projectId);

  if (error) {
    console.error('[linkVercelProject] Error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}
