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
 * Clear cached client
 */
export async function clearVercelClientCache(workspaceId?: string): Promise<void> {
  if (workspaceId) {
    clientCache.delete(workspaceId);
  } else {
    clientCache.clear();
  }
}
