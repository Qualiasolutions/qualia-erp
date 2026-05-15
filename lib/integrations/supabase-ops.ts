'use server';

import { createClient } from '@/lib/supabase/server';
import type { IntegrationResult } from './types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// =====================================================
// Types
// =====================================================

interface ProjectSupabaseCredentials {
  url: string;
  serviceKey: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get Supabase credentials for a client project
 * Looks in projects.metadata JSONB for supabase_url and supabase_service_key
 */
async function getProjectCredentials(
  workspaceId: string,
  projectId: string
): Promise<ProjectSupabaseCredentials | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('metadata')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!project?.metadata) return null;

  const meta = project.metadata as Record<string, unknown>;
  const url = meta.supabase_url as string | undefined;
  const serviceKey = meta.supabase_service_key as string | undefined;

  if (!url || !serviceKey) return null;

  return { url, serviceKey };
}

/**
 * Create a Supabase client for a client project's database
 */
function createProjectClient(creds: ProjectSupabaseCredentials) {
  return createSupabaseClient(creds.url, creds.serviceKey, {
    auth: { persistSession: false },
  });
}

// =====================================================
// Main Functions
// =====================================================

/**
 * List tables in a client project's database
 */
export async function listTables(
  workspaceId: string,
  projectId: string
): Promise<IntegrationResult<Array<{ table_name: string; row_count: number | null }>>> {
  const creds = await getProjectCredentials(workspaceId, projectId);
  if (!creds) {
    return {
      success: false,
      error:
        'Supabase credentials not configured for this project. Add supabase_url and supabase_service_key to project metadata.',
    };
  }

  try {
    const client = createProjectClient(creds);
    const { data, error } = await client.rpc('exec_sql', {
      query: `SELECT tablename as table_name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    });

    // Fallback: query information_schema directly
    if (error) {
      const { data: tables, error: err2 } = await client
        .from('information_schema.tables' as never)
        .select('table_name')
        .eq('table_schema', 'public');

      if (err2) {
        return { success: false, error: `Failed to list tables: ${err2.message}` };
      }

      return {
        success: true,
        data: (tables || []).map((t: { table_name: string }) => ({
          table_name: t.table_name,
          row_count: null,
        })),
      };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'Failed to list tables' };
  }
}

/**
 * Get table schema (columns, types, constraints)
 */
export async function getTableSchema(
  workspaceId: string,
  projectId: string,
  tableName: string
): Promise<
  IntegrationResult<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >
> {
  const creds = await getProjectCredentials(workspaceId, projectId);
  if (!creds) {
    return { success: false, error: 'Supabase credentials not configured for this project.' };
  }

  try {
    const client = createProjectClient(creds);

    // Use PostgREST to query information_schema
    const { data, error } = await client
      .from('information_schema.columns' as never)
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position' as never);

    if (error) {
      return { success: false, error: `Failed to get schema: ${error.message}` };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'Failed to get table schema' };
  }
}

/**
 * Get RLS policies for a table
 */
export async function getRLSPolicies(
  workspaceId: string,
  projectId: string,
  tableName?: string
): Promise<
  IntegrationResult<
    Array<{ table_name: string; policy_name: string; command: string; definition: string }>
  >
> {
  const creds = await getProjectCredentials(workspaceId, projectId);
  if (!creds) {
    return { success: false, error: 'Supabase credentials not configured for this project.' };
  }

  try {
    const client = createProjectClient(creds);

    // Whitelist table name to prevent SQL injection — must be a valid SQL identifier
    if (tableName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return { success: false, error: 'Invalid table name: must be a valid SQL identifier' };
    }

    // Query pg_policies view
    let query = `
      SELECT schemaname, tablename as table_name, policyname as policy_name,
             cmd as command, qual as definition
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    if (tableName) {
      query += ` AND tablename = '${tableName.replace(/'/g, "''")}'`;
    }
    query += ' ORDER BY tablename, policyname';

    const { data, error } = await client.rpc('exec_sql', { query });

    if (error) {
      // Return a helpful message if RPC doesn't exist
      return {
        success: false,
        error:
          'Could not query RLS policies. The project may need an exec_sql function or direct database access.',
      };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'Failed to get RLS policies' };
  }
}

/**
 * Execute a read-only query on a client project's database (admin only).
 * Only SELECT queries are allowed.
 *
 * DEFENSE-IN-DEPTH NOTE: The regex checks below are best-effort guards against
 * accidental misuse — they are NOT a strong security boundary. The real fix is
 * to connect via a read-only Postgres role and/or issue
 * `SET TRANSACTION READ ONLY` before executing. Until that is in place, this
 * validation layer catches the most common injection/abuse patterns.
 */
export async function executeReadQuery(
  workspaceId: string,
  projectId: string,
  sql: string
): Promise<IntegrationResult<unknown[]>> {
  // Reject SQL comments — they can mask keywords from naive scanners
  if (/--|\/\*|\*\//.test(sql)) {
    return { success: false, error: 'SQL comments are not allowed' };
  }

  // Reject multi-statement queries (semicolons outside trailing whitespace)
  const trimmedSql = sql.trim().replace(/;+$/, '');
  if (trimmedSql.includes(';')) {
    return { success: false, error: 'Multi-statement queries are not allowed' };
  }

  // Must start with SELECT (case-insensitive, after trim)
  const lower = trimmedSql.toLowerCase();
  if (!/^select\b/.test(lower)) {
    return {
      success: false,
      error: 'Only SELECT queries are allowed. Use executeMigration for DDL operations.',
    };
  }

  // Word-boundary regex blocklist — catches `drop ` but not 'drop' inside a string literal.
  // Best-effort; the real defense is a read-only Postgres role + SET TRANSACTION READ ONLY.
  const FORBIDDEN_KEYWORDS = [
    'drop',
    'delete',
    'truncate',
    'alter',
    'insert',
    'update',
    'create',
    'grant',
    'revoke',
    // Side-effect / privilege-escalation functions
    'pg_terminate_backend',
    'pg_cancel_backend',
    'set_config',
    // PL/pgSQL blocks
    'execute',
  ];
  const wordBoundary = new RegExp(`\\b(${FORBIDDEN_KEYWORDS.join('|')})\\b`, 'i');
  // 'do $$' is special-cased because '$' isn't a word character
  if (wordBoundary.test(lower) || /\bdo\s*\$\$/i.test(lower)) {
    return {
      success: false,
      error: 'Query contains forbidden keywords. Only SELECT queries are allowed.',
    };
  }

  const creds = await getProjectCredentials(workspaceId, projectId);
  if (!creds) {
    return { success: false, error: 'Supabase credentials not configured for this project.' };
  }

  try {
    const client = createProjectClient(creds);
    const { data, error } = await client.rpc('exec_sql', { query: sql });

    if (error) {
      return { success: false, error: `Query failed: ${error.message}` };
    }

    // Limit results to prevent massive payloads
    const results = Array.isArray(data) ? data.slice(0, 100) : data;
    return { success: true, data: results as unknown[] };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'Query execution failed' };
  }
}

/**
 * Execute a migration (DDL) on a client project's database (admin only)
 */
export async function executeMigration(
  workspaceId: string,
  projectId: string,
  sql: string,
  name: string
): Promise<IntegrationResult<{ name: string; applied: boolean }>> {
  const creds = await getProjectCredentials(workspaceId, projectId);
  if (!creds) {
    return { success: false, error: 'Supabase credentials not configured for this project.' };
  }

  try {
    const client = createProjectClient(creds);
    const { error } = await client.rpc('exec_sql', { query: sql });

    if (error) {
      return { success: false, error: `Migration failed: ${error.message}` };
    }

    return { success: true, data: { name, applied: true } };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'Migration execution failed' };
  }
}
