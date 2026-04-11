/**
 * Supabase Ops AI Tools
 * Read and write tools for client project database operations
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  listTables,
  getTableSchema,
  getRLSPolicies,
  executeReadQuery,
  executeMigration,
} from '@/lib/integrations/supabase-ops';

/**
 * Create read-only Supabase ops tools
 * These query CLIENT project databases, not the Qualia Suite database
 */
export function createSupabaseReadTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    listProjectTables: tool({
      description:
        'List tables in a client project\'s Supabase database. Use when user asks "show tables in X\'s database", "what tables does X have". This queries the CLIENT PROJECT database, not our Qualia Suite database.',
      inputSchema: z.object({
        project_id: z
          .string()
          .uuid()
          .describe('The Qualia project ID (not the Supabase project ID)'),
      }),
      execute: async ({ project_id }: { project_id: string }) => {
        const result = await listTables(workspaceId, project_id);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, tables: result.data };
      },
    }),

    getTableSchema: tool({
      description:
        'Get column definitions for a table in a client project\'s database. Use when user asks "describe users table", "what columns does X have".',
      inputSchema: z.object({
        project_id: z.string().uuid().describe('The Qualia project ID'),
        table_name: z.string().describe('Table name to describe'),
      }),
      execute: async ({ project_id, table_name }: { project_id: string; table_name: string }) => {
        const result = await getTableSchema(workspaceId, project_id, table_name);
        if (!result.success) return { error: result.error };
        return { table: table_name, columns: result.data };
      },
    }),

    checkRLSPolicies: tool({
      description:
        'Check RLS policies on a client project\'s database. Use when user asks "is RLS enabled?", "check security on X".',
      inputSchema: z.object({
        project_id: z.string().uuid().describe('The Qualia project ID'),
        table_name: z
          .string()
          .optional()
          .describe('Specific table to check (optional, checks all if omitted)'),
      }),
      execute: async ({ project_id, table_name }: { project_id: string; table_name?: string }) => {
        const result = await getRLSPolicies(workspaceId, project_id, table_name);
        if (!result.success) return { error: result.error };
        return { count: result.data?.length || 0, policies: result.data };
      },
    }),
  };
}

/**
 * Create write Supabase ops tools (admin only)
 */
export function createSupabaseWriteTools(workspaceId: string | null) {
  if (!workspaceId) return {};

  return {
    executeProjectQuery: tool({
      description:
        'Run a SELECT query on a client project\'s database (ADMIN ONLY). Only SELECT queries allowed. Use when user asks "run query on X\'s database", "count users in X".',
      inputSchema: z.object({
        project_id: z.string().uuid().describe('The Qualia project ID'),
        sql: z.string().describe('SQL SELECT query to execute'),
      }),
      execute: async ({ project_id, sql }: { project_id: string; sql: string }) => {
        const result = await executeReadQuery(workspaceId, project_id, sql);
        if (!result.success) return { error: result.error };
        const rows = result.data || [];
        return {
          rowCount: rows.length,
          rows,
          note: rows.length >= 100 ? 'Results limited to 100 rows' : undefined,
        };
      },
    }),

    applyProjectMigration: tool({
      description:
        'Apply a database migration to a client project\'s database (ADMIN ONLY). Use when user asks "add column to X", "create table in X\'s database".',
      inputSchema: z.object({
        project_id: z.string().uuid().describe('The Qualia project ID'),
        sql: z.string().describe('SQL DDL to execute'),
        name: z.string().describe('Migration name for tracking'),
      }),
      execute: async ({
        project_id,
        sql,
        name,
      }: {
        project_id: string;
        sql: string;
        name: string;
      }) => {
        const result = await executeMigration(workspaceId, project_id, sql, name);
        if (!result.success) return { error: result.error };
        return { message: `Migration "${name}" applied successfully`, ...result.data };
      },
    }),
  };
}
