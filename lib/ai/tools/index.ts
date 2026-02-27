/**
 * AI Tools Index
 * Exports all tools for use by chat and voice interfaces
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createReadTools } from './read-tools';
import { createWriteTools } from './write-tools';
import { createGitHubReadTools, createGitHubWriteTools } from './github-tools';
import { createVercelReadTools, createVercelWriteTools } from './vercel-tools';
import { createSupabaseReadTools, createSupabaseWriteTools } from './supabase-tools';
import { createMemoryTools } from './memory-tools';

export interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

/**
 * Admin-only tools that should be filtered out for non-admin users
 */
const ADMIN_ONLY_TOOLS = new Set([
  // Internal ERP tools
  'logPayment',
  'createProject',
  'bulkUpdateTasks',
  'createInvoice',
  // GitHub tools
  'mergeGitHubPR',
  // Vercel tools
  'promoteVercelDeployment',
  'deleteVercelEnvVar',
  // Supabase ops tools
  'executeProjectQuery',
  'applyProjectMigration',
]);

/**
 * Create all AI tools with Supabase client and user context
 */
export function createAllTools(
  supabase: SupabaseClient,
  workspaceId: string | null,
  user: UserInfo
) {
  const toolSets = [
    createReadTools(supabase, workspaceId),
    createWriteTools(supabase, workspaceId, user),
    createGitHubReadTools(workspaceId),
    createGitHubWriteTools(workspaceId),
    createVercelReadTools(workspaceId),
    createVercelWriteTools(workspaceId),
    createSupabaseReadTools(workspaceId),
    createSupabaseWriteTools(workspaceId),
    createMemoryTools(supabase, workspaceId, user.id),
  ];

  // Merge all tool sets, filtering out empty objects from null workspaceId
  const merged: Record<string, unknown> = {};
  for (const set of toolSets) {
    for (const [key, value] of Object.entries(set)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return merged as ReturnType<typeof createReadTools> & ReturnType<typeof createWriteTools>;
}

/**
 * Create AI tools with role-based filtering
 * Filters out admin-only tools for non-admin users
 */
export function createAgentTools(
  supabase: SupabaseClient,
  workspaceId: string | null,
  user: UserInfo
) {
  const allTools = createAllTools(supabase, workspaceId, user);

  // If user is admin, return all tools
  if (user.role === 'admin') {
    return allTools;
  }

  // Filter out admin-only tools for non-admin users
  const filteredTools = { ...allTools };
  for (const toolName of ADMIN_ONLY_TOOLS) {
    delete (filteredTools as Record<string, unknown>)[toolName];
  }

  return filteredTools;
}

// Re-export individual tool creators for flexibility
export { createReadTools } from './read-tools';
export { createWriteTools } from './write-tools';
export { createGitHubReadTools, createGitHubWriteTools } from './github-tools';
export { createVercelReadTools, createVercelWriteTools } from './vercel-tools';
export { createSupabaseReadTools, createSupabaseWriteTools } from './supabase-tools';
export { createMemoryTools } from './memory-tools';
