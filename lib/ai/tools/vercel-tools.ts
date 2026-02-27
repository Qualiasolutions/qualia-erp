/**
 * Vercel AI Tools
 * Read and write tools for Vercel integration
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  listProjects,
  getProject,
  listDeployments,
  getDeploymentLogs,
  redeployProject,
  promoteDeployment,
  listDomains,
  addDomain,
  listEnvVars,
  upsertEnvVar,
  deleteEnvVar,
} from '@/lib/integrations/vercel';

/**
 * Create read-only Vercel tools
 */
export function createVercelReadTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    listVercelProjects: tool({
      description:
        'List all Vercel projects. Use when user asks "show vercel projects", "our deployments".',
      inputSchema: z.object({
        _placeholder: z.string().optional().describe('Not used'),
      }),
      execute: async () => {
        const result = await listProjects(workspaceId);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, projects: result.data };
      },
    }),

    getVercelProjectInfo: tool({
      description:
        'Get detailed info about a Vercel project including latest deployment. Use when user asks "status of X on vercel".',
      inputSchema: z.object({
        project_name: z.string().describe('Project name or ID'),
      }),
      execute: async ({ project_name }: { project_name: string }) => {
        const result = await getProject(workspaceId, project_name);
        if (!result.success) return { error: result.error };
        return result.data;
      },
    }),

    listVercelDeployments: tool({
      description:
        'List recent deployments for a project. Use when user asks "recent deployments", "deploy history", "what was deployed".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
        limit: z.number().optional().describe('Max results (default 10)'),
      }),
      execute: async ({ project_id, limit }: { project_id: string; limit?: number }) => {
        const result = await listDeployments(workspaceId, project_id, limit);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, deployments: result.data };
      },
    }),

    getVercelDeploymentLogs: tool({
      description:
        'Get build logs for a deployment. Use when user asks "show build logs", "why did deploy fail", "deployment errors".',
      inputSchema: z.object({
        deployment_id: z.string().describe('Deployment ID'),
      }),
      execute: async ({ deployment_id }: { deployment_id: string }) => {
        const result = await getDeploymentLogs(workspaceId, deployment_id);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, logs: result.data };
      },
    }),

    listVercelDomains: tool({
      description:
        'List domains for a Vercel project. Use when user asks "domains for X", "what domains".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
      }),
      execute: async ({ project_id }: { project_id: string }) => {
        const result = await listDomains(workspaceId, project_id);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, domains: result.data };
      },
    }),

    listVercelEnvVars: tool({
      description:
        'List environment variable NAMES (not values) for a project. Use when user asks "env vars on X", "what environment variables". NEVER returns values for security.',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
      }),
      execute: async ({ project_id }: { project_id: string }) => {
        const result = await listEnvVars(workspaceId, project_id);
        if (!result.success) return { error: result.error };
        return {
          count: result.data?.length || 0,
          envVars: result.data,
          note: 'Values are hidden for security',
        };
      },
    }),
  };
}

/**
 * Create write Vercel tools (some admin-only)
 */
export function createVercelWriteTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    redeployVercelProject: tool({
      description:
        'Trigger a redeployment of a Vercel project. Use when user says "redeploy X", "push to production".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
        target: z
          .enum(['production', 'preview'])
          .optional()
          .describe('Deploy target (default: production)'),
      }),
      execute: async ({
        project_id,
        target,
      }: {
        project_id: string;
        target?: 'production' | 'preview';
      }) => {
        const result = await redeployProject(workspaceId, project_id, target);
        if (!result.success) return { error: result.error };
        return { message: `Redeployment triggered`, ...result.data };
      },
    }),

    addVercelDomain: tool({
      description:
        'Add a custom domain to a Vercel project. Use when user says "add domain example.com to X".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
        domain: z.string().describe('Domain name (e.g. "example.com")'),
      }),
      execute: async ({ project_id, domain }: { project_id: string; domain: string }) => {
        const result = await addDomain(workspaceId, project_id, domain);
        if (!result.success) return { error: result.error };
        return { message: `Domain "${domain}" added`, ...result.data };
      },
    }),

    upsertVercelEnvVar: tool({
      description:
        'Set or update an environment variable on a Vercel project. Use when user says "set NEXT_PUBLIC_X on project".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
        key: z.string().describe('Environment variable name'),
        value: z.string().describe('Environment variable value'),
        targets: z.array(z.string()).optional().describe('Deployment targets (default: all)'),
      }),
      execute: async ({
        project_id,
        key,
        value,
        targets,
      }: {
        project_id: string;
        key: string;
        value: string;
        targets?: string[];
      }) => {
        const result = await upsertEnvVar(workspaceId, project_id, key, value, targets);
        if (!result.success) return { error: result.error };
        return { message: `Environment variable "${key}" set`, ...result.data };
      },
    }),

    // Admin-only tools (filtered in index.ts)
    promoteVercelDeployment: tool({
      description:
        'Promote a preview deployment to production (ADMIN ONLY). Use when user says "promote this deploy".',
      inputSchema: z.object({
        deployment_id: z.string().describe('Deployment ID to promote'),
      }),
      execute: async ({ deployment_id }: { deployment_id: string }) => {
        const result = await promoteDeployment(workspaceId, deployment_id);
        if (!result.success) return { error: result.error };
        return { message: 'Deployment promoted to production', ...result.data };
      },
    }),

    deleteVercelEnvVar: tool({
      description:
        'Delete an environment variable from a Vercel project (ADMIN ONLY). Use when user says "remove env var X".',
      inputSchema: z.object({
        project_id: z.string().describe('Vercel project ID'),
        env_id: z.string().describe('Environment variable ID'),
      }),
      execute: async ({ project_id, env_id }: { project_id: string; env_id: string }) => {
        const result = await deleteEnvVar(workspaceId, project_id, env_id);
        if (!result.success) return { error: result.error };
        return { message: 'Environment variable deleted' };
      },
    }),
  };
}
