'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './shared';
import type {
  IntegrationProvider,
  GitHubConfig,
  VercelConfig,
  VAPIConfig,
  IntegrationSelections,
} from '@/lib/integrations/types';
import {
  testGitHubConnection,
  testVercelConnection,
  testVAPIConnection,
  clearGitHubClientCache,
  clearVercelClientCache,
  clearVAPIClientCache,
  setupProjectIntegrations,
  getProvisioningStatus as getProvisioningStatusFromLib,
  retryProvisioningStep as retryProvisioningStepFromLib,
} from '@/lib/integrations';

// =====================================================
// Integration Token Management
// =====================================================

/**
 * Get all integrations for a workspace
 */
export async function getIntegrations(workspaceId: string): Promise<
  ActionResult & {
    data?: Array<{
      provider: IntegrationProvider;
      isConnected: boolean;
      lastVerified: string | null;
      config: GitHubConfig | VercelConfig | VAPIConfig;
    }>;
  }
> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  const { data, error } = await supabase
    .from('workspace_integrations')
    .select('provider, is_connected, last_verified_at, config')
    .eq('workspace_id', workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data || []).map((row) => ({
      provider: row.provider as IntegrationProvider,
      isConnected: row.is_connected,
      lastVerified: row.last_verified_at,
      config: row.config as GitHubConfig | VercelConfig | VAPIConfig,
    })),
  };
}

/**
 * Save integration token for a provider
 */
export async function saveIntegrationToken(
  workspaceId: string,
  provider: IntegrationProvider,
  token: string,
  config: GitHubConfig | VercelConfig | VAPIConfig
): Promise<ActionResult> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Test the token before saving
  let testResult: { success: boolean; error?: string };
  if (provider === 'github') {
    const githubConfig = config as GitHubConfig;
    testResult = await testGitHubConnection(token, githubConfig.org);
  } else if (provider === 'vercel') {
    const vercelConfig = config as VercelConfig;
    testResult = await testVercelConnection(token, vercelConfig.teamId);
  } else {
    testResult = await testVAPIConnection(token);
  }

  if (!testResult.success) {
    return { success: false, error: testResult.error || 'Token validation failed' };
  }

  // Upsert the integration
  const { error } = await supabase.from('workspace_integrations').upsert(
    {
      workspace_id: workspaceId,
      provider,
      encrypted_token: token,
      config,
      is_connected: true,
      last_verified_at: new Date().toISOString(),
    },
    {
      onConflict: 'workspace_id,provider',
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  // Clear cached client
  if (provider === 'github') await clearGitHubClientCache(workspaceId);
  if (provider === 'vercel') await clearVercelClientCache(workspaceId);
  if (provider === 'vapi') await clearVAPIClientCache(workspaceId);

  revalidatePath('/settings/integrations');
  return { success: true };
}

/**
 * Remove integration for a provider
 */
export async function removeIntegration(
  workspaceId: string,
  provider: IntegrationProvider
): Promise<ActionResult> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  const { error } = await supabase
    .from('workspace_integrations')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider);

  if (error) {
    return { success: false, error: error.message };
  }

  // Clear cached client
  if (provider === 'github') await clearGitHubClientCache(workspaceId);
  if (provider === 'vercel') await clearVercelClientCache(workspaceId);
  if (provider === 'vapi') await clearVAPIClientCache(workspaceId);

  revalidatePath('/settings/integrations');
  return { success: true };
}

/**
 * Test integration connection
 */
export async function testIntegration(
  workspaceId: string,
  provider: IntegrationProvider
): Promise<ActionResult & { data?: { valid: boolean; error?: string } }> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Get stored token
  const { data: integration, error } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .single();

  if (error || !integration) {
    return { success: true, data: { valid: false, error: 'Integration not configured' } };
  }

  // Test the connection
  let testResult: { success: boolean; error?: string };
  if (provider === 'github') {
    const config = integration.config as GitHubConfig;
    testResult = await testGitHubConnection(integration.encrypted_token, config.org);
  } else if (provider === 'vercel') {
    const config = integration.config as VercelConfig;
    testResult = await testVercelConnection(integration.encrypted_token, config.teamId);
  } else {
    testResult = await testVAPIConnection(integration.encrypted_token);
  }

  // Update last verified timestamp
  if (testResult.success) {
    await supabase
      .from('workspace_integrations')
      .update({
        is_connected: true,
        last_verified_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('provider', provider);
  } else {
    await supabase
      .from('workspace_integrations')
      .update({
        is_connected: false,
      })
      .eq('workspace_id', workspaceId)
      .eq('provider', provider);
  }

  return {
    success: true,
    data: {
      valid: testResult.success,
      error: testResult.error,
    },
  };
}

/**
 * Update GitHub template configuration
 */
export async function updateGitHubTemplates(
  workspaceId: string,
  templates: GitHubConfig['templates']
): Promise<ActionResult> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Get current config
  const { data: integration, error: fetchError } = await supabase
    .from('workspace_integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github')
    .single();

  if (fetchError || !integration) {
    return { success: false, error: 'GitHub integration not configured' };
  }

  const currentConfig = integration.config as GitHubConfig;
  const newConfig: GitHubConfig = {
    ...currentConfig,
    templates,
  };

  const { error } = await supabase
    .from('workspace_integrations')
    .update({ config: newConfig })
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github');

  if (error) {
    return { success: false, error: error.message };
  }

  await clearGitHubClientCache(workspaceId);
  revalidatePath('/settings/integrations');
  return { success: true };
}

// =====================================================
// Project Provisioning
// =====================================================

/**
 * Start provisioning for a project
 * @param projectId - The project to provision
 * @param selectedIntegrations - Optional user-selected integrations (if not provided, uses automatic selection)
 */
export async function startProvisioning(
  projectId: string,
  selectedIntegrations?: IntegrationSelections
): Promise<ActionResult & { data?: { jobStarted: boolean } }> {
  const supabase = await createClient();

  // Get project info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, name, description, project_type, deployment_platform, workspace_id, client:clients(display_name)'
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  const clientName = (project.client as { display_name?: string } | null)?.display_name;

  // Start provisioning (fire-and-forget)
  setupProjectIntegrations({
    projectId: project.id,
    projectName: project.name,
    projectType: project.project_type,
    deploymentPlatform: project.deployment_platform,
    description: project.description || undefined,
    clientName: clientName || undefined,
    workspaceId: project.workspace_id,
    selectedIntegrations,
  }).catch((err) => {
    console.error('[startProvisioning] Error:', err);
  });

  return { success: true, data: { jobStarted: true } };
}

/**
 * Get provisioning status for a project
 */
export async function getProjectProvisioningStatus(projectId: string): Promise<
  ActionResult & {
    data?: {
      status: string;
      github?: { url?: string; error?: string };
      vercel?: { url?: string; error?: string };
      vapi?: { assistantId?: string; error?: string };
    };
  }
> {
  const result = await getProvisioningStatusFromLib(projectId);
  return {
    success: result.success,
    error: result.error,
    data: result.data,
  };
}

/**
 * Retry a failed provisioning step
 */
export async function retryProvisioning(
  projectId: string,
  step: 'github' | 'vercel' | 'vapi'
): Promise<ActionResult> {
  const result = await retryProvisioningStepFromLib(projectId, step);
  return result;
}

/**
 * Check if integrations are configured for a workspace
 */
export async function checkIntegrationsConfigured(workspaceId: string): Promise<
  ActionResult & {
    data?: {
      github: boolean;
      vercel: boolean;
      vapi: boolean;
    };
  }
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspace_integrations')
    .select('provider, is_connected')
    .eq('workspace_id', workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  const configured = {
    github: data?.some((i) => i.provider === 'github' && i.is_connected) || false,
    vercel: data?.some((i) => i.provider === 'vercel' && i.is_connected) || false,
    vapi: data?.some((i) => i.provider === 'vapi' && i.is_connected) || false,
  };

  return { success: true, data: configured };
}
