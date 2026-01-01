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

// Re-export individual tool creators for flexibility
export { createReadTools } from './read-tools';
export { createWriteTools } from './write-tools';
