/**
 * GitHub AI Tools
 * Read and write tools for GitHub integration
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  listRepos,
  getRepo,
  listBranches,
  listCommits,
  listPullRequests,
  getPullRequest,
  createPullRequest,
  mergePullRequest,
  commentOnPR,
  listIssues,
  createIssue,
  listWorkflowRuns,
  triggerWorkflow,
  searchCode,
  createBranch,
} from '@/lib/integrations/github';

/**
 * Create read-only GitHub tools
 */
export function createGitHubReadTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    listGitHubRepos: tool({
      description:
        'List GitHub repositories. Use when user asks "show repos", "list projects on github", "our repositories".',
      inputSchema: z.object({
        sort: z
          .enum(['updated', 'created', 'pushed'])
          .optional()
          .describe('Sort order (default: updated)'),
        limit: z.number().optional().describe('Max results (default 30)'),
      }),
      execute: async ({
        sort,
        limit,
      }: {
        sort?: 'updated' | 'created' | 'pushed';
        limit?: number;
      }) => {
        const result = await listRepos(workspaceId, { sort, per_page: limit });
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, repos: result.data };
      },
    }),

    getGitHubRepoInfo: tool({
      description:
        'Get detailed info about a specific GitHub repository. Use when user asks about a particular repo.',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name (e.g. "my-project")'),
      }),
      execute: async ({ repo_name }: { repo_name: string }) => {
        const result = await getRepo(workspaceId, repo_name);
        if (!result.success) return { error: result.error };
        return result.data;
      },
    }),

    listGitHubBranches: tool({
      description:
        'List branches for a repository. Use when user asks "branches on X", "show branches".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
      }),
      execute: async ({ repo_name }: { repo_name: string }) => {
        const result = await listBranches(workspaceId, repo_name);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, branches: result.data };
      },
    }),

    listGitHubCommits: tool({
      description:
        'List recent commits for a repository. Use when user asks "recent commits", "what changed in X", "show commit history".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        branch: z.string().optional().describe('Branch name to filter (default: default branch)'),
        limit: z.number().optional().describe('Max results (default 20)'),
      }),
      execute: async ({
        repo_name,
        branch,
        limit,
      }: {
        repo_name: string;
        branch?: string;
        limit?: number;
      }) => {
        const result = await listCommits(workspaceId, repo_name, { sha: branch, per_page: limit });
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, commits: result.data };
      },
    }),

    listGitHubPullRequests: tool({
      description:
        'List pull requests for a repository. Use when user asks "open PRs", "show pull requests", "any PRs?".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        state: z
          .enum(['open', 'closed', 'all'])
          .optional()
          .describe('PR state filter (default: open)'),
      }),
      execute: async ({
        repo_name,
        state,
      }: {
        repo_name: string;
        state?: 'open' | 'closed' | 'all';
      }) => {
        const result = await listPullRequests(workspaceId, repo_name, state);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, pullRequests: result.data };
      },
    }),

    getGitHubPullRequest: tool({
      description:
        'Get details of a specific pull request. Use when user asks about "PR #5", "show PR details".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        pr_number: z.number().describe('Pull request number'),
      }),
      execute: async ({ repo_name, pr_number }: { repo_name: string; pr_number: number }) => {
        const result = await getPullRequest(workspaceId, repo_name, pr_number);
        if (!result.success) return { error: result.error };
        return result.data;
      },
    }),

    listGitHubIssues: tool({
      description:
        'List GitHub issues for a repository. Use when user asks "open issues", "show GitHub issues".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        state: z
          .enum(['open', 'closed', 'all'])
          .optional()
          .describe('Issue state filter (default: open)'),
      }),
      execute: async ({
        repo_name,
        state,
      }: {
        repo_name: string;
        state?: 'open' | 'closed' | 'all';
      }) => {
        const result = await listIssues(workspaceId, repo_name, state);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, issues: result.data };
      },
    }),

    getGitHubActionsStatus: tool({
      description:
        'Get GitHub Actions workflow run status. Use when user asks "CI status", "build passing?", "check Actions".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        limit: z.number().optional().describe('Max results (default 10)'),
      }),
      execute: async ({ repo_name, limit }: { repo_name: string; limit?: number }) => {
        const result = await listWorkflowRuns(workspaceId, repo_name, limit);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, runs: result.data };
      },
    }),

    searchGitHubCode: tool({
      description:
        'Search code across repositories. Use when user asks "find where X is used", "search for X in code".',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        repo_name: z.string().optional().describe('Limit search to specific repo'),
      }),
      execute: async ({ query, repo_name }: { query: string; repo_name?: string }) => {
        const result = await searchCode(workspaceId, query, repo_name);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, results: result.data };
      },
    }),
  };
}

/**
 * Create write GitHub tools (some admin-only)
 */
export function createGitHubWriteTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    createGitHubBranch: tool({
      description:
        'Create a new branch in a repository. Use when user says "create branch feat/X".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        branch_name: z.string().describe('New branch name'),
        from_ref: z.string().optional().describe('Source branch/ref (default: main)'),
      }),
      execute: async ({
        repo_name,
        branch_name,
        from_ref,
      }: {
        repo_name: string;
        branch_name: string;
        from_ref?: string;
      }) => {
        const result = await createBranch(workspaceId, repo_name, branch_name, from_ref);
        if (!result.success) return { error: result.error };
        return { message: `Branch "${branch_name}" created`, ...result.data };
      },
    }),

    createGitHubPR: tool({
      description: 'Create a pull request. Use when user says "open PR from feat/X to main".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        title: z.string().describe('PR title'),
        body: z.string().optional().describe('PR description'),
        head: z.string().describe('Source branch'),
        base: z.string().describe('Target branch (e.g. "main")'),
      }),
      execute: async ({
        repo_name,
        title,
        body,
        head,
        base,
      }: {
        repo_name: string;
        title: string;
        body?: string;
        head: string;
        base: string;
      }) => {
        const result = await createPullRequest(workspaceId, repo_name, { title, body, head, base });
        if (!result.success) return { error: result.error };
        return { message: `PR #${result.data?.number} created`, ...result.data };
      },
    }),

    commentOnGitHubPR: tool({
      description: 'Add a comment on a pull request. Use when user says "comment on PR #3".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        pr_number: z.number().describe('PR number'),
        body: z.string().describe('Comment text'),
      }),
      execute: async ({
        repo_name,
        pr_number,
        body,
      }: {
        repo_name: string;
        pr_number: number;
        body: string;
      }) => {
        const result = await commentOnPR(workspaceId, repo_name, pr_number, body);
        if (!result.success) return { error: result.error };
        return { message: 'Comment added', ...result.data };
      },
    }),

    createGitHubIssue: tool({
      description: 'Create a GitHub issue. Use when user says "create issue: fix login bug".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        title: z.string().describe('Issue title'),
        body: z.string().optional().describe('Issue description'),
        labels: z.array(z.string()).optional().describe('Labels to add'),
      }),
      execute: async ({
        repo_name,
        title,
        body,
        labels,
      }: {
        repo_name: string;
        title: string;
        body?: string;
        labels?: string[];
      }) => {
        const result = await createIssue(workspaceId, repo_name, { title, body, labels });
        if (!result.success) return { error: result.error };
        return { message: `Issue #${result.data?.number} created`, ...result.data };
      },
    }),

    triggerGitHubWorkflow: tool({
      description:
        'Trigger a GitHub Actions workflow. Use when user says "rerun CI", "trigger workflow".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        workflow_file: z.string().describe('Workflow filename (e.g. "ci.yml")'),
        ref: z.string().optional().describe('Branch to run on (default: main)'),
      }),
      execute: async ({
        repo_name,
        workflow_file,
        ref,
      }: {
        repo_name: string;
        workflow_file: string;
        ref?: string;
      }) => {
        const result = await triggerWorkflow(workspaceId, repo_name, workflow_file, ref);
        if (!result.success) return { error: result.error };
        return { message: `Workflow "${workflow_file}" triggered on ${ref || 'main'}` };
      },
    }),

    // Admin-only tools (filtered in index.ts)
    mergeGitHubPR: tool({
      description: 'Merge a pull request (ADMIN ONLY). Use when user says "merge PR #5".',
      inputSchema: z.object({
        repo_name: z.string().describe('Repository name'),
        pr_number: z.number().describe('PR number to merge'),
        method: z
          .enum(['merge', 'squash', 'rebase'])
          .optional()
          .describe('Merge method (default: squash)'),
      }),
      execute: async ({
        repo_name,
        pr_number,
        method,
      }: {
        repo_name: string;
        pr_number: number;
        method?: 'merge' | 'squash' | 'rebase';
      }) => {
        const result = await mergePullRequest(workspaceId, repo_name, pr_number, method);
        if (!result.success) return { error: result.error };
        return { message: `PR #${pr_number} merged`, ...result.data };
      },
    }),
  };
}
