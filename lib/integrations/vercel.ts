'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  IntegrationResult,
  VercelProjectConfig,
  VercelProjectResult,
  VercelConfig,
} from './types';

// =====================================================
// Types
// =====================================================

type VercelClient = {
  token: string;
  teamId?: string;
};

// =====================================================
// Lazy Initialization
// =====================================================

const clientCache = new Map<string, VercelClient>();

async function getVercelClient(workspaceId: string): Promise<VercelClient | null> {
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId)!;
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'vercel')
    .single();

  if (!settings?.encrypted_token) {
    return null;
  }

  const config = settings.config as VercelConfig | null;

  const client: VercelClient = {
    token: settings.encrypted_token,
    teamId: config?.teamId,
  };

  clientCache.set(workspaceId, client);
  return client;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Make authenticated request to Vercel API
 */
async function vercelFetch(
  client: VercelClient,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${endpoint}`);

  if (client.teamId) {
    url.searchParams.set('teamId', client.teamId);
  }

  return fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${client.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Sanitize project name for Vercel (lowercase, alphanumeric + hyphens)
 */
function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 52); // Vercel limit
}

/**
 * Extract GitHub repo info from URL
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// =====================================================
// Main Functions
// =====================================================

/**
 * Check if a Vercel project already exists
 */
export async function checkProjectExists(
  workspaceId: string,
  projectName: string
): Promise<boolean> {
  const client = await getVercelClient(workspaceId);
  if (!client) return false;

  const name = sanitizeProjectName(projectName);
  const response = await vercelFetch(client, `/v9/projects/${name}`);
  return response.ok;
}

/**
 * Create Vercel project linked to GitHub repository
 */
export async function createVercelProject(
  workspaceId: string,
  config: VercelProjectConfig
): Promise<IntegrationResult<VercelProjectResult>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  const projectName = sanitizeProjectName(config.name);
  const repoInfo = parseGitHubUrl(config.repoUrl);

  if (!repoInfo) {
    return {
      success: false,
      error: 'Invalid GitHub repository URL',
    };
  }

  try {
    // 1. Check if project already exists (idempotency)
    const existsResponse = await vercelFetch(client, `/v9/projects/${projectName}`);
    if (existsResponse.ok) {
      const existingProject = await existsResponse.json();
      return {
        success: true,
        data: {
          projectId: existingProject.id,
          projectUrl: `https://${projectName}.vercel.app`,
          deploymentUrl: existingProject.latestDeployments?.[0]?.url
            ? `https://${existingProject.latestDeployments[0].url}`
            : undefined,
        },
      };
    }

    // 2. Create new project
    const createResponse = await vercelFetch(client, '/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        framework: config.framework || 'nextjs',
        gitRepository: {
          type: 'github',
          repo: `${repoInfo.owner}/${repoInfo.repo}`,
        },
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDirectory,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('[Vercel] Create project error:', errorData);

      if (createResponse.status === 409) {
        return { success: false, error: 'A project with this name already exists.' };
      }
      return {
        success: false,
        error: errorData.error?.message || 'Failed to create Vercel project',
      };
    }

    const project = await createResponse.json();

    // 3. Set environment variables if provided
    if (config.envVars && Object.keys(config.envVars).length > 0) {
      const envResponse = await vercelFetch(client, `/v10/projects/${project.id}/env`, {
        method: 'POST',
        body: JSON.stringify(
          Object.entries(config.envVars).map(([key, value]) => ({
            key,
            value,
            type: 'encrypted',
            target: ['production', 'preview', 'development'],
          }))
        ),
      });

      if (!envResponse.ok) {
        console.warn('[Vercel] Failed to set environment variables');
      }
    }

    // 4. Trigger initial deployment
    let deploymentUrl: string | undefined;
    try {
      const deployResponse = await vercelFetch(client, '/v13/deployments', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          gitSource: {
            type: 'github',
            repo: `${repoInfo.owner}/${repoInfo.repo}`,
            ref: 'main',
          },
        }),
      });

      if (deployResponse.ok) {
        const deployment = await deployResponse.json();
        deploymentUrl = `https://${deployment.url}`;
      }
    } catch {
      console.warn('[Vercel] Initial deployment skipped');
    }

    return {
      success: true,
      data: {
        projectId: project.id,
        projectUrl: `https://${projectName}.vercel.app`,
        deploymentUrl,
      },
    };
  } catch (error: unknown) {
    console.error('[Vercel] createVercelProject error:', error);
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to create Vercel project' };
  }
}

/**
 * Add environment variables to existing project
 */
export async function addEnvVars(
  workspaceId: string,
  projectId: string,
  envVars: Record<string, string>
): Promise<IntegrationResult<void>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return { success: false, error: 'Vercel integration not configured' };
  }

  try {
    const response = await vercelFetch(client, `/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: JSON.stringify(
        Object.entries(envVars).map(([key, value]) => ({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development'],
        }))
      ),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to add environment variables',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message };
  }
}

/**
 * Test Vercel connection
 */
export async function testVercelConnection(
  token: string,
  teamId?: string
): Promise<IntegrationResult<{ username: string; email: string }>> {
  try {
    const client: VercelClient = { token, teamId };

    const response = await vercelFetch(client, '/v2/user');

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Invalid Vercel token',
      };
    }

    const data = await response.json();

    // If team ID provided, verify access
    if (teamId) {
      const teamResponse = await vercelFetch(client, `/v2/teams/${teamId}`);
      if (!teamResponse.ok) {
        return {
          success: false,
          error: `Cannot access team "${teamId}". Make sure the token has team access.`,
        };
      }
    }

    return {
      success: true,
      data: {
        username: data.user.username,
        email: data.user.email,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to connect to Vercel' };
  }
}

/**
 * List all projects
 */
export async function listProjects(workspaceId: string): Promise<
  IntegrationResult<
    Array<{
      id: string;
      name: string;
      framework: string | null;
      updatedAt: number;
      latestDeploymentStatus: string | null;
    }>
  >
> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, '/v9/projects?limit=50');

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to list projects',
      };
    }

    const data = await response.json();

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (data.projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        framework: p.framework || null,
        updatedAt: p.updatedAt,
        latestDeploymentStatus:
          p.latestDeployments?.[0]?.readyState || p.latestDeployments?.[0]?.state || null,
      })),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to list projects' };
  }
}

/**
 * Get project details
 */
export async function getProject(
  workspaceId: string,
  nameOrId: string
): Promise<
  IntegrationResult<{
    id: string;
    name: string;
    framework: string | null;
    nodeVersion: string;
    updatedAt: number;
    latestDeployment: {
      id: string;
      url: string;
      state: string;
      createdAt: number;
    } | null;
  }>
> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v9/projects/${encodeURIComponent(nameOrId)}`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to get project',
      };
    }

    const p = await response.json();

    return {
      success: true,
      data: {
        id: p.id,
        name: p.name,
        framework: p.framework || null,
        nodeVersion: p.nodeVersion || 'default',
        updatedAt: p.updatedAt,
        latestDeployment: p.latestDeployments?.[0]
          ? {
              id: p.latestDeployments[0].id,
              url: `https://${p.latestDeployments[0].url}`,
              state: p.latestDeployments[0].readyState || p.latestDeployments[0].state,
              createdAt: p.latestDeployments[0].createdAt,
            }
          : null,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to get project' };
  }
}

/**
 * List deployments for a project
 */
export async function listDeployments(
  workspaceId: string,
  projectId: string,
  limit?: number
): Promise<
  IntegrationResult<
    Array<{
      id: string;
      url: string;
      state: string;
      target: string | null;
      createdAt: number;
      readyAt: number | null;
      source: string | null;
    }>
  >
> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(
      client,
      `/v6/deployments?projectId=${projectId}&limit=${limit || 10}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to list deployments',
      };
    }

    const data = await response.json();

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (data.deployments || []).map((d: any) => ({
        id: d.uid,
        url: `https://${d.url}`,
        state: d.readyState || d.state,
        target: d.target || null,
        createdAt: d.createdAt || d.created,
        readyAt: d.ready || null,
        source: d.meta?.githubCommitRef || d.source || null,
      })),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to list deployments' };
  }
}

/**
 * Get deployment details
 */
export async function getDeployment(
  workspaceId: string,
  deploymentId: string
): Promise<
  IntegrationResult<{
    id: string;
    url: string;
    state: string;
    target: string | null;
    createdAt: number;
    readyAt: number | null;
    buildingAt: number | null;
    errorMessage: string | null;
    meta: Record<string, string>;
  }>
> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v13/deployments/${deploymentId}`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to get deployment',
      };
    }

    const d = await response.json();

    return {
      success: true,
      data: {
        id: d.uid,
        url: `https://${d.url}`,
        state: d.readyState || d.state,
        target: d.target || null,
        createdAt: d.createdAt || d.created,
        readyAt: d.ready || null,
        buildingAt: d.buildingAt || null,
        errorMessage: d.errorMessage || d.error?.message || null,
        meta: d.meta || {},
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to get deployment' };
  }
}

/**
 * Get deployment logs
 */
export async function getDeploymentLogs(
  workspaceId: string,
  deploymentId: string
): Promise<IntegrationResult<Array<{ timestamp: number; text: string; type: string }>>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v7/deployments/${deploymentId}/events`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to get deployment logs',
      };
    }

    const events = await response.json();

    // Limit to last 100 entries to avoid massive payloads
    const logs = (Array.isArray(events) ? events : [])
      .slice(-100)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => ({
        timestamp: e.created || e.timestamp || Date.now(),
        text: e.text || e.payload?.text || '',
        type: e.type || 'log',
      }));

    return { success: true, data: logs };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to get deployment logs' };
  }
}

/**
 * Redeploy project
 */
export async function redeployProject(
  workspaceId: string,
  projectId: string,
  target?: 'production' | 'preview'
): Promise<IntegrationResult<{ id: string; url: string; state: string }>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    // Get project details first
    const projectResponse = await vercelFetch(
      client,
      `/v9/projects/${encodeURIComponent(projectId)}`
    );

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to get project details',
      };
    }

    const project = await projectResponse.json();

    // Trigger deployment
    const response = await vercelFetch(client, '/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: project.name,
        target: target || 'production',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to redeploy project',
      };
    }

    const deployment = await response.json();

    return {
      success: true,
      data: {
        id: deployment.uid,
        url: `https://${deployment.url}`,
        state: deployment.readyState || deployment.state,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to redeploy project' };
  }
}

/**
 * Promote preview deployment to production
 */
export async function promoteDeployment(
  workspaceId: string,
  deploymentId: string
): Promise<IntegrationResult<{ id: string; url: string }>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    // Get deployment details to find projectId
    const deploymentResponse = await vercelFetch(client, `/v13/deployments/${deploymentId}`);

    if (!deploymentResponse.ok) {
      const errorData = await deploymentResponse.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to get deployment details',
      };
    }

    const deployment = await deploymentResponse.json();
    const projectId = deployment.projectId;

    // Promote deployment
    const response = await vercelFetch(
      client,
      `/v10/projects/${projectId}/promote/${deploymentId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to promote deployment',
      };
    }

    return {
      success: true,
      data: {
        id: deploymentId,
        url: `https://${deployment.url}`,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to promote deployment' };
  }
}

/**
 * List domains for a project
 */
export async function listDomains(
  workspaceId: string,
  projectId: string
): Promise<
  IntegrationResult<
    Array<{
      name: string;
      redirect: string | null;
      configured: boolean;
      verified: boolean;
    }>
  >
> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v9/projects/${projectId}/domains`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to list domains',
      };
    }

    const data = await response.json();

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (data.domains || []).map((d: any) => ({
        name: d.name,
        redirect: d.redirect || null,
        configured: d.configured || false,
        verified: d.verified || false,
      })),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to list domains' };
  }
}

/**
 * Add domain to project
 */
export async function addDomain(
  workspaceId: string,
  projectId: string,
  domain: string
): Promise<IntegrationResult<{ name: string; configured: boolean }>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to add domain',
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        name: data.name,
        configured: data.configured || false,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to add domain' };
  }
}

/**
 * List environment variables for a project (keys only, no values)
 */
export async function listEnvVars(
  workspaceId: string,
  projectId: string
): Promise<IntegrationResult<Array<{ id: string; key: string; target: string[]; type: string }>>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v9/projects/${projectId}/env`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to list environment variables',
      };
    }

    const data = await response.json();

    // SECURITY: Return keys ONLY, never values
    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (data.envs || []).map((env: any) => ({
        id: env.id,
        key: env.key,
        target: env.target || [],
        type: env.type || 'encrypted',
      })),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to list environment variables' };
  }
}

/**
 * Upsert environment variable
 */
export async function upsertEnvVar(
  workspaceId: string,
  projectId: string,
  key: string,
  value: string,
  targets?: string[]
): Promise<IntegrationResult<{ id: string; key: string }>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: JSON.stringify([
        {
          key,
          value,
          type: 'encrypted',
          target: targets || ['production', 'preview', 'development'],
        },
      ]),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to upsert environment variable',
      };
    }

    const data = await response.json();
    const created = data.created?.[0] || data[0];

    return {
      success: true,
      data: {
        id: created.id,
        key: created.key,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to upsert environment variable' };
  }
}

/**
 * Delete environment variable
 */
export async function deleteEnvVar(
  workspaceId: string,
  projectId: string,
  envId: string
): Promise<IntegrationResult<void>> {
  const client = await getVercelClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'Vercel integration not configured. Please add your Vercel token in Settings.',
    };
  }

  try {
    const response = await vercelFetch(client, `/v9/projects/${projectId}/env/${envId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Failed to delete environment variable',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to delete environment variable' };
  }
}

/**
 * Clear cached client
 */
export async function clearVercelClientCache(workspaceId?: string): Promise<void> {
  if (workspaceId) {
    clientCache.delete(workspaceId);
  } else {
    clientCache.clear();
  }
}
