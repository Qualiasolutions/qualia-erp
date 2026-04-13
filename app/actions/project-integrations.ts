'use server';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.qualiasolutions.net';
const WEBHOOK_PATH = '/api/github/webhook';

/**
 * Best-effort: install the GitHub push webhook on the connected repo so
 * subsequent pushes to main/master automatically trigger phase sync.
 *
 * Why this exists: every previous integration (e.g. JEC) had to have its
 * webhook installed by hand in repo Settings → Webhooks. People forget.
 * Result: integration row exists but phases never sync. This function makes
 * the whole flow self-serve.
 *
 * Idempotent: lists existing hooks first and skips if our URL is already
 * registered. Failure modes (no token, no secret, no repo access) all log
 * but never throw — the integration row is still considered successfully
 * connected.
 */
async function ensureGitHubWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  externalUrl: string
): Promise<{ installed: boolean; reason?: string }> {
  try {
    // 1. Need the webhook secret. Without it the receiver can't verify
    //    signatures, so installing the hook would just produce 401 errors.
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || process.env.GSD_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { installed: false, reason: 'GITHUB_WEBHOOK_SECRET not configured' };
    }

    // 2. Parse owner/repo from the integration URL.
    const repoMatch = externalUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!repoMatch) {
      return { installed: false, reason: 'External URL is not a GitHub repo' };
    }
    const owner = repoMatch[1];
    const repo = repoMatch[2].replace(/\.git$/, '');

    // 3. Resolve the workspace's GitHub token (same source as the sync core).
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single();
    if (!project?.workspace_id) {
      return { installed: false, reason: 'Project has no workspace_id' };
    }

    const { data: integration } = await supabase
      .from('workspace_integrations')
      .select('encrypted_token')
      .eq('workspace_id', project.workspace_id)
      .eq('provider', 'github')
      .single();

    if (!integration?.encrypted_token) {
      return { installed: false, reason: 'No GitHub token configured for this workspace' };
    }

    const token = integration.encrypted_token;
    const targetUrl = `${APP_URL}${WEBHOOK_PATH}`;

    // 4. Idempotency: check existing hooks first.
    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (listRes.status === 401 || listRes.status === 403) {
      return { installed: false, reason: 'GitHub token lacks admin:repo_hook scope' };
    }
    if (!listRes.ok) {
      return { installed: false, reason: `Listing hooks failed (HTTP ${listRes.status})` };
    }
    const existingHooks: Array<{ id: number; config: { url?: string } }> = await listRes.json();
    const alreadyInstalled = existingHooks.some((h) => h.config?.url === targetUrl);
    if (alreadyInstalled) {
      return { installed: true, reason: 'already present' };
    }

    // 5. Create the hook.
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push'],
        config: {
          url: targetUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text().catch(() => '');
      return {
        installed: false,
        reason: `Hook create failed (HTTP ${createRes.status}): ${errBody.slice(0, 200)}`,
      };
    }
    return { installed: true };
  } catch (err) {
    return { installed: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Get all integrations for a project
 */
export async function getProjectIntegrations(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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

  // Auto-install the GitHub webhook so future pushes to main/master
  // trigger phase sync without anyone touching repo Settings → Webhooks.
  // Best-effort: any failure (no token, no permission, repo private etc.)
  // is logged but does not fail the integration upsert.
  if (serviceType === 'github') {
    const result = await ensureGitHubWebhook(supabase, projectId, externalUrl);
    if (!result.installed) {
      console.warn('[upsertIntegration] webhook auto-install skipped:', result.reason);
    } else {
      console.log('[upsertIntegration] github webhook ensured:', result.reason || 'created');
    }
  }

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

  return { success: true };
}
