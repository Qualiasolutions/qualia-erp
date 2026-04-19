'use server';

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/token-encryption';
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
    octokit: new Octokit({ auth: decryptToken(settings.encrypted_token) }),
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

    // 2. Create empty repo (works for both personal accounts and orgs)
    let newRepo;
    try {
      const { data: emptyRepo } = await client.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: config.description || `${config.projectType} project`,
        private: config.isPrivate ?? true,
        auto_init: true, // Creates with README
      });
      newRepo = emptyRepo;
    } catch (createError: unknown) {
      // If personal account fails, try org method
      if ((createError as { status?: number }).status === 422) {
        const { data: orgRepo } = await client.octokit.repos.createInOrg({
          org: client.org,
          name: repoName,
          description: config.description || `${config.projectType} project`,
          private: config.isPrivate ?? true,
          auto_init: true,
        });
        newRepo = orgRepo;
      } else {
        throw createError;
      }
    }

    // Wait for repo to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Update README with project-specific content
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
      return { success: false, error: `Organization "${client.org}" not found or inaccessible.` };
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
 * List repositories in the organization
 */
export async function listRepos(
  workspaceId: string,
  opts?: { sort?: 'updated' | 'created' | 'pushed'; per_page?: number }
): Promise<
  IntegrationResult<
    Array<{
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      updated_at: string;
      default_branch: string;
      private: boolean;
      open_issues_count: number;
    }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.repos.listForOrg({
      org: client.org,
      sort: opts?.sort || 'updated',
      per_page: opts?.per_page || 30,
    });

    return {
      success: true,
      data: data.map((repo) => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description ?? null,
        language: repo.language ?? null,
        updated_at: repo.updated_at ?? '',
        default_branch: repo.default_branch ?? 'main',
        private: repo.private,
        open_issues_count: repo.open_issues_count ?? 0,
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listRepos error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Organization "${client.org}" not found or inaccessible.` };
    }

    return { success: false, error: err.message || 'Failed to list repositories' };
  }
}

/**
 * Get a single repository by name
 */
export async function getRepo(
  workspaceId: string,
  repoName: string
): Promise<
  IntegrationResult<{
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    default_branch: string;
    open_issues_count: number;
    stargazers_count: number;
    forks_count: number;
    created_at: string;
    updated_at: string;
    private: boolean;
  }>
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.repos.get({
      owner: client.org,
      repo: repoName,
    });

    return {
      success: true,
      data: {
        name: data.name,
        full_name: data.full_name,
        html_url: data.html_url,
        description: data.description,
        language: data.language,
        default_branch: data.default_branch,
        open_issues_count: data.open_issues_count,
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
        private: data.private,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] getRepo error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to get repository' };
  }
}

/**
 * List branches in a repository
 */
export async function listBranches(
  workspaceId: string,
  repoName: string
): Promise<IntegrationResult<Array<{ name: string; protected: boolean }>>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.repos.listBranches({
      owner: client.org,
      repo: repoName,
      per_page: 100,
    });

    return {
      success: true,
      data: data.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listBranches error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to list branches' };
  }
}

/**
 * List commits in a repository
 */
export async function listCommits(
  workspaceId: string,
  repoName: string,
  opts?: { sha?: string; per_page?: number }
): Promise<
  IntegrationResult<
    Array<{ sha: string; message: string; author: string | null; date: string | null }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.repos.listCommits({
      owner: client.org,
      repo: repoName,
      sha: opts?.sha,
      per_page: opts?.per_page || 20,
    });

    return {
      success: true,
      data: data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || null,
        date: commit.commit.author?.date || null,
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listCommits error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to list commits' };
  }
}

/**
 * List pull requests in a repository
 */
export async function listPullRequests(
  workspaceId: string,
  repoName: string,
  state?: 'open' | 'closed' | 'all'
): Promise<
  IntegrationResult<
    Array<{
      number: number;
      title: string;
      state: string;
      user: string | null;
      created_at: string;
      updated_at: string;
      head_ref: string;
      base_ref: string;
    }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.pulls.list({
      owner: client.org,
      repo: repoName,
      state: state || 'open',
      per_page: 30,
    });

    return {
      success: true,
      data: data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user?.login || null,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        head_ref: pr.head.ref,
        base_ref: pr.base.ref,
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listPullRequests error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to list pull requests' };
  }
}

/**
 * Get a single pull request
 */
export async function getPullRequest(
  workspaceId: string,
  repoName: string,
  prNumber: number
): Promise<
  IntegrationResult<{
    number: number;
    title: string;
    body: string | null;
    state: string;
    mergeable: boolean | null;
    user: string | null;
    additions: number;
    deletions: number;
    changed_files: number;
    head_ref: string;
    base_ref: string;
    created_at: string;
    merged_at: string | null;
  }>
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.pulls.get({
      owner: client.org,
      repo: repoName,
      pull_number: prNumber,
    });

    return {
      success: true,
      data: {
        number: data.number,
        title: data.title,
        body: data.body,
        state: data.state,
        mergeable: data.mergeable,
        user: data.user?.login || null,
        additions: data.additions,
        deletions: data.deletions,
        changed_files: data.changed_files,
        head_ref: data.head.ref,
        base_ref: data.base.ref,
        created_at: data.created_at,
        merged_at: data.merged_at,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] getPullRequest error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Pull request #${prNumber} not found.` };
    }

    return { success: false, error: err.message || 'Failed to get pull request' };
  }
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  workspaceId: string,
  repoName: string,
  config: { title: string; body?: string; head: string; base: string }
): Promise<IntegrationResult<{ number: number; html_url: string; title: string }>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.pulls.create({
      owner: client.org,
      repo: repoName,
      ...config,
    });

    return {
      success: true,
      data: {
        number: data.number,
        html_url: data.html_url,
        title: data.title,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] createPullRequest error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }
    if (err.status === 422) {
      return { success: false, error: 'Invalid pull request configuration (check branch names).' };
    }

    return { success: false, error: err.message || 'Failed to create pull request' };
  }
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(
  workspaceId: string,
  repoName: string,
  prNumber: number,
  method?: 'merge' | 'squash' | 'rebase'
): Promise<IntegrationResult<{ merged: boolean; message: string }>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.pulls.merge({
      owner: client.org,
      repo: repoName,
      pull_number: prNumber,
      merge_method: method || 'squash',
    });

    return {
      success: true,
      data: {
        merged: data.merged,
        message: data.message,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] mergePullRequest error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Pull request #${prNumber} not found.` };
    }
    if (err.status === 422) {
      return {
        success: false,
        error: 'Pull request cannot be merged (conflicts or checks failing).',
      };
    }

    return { success: false, error: err.message || 'Failed to merge pull request' };
  }
}

/**
 * Add a comment to a pull request
 */
export async function commentOnPR(
  workspaceId: string,
  repoName: string,
  prNumber: number,
  body: string
): Promise<IntegrationResult<{ id: number; html_url: string }>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.issues.createComment({
      owner: client.org,
      repo: repoName,
      issue_number: prNumber,
      body,
    });

    return {
      success: true,
      data: {
        id: data.id,
        html_url: data.html_url,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] commentOnPR error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Pull request #${prNumber} not found.` };
    }

    return { success: false, error: err.message || 'Failed to add comment' };
  }
}

/**
 * List issues in a repository (excludes PRs)
 */
export async function listIssues(
  workspaceId: string,
  repoName: string,
  state?: 'open' | 'closed' | 'all'
): Promise<
  IntegrationResult<
    Array<{
      number: number;
      title: string;
      state: string;
      user: string | null;
      labels: string[];
      created_at: string;
    }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.issues.listForRepo({
      owner: client.org,
      repo: repoName,
      state: state || 'open',
      per_page: 30,
    });

    // Filter out PRs (issues with pull_request field)
    const issues = data.filter((issue) => !issue.pull_request);

    return {
      success: true,
      data: issues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: issue.user?.login || null,
        labels: issue.labels.map((label) => (typeof label === 'string' ? label : label.name || '')),
        created_at: issue.created_at,
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listIssues error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to list issues' };
  }
}

/**
 * Create an issue
 */
export async function createIssue(
  workspaceId: string,
  repoName: string,
  config: { title: string; body?: string; labels?: string[] }
): Promise<IntegrationResult<{ number: number; html_url: string; title: string }>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.issues.create({
      owner: client.org,
      repo: repoName,
      ...config,
    });

    return {
      success: true,
      data: {
        number: data.number,
        html_url: data.html_url,
        title: data.title,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] createIssue error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to create issue' };
  }
}

/**
 * List workflow runs for a repository
 */
export async function listWorkflowRuns(
  workspaceId: string,
  repoName: string,
  limit?: number
): Promise<
  IntegrationResult<
    Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      created_at: string;
      html_url: string;
      head_branch: string;
    }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const { data } = await client.octokit.actions.listWorkflowRunsForRepo({
      owner: client.org,
      repo: repoName,
      per_page: limit || 10,
    });

    return {
      success: true,
      data: data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name ?? 'unknown',
        status: run.status ?? 'unknown',
        conclusion: run.conclusion ?? null,
        created_at: run.created_at,
        html_url: run.html_url,
        head_branch: run.head_branch ?? 'unknown',
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] listWorkflowRuns error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" not found.` };
    }

    return { success: false, error: err.message || 'Failed to list workflow runs' };
  }
}

/**
 * Trigger a workflow dispatch event
 */
export async function triggerWorkflow(
  workspaceId: string,
  repoName: string,
  workflowFile: string,
  ref?: string
): Promise<IntegrationResult<void>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    await client.octokit.actions.createWorkflowDispatch({
      owner: client.org,
      repo: repoName,
      workflow_id: workflowFile,
      ref: ref || 'main',
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error: unknown) {
    console.error('[GitHub] triggerWorkflow error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Workflow "${workflowFile}" not found in "${repoName}".` };
    }

    return { success: false, error: err.message || 'Failed to trigger workflow' };
  }
}

/**
 * Search code across organization repositories
 */
export async function searchCode(
  workspaceId: string,
  query: string,
  repoName?: string
): Promise<
  IntegrationResult<
    Array<{ path: string; repository: string; html_url: string; text_matches?: string }>
  >
> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    const q = repoName ? `${query} repo:${client.org}/${repoName}` : `${query} org:${client.org}`;

    const { data } = await client.octokit.search.code({ q });

    return {
      success: true,
      data: data.items.map((item) => ({
        path: item.path,
        repository: item.repository.full_name,
        html_url: item.html_url,
        text_matches: item.text_matches?.map((match) => match.fragment).join('\n'),
      })),
    };
  } catch (error: unknown) {
    console.error('[GitHub] searchCode error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 422) {
      return { success: false, error: 'Invalid search query.' };
    }

    return { success: false, error: err.message || 'Failed to search code' };
  }
}

/**
 * Create a new branch from a reference
 */
export async function createBranch(
  workspaceId: string,
  repoName: string,
  branchName: string,
  fromRef?: string
): Promise<IntegrationResult<{ ref: string; sha: string }>> {
  const client = await getGitHubClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'GitHub integration not configured. Please add your GitHub token in Settings.',
    };
  }

  try {
    // 1. Get SHA of fromRef (default: HEAD of default branch)
    const baseRef = fromRef || 'main';
    const { data: refData } = await client.octokit.git.getRef({
      owner: client.org,
      repo: repoName,
      ref: `heads/${baseRef}`,
    });

    const sha = refData.object.sha;

    // 2. Create new ref
    const { data: newBranch } = await client.octokit.git.createRef({
      owner: client.org,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha,
    });

    return {
      success: true,
      data: {
        ref: newBranch.ref,
        sha: newBranch.object.sha,
      },
    };
  } catch (error: unknown) {
    console.error('[GitHub] createBranch error:', error);
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication failed. Please check your token.' };
    }
    if (err.status === 403) {
      return { success: false, error: 'GitHub rate limit exceeded. Please try again later.' };
    }
    if (err.status === 404) {
      return { success: false, error: `Repository "${repoName}" or base branch not found.` };
    }
    if (err.status === 422) {
      return { success: false, error: 'Branch already exists or invalid branch name.' };
    }

    return { success: false, error: err.message || 'Failed to create branch' };
  }
}

const WEBHOOK_URL = 'https://portal.qualiasolutions.net/api/github/webhook';

/**
 * Set up a push webhook for a single repo.
 * Idempotent — skips if webhook already exists.
 */
export async function setupRepoWebhook(
  workspaceId: string,
  repoFullName: string
): Promise<IntegrationResult<{ created: boolean }>> {
  const client = await getGitHubClient(workspaceId);
  if (!client) return { success: false, error: 'GitHub not configured' };

  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) return { success: false, error: 'Invalid repo name' };

  try {
    const { data: hooks } = await client.octokit.repos.listWebhooks({ owner, repo });
    if (hooks.some((h) => h.config.url === WEBHOOK_URL)) {
      return { success: true, data: { created: false } };
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    await client.octokit.repos.createWebhook({
      owner,
      repo,
      config: { url: WEBHOOK_URL, content_type: 'json', secret: webhookSecret },
      events: ['push'],
      active: true,
    });

    return { success: true, data: { created: true } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook setup failed';
    console.error(`[GitHub] setupRepoWebhook ${repoFullName}:`, msg);
    return { success: false, error: msg };
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
