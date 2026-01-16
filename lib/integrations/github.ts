'use server';

import { createClient } from '@/lib/supabase/server';
import { Octokit } from '@octokit/rest';
import type { IntegrationResult, GitHubRepoConfig, GitHubRepoResult, GitHubConfig } from './types';
import type { ProjectType } from '@/types/database';

// =====================================================
// Lazy Initialization
// =====================================================

type GitHubClient = {
  octokit: Octokit;
  org: string;
  templates: Partial<Record<ProjectType, string>>;
};

const clientCache = new Map<string, GitHubClient>();

/**
 * Get or create GitHub client for a workspace
 */
async function getGitHubClient(workspaceId: string): Promise<GitHubClient | null> {
  // Check cache first
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId)!;
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'github')
    .single();

  if (!settings?.encrypted_token) {
    return null;
  }

  const config = settings.config as GitHubConfig | null;
  if (!config?.org) {
    return null;
  }

  const client: GitHubClient = {
    octokit: new Octokit({ auth: settings.encrypted_token }),
    org: config.org,
    templates: config.templates || {},
  };

  clientCache.set(workspaceId, client);
  return client;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Sanitize repository name (lowercase, alphanumeric + hyphens only)
 */
function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Generate README content for the repository
 */
function generateReadme(config: GitHubRepoConfig, clientName?: string): string {
  return `# ${config.name}

${config.description || 'A Qualia Solutions project.'}

## Project Type
- **Type**: ${config.projectType}
${clientName ? `- **Client**: ${clientName}` : ''}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Documentation

See the [Qualia Development Guide](https://docs.qualiasolutions.net) for more information.

---

Built with love by [Qualia Solutions](https://qualiasolutions.net)
`;
}

// =====================================================
// Main Functions
// =====================================================

/**
 * Check if a repository already exists
 */
export async function checkRepoExists(workspaceId: string, repoName: string): Promise<boolean> {
  const client = await getGitHubClient(workspaceId);
  if (!client) return false;

  try {
    await client.octokit.repos.get({
      owner: client.org,
      repo: sanitizeRepoName(repoName),
    });
    return true;
  } catch (error: unknown) {
    if ((error as { status?: number }).status === 404) return false;
    throw error;
  }
}

/**
 * Create repository from template
 */
export async function createRepository(
  workspaceId: string,
  config: GitHubRepoConfig,
  clientName?: string
): Promise<IntegrationResult<GitHubRepoResult>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  const repoName = sanitizeRepoName(config.name);

  // Get template name from config or use default
  const defaultTemplates: Record<ProjectType, string> = {
    web_design: 'qualia-website-template',
    ai_agent: 'qualia-ai-agent-template',
    voice_agent: 'qualia-voice-agent-template',
    seo: 'qualia-website-template',
    ads: 'qualia-website-template',
  };
  const templateName = client.templates[config.projectType] || defaultTemplates[config.projectType];

  try {
    // 1. Check if repo already exists (idempotency)
    const exists = await checkRepoExists(workspaceId, repoName);
    if (exists) {
      // Return existing repo info instead of failing
      const { data: existingRepo } = await client.octokit.repos.get({
        owner: client.org,
        repo: repoName,
      });

      return {
        success: true,
        data: {
          repoUrl: existingRepo.html_url,
          cloneUrl: existingRepo.ssh_url,
          defaultBranch: existingRepo.default_branch,
          repoName: `${client.org}/${repoName}`,
        },
      };
    }

    // 2. Create repo from template
    const { data: newRepo } = await client.octokit.repos.createUsingTemplate({
      template_owner: client.org,
      template_repo: templateName,
      owner: client.org,
      name: repoName,
      description: config.description || `${config.projectType} project`,
      private: config.isPrivate ?? true,
      include_all_branches: false,
    });

    // 3. Wait for repo to be ready (template copy can take a moment)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Update README with project-specific content
    try {
      const readmeContent = generateReadme(config, clientName);
      const base64Content = Buffer.from(readmeContent).toString('base64');

      // Get current README to get its SHA
      const { data: currentReadme } = await client.octokit.repos.getContent({
        owner: client.org,
        repo: repoName,
        path: 'README.md',
      });

      await client.octokit.repos.createOrUpdateFileContents({
        owner: client.org,
        repo: repoName,
        path: 'README.md',
        message: 'docs: initialize project README',
        content: base64Content,
        sha: (currentReadme as { sha: string }).sha,
      });
    } catch {
      // Non-fatal - log but continue
      console.warn('[GitHub] Failed to update README');
    }

    return {
      success: true,
      data: {
        repoUrl: newRepo.html_url,
        cloneUrl: newRepo.ssh_url,
        defaultBranch: newRepo.default_branch || 'main',
        repoName: `${client.org}/${repoName}`,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] createRepository error:', error);
    const err = error as { status?: number; message?: string };

    // Map common errors
    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Template repository "${templateName}" not found.` };
    }
    if (err.status === 422) {
      return { success: false, error: 'Repository name already exists or is invalid.' };
    }

    return { success: false, error: err.message || 'Failed to create GitHub repository' };
  }
}

/**
 * Test GitHub connection
 */
export async function testGitHubConnection(
  token: string,
  org: string
): Promise<IntegrationResult<{ login: string; name: string }>> {
  try {
    const octokit = new Octokit({ auth: token });

    // Verify token works
    const { data: user } = await octokit.users.getAuthenticated();

    // Verify org access
    try {
      await octokit.orgs.get({ org });
    } catch {
      return {
        success: false,
        error: `Cannot access organization "${org}". Make sure the token has org access.`,
      };
    }

    return {
      success: true,
      data: {
        login: user.login,
        name: user.name || user.login,
      },
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      return { success: false, error: 'Invalid GitHub token' };
    }
    return { success: false, error: err.message || 'Failed to connect to GitHub' };
  }
}

/**
 * Clear cached client (useful after settings update)
 */
export async function clearGitHubClientCache(workspaceId?: string): Promise<void> {
  if (workspaceId) {
    clientCache.delete(workspaceId);
  } else {
    clientCache.clear();
  }
}
