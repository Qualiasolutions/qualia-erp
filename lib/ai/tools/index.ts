/**
 * AI Tools Index
 * Exports all tools for use by chat and voice interfaces
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createReadTools } from './read-tools';
import { createWriteTools } from './write-tools';

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
  'logPayment',
  'createProject',
  'bulkUpdateTasks',
  'createInvoice',
]);

/**
 * Create all AI tools with Supabase client and user context
 */
export function createAllTools(
  supabase: SupabaseClient,
  workspaceId: string | null,
  user: UserInfo
) {
  const readTools = createReadTools(supabase, workspaceId);
  const writeTools = createWriteTools(supabase, workspaceId, user);

  return {
    ...readTools,
    ...writeTools,
  };
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
