'use server';

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

import { Octokit } from '@octokit/rest';
import type { ActionResult } from './shared';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function deriveKey(material: string): Buffer {
  return crypto.scryptSync(material, 'qualia-token-salt', 32);
}

function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured — cannot encrypt integration tokens');
  }
  const key = deriveKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(stored: string): string {
  if (!stored.startsWith('enc:')) {
    // All rows were re-encrypted during the 2026-04-19 rotation. Plaintext
    // should never appear — log loudly if it does so the operator can
    // investigate (manual DB edit? cross-env copy?).
    console.error(
      `[integrations] Plaintext token encountered after rotation (prefix: ${stored.slice(0, 4)}). Investigate.`
    );
    return stored;
  }
  if (!ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured — cannot decrypt integration tokens');
  }
  const [, ivHex, authTagHex, encryptedHex] = stored.split(':');
  const key = deriveKey(ENCRYPTION_KEY);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
import type {
  IntegrationProvider,
  GitHubConfig,
  VercelConfig,
  ZohoConfig,
  IntegrationSelections,
} from '@/lib/integrations/types';
import {
  testGitHubConnection,
  testVercelConnection,
  clearGitHubClientCache,
  clearVercelClientCache,
  setupProjectIntegrations,
  getProvisioningStatus as getProvisioningStatusFromLib,
  retryProvisioningStep as retryProvisioningStepFromLib,
} from '@/lib/integrations';
import { testZohoConnection, clearZohoClientCache } from '@/lib/integrations/zoho';

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
      config: GitHubConfig | VercelConfig | ZohoConfig;
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
      config: row.config as GitHubConfig | VercelConfig | ZohoConfig,
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
  config: GitHubConfig | VercelConfig | ZohoConfig
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
  } else if (provider === 'zoho') {
    // Zoho uses OAuth refresh token, skip validation on save
    testResult = { success: true };
  } else {
    testResult = { success: true };
  }

  if (!testResult.success) {
    return { success: false, error: testResult.error || 'Token validation failed' };
  }

  // Upsert the integration
  const { error } = await supabase.from('workspace_integrations').upsert(
    {
      workspace_id: workspaceId,
      provider,
      encrypted_token: encryptToken(token),
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
  if (provider === 'zoho') clearZohoClientCache(workspaceId);

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
  if (provider === 'zoho') clearZohoClientCache(workspaceId);

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
    testResult = await testGitHubConnection(decryptToken(integration.encrypted_token), config.org);
  } else if (provider === 'vercel') {
    const config = integration.config as VercelConfig;
    testResult = await testVercelConnection(
      decryptToken(integration.encrypted_token),
      config.teamId
    );
  } else if (provider === 'zoho') {
    const result = await testZohoConnection(workspaceId);
    testResult = { success: result.valid, error: result.error };
  } else {
    testResult = { success: true };
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

  // Auth check — only admins can trigger provisioning
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required' };

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

  // Create the provisioning record first so polling has something to find
  const { error: insertError } = await supabase.from('project_provisioning').upsert(
    {
      project_id: project.id,
      workspace_id: project.workspace_id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  );

  if (insertError) {
    return { success: false, error: 'Failed to start provisioning' };
  }

  // Run provisioning within this request context (createClient needs cookies())
  try {
    await setupProjectIntegrations({
      projectId: project.id,
      projectName: project.name,
      projectType: project.project_type,
      deploymentPlatform: project.deployment_platform,
      description: project.description || undefined,
      clientName: clientName || undefined,
      workspaceId: project.workspace_id,
      selectedIntegrations,
    });
  } catch (err) {
    console.error('[startProvisioning] Error:', err);
    // Mark as failed so polling UI can show the error
    await supabase
      .from('project_provisioning')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('project_id', project.id);
  }

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
  step: 'github' | 'vercel'
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
  };

  return { success: true, data: configured };
}

// =====================================================
// GitHub Webhook Auto-Sync
// =====================================================

const WEBHOOK_URL = 'https://portal.qualiasolutions.net/api/github/webhook';

/**
 * Sync GitHub webhooks for all projects linked via project_integrations.
 * Creates a push webhook on each repo that doesn't already have one.
 */
export async function syncGitHubWebhooks(
  workspaceId: string
): Promise<ActionResult & { data?: { synced: number; skipped: number; failed: string[] } }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required' };

  // Get GitHub token from workspace integrations
  const { data: githubIntegration } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github')
    .single();

  if (!githubIntegration?.encrypted_token) {
    return { success: false, error: 'GitHub integration not configured' };
  }

  const octokit = new Octokit({ auth: decryptToken(githubIntegration.encrypted_token) });
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || process.env.GSD_WEBHOOK_SECRET || '';

  // Get all GitHub-linked projects
  const { data: integrations } = await supabase
    .from('project_integrations')
    .select('external_url, project_id')
    .eq('service_type', 'github');

  if (!integrations || integrations.length === 0) {
    return { success: true, data: { synced: 0, skipped: 0, failed: [] } };
  }

  // Parallelize webhook checks across all repos (was sequential N+1)
  const results = await Promise.allSettled(
    integrations.map(async (integration) => {
      const repoUrl = integration.external_url;
      if (!repoUrl) return 'skip' as const;

      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return 'skip' as const;
      const [, owner, repo] = match;

      const { data: hooks } = await octokit.repos.listWebhooks({ owner, repo });
      const existing = hooks.find((h) => h.config.url === WEBHOOK_URL);
      if (existing) return 'skipped' as const;

      await octokit.repos.createWebhook({
        owner,
        repo,
        config: { url: WEBHOOK_URL, content_type: 'json', secret: webhookSecret },
        events: ['push'],
        active: true,
      });
      return 'synced' as const;
    })
  );

  let synced = 0;
  let skipped = 0;
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value === 'synced') synced++;
      else if (r.value === 'skipped') skipped++;
    } else {
      const url = integrations[i].external_url || 'unknown';
      const msg = r.reason instanceof Error ? r.reason.message : 'Unknown error';
      failed.push(`${url}: ${msg}`);
    }
  });

  return { success: true, data: { synced, skipped, failed } };
}
