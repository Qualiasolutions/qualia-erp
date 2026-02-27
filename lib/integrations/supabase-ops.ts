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
 * Execute a read-only query on a client project's database (admin only)
 * Only SELECT queries are allowed
 */
export async function executeReadQuery(
  workspaceId: string,
  projectId: string,
  sql: string
): Promise<IntegrationResult<unknown[]>> {
  // Security: only allow SELECT statements
  const trimmed = sql.trim().toLowerCase();
  if (!trimmed.startsWith('select')) {
    return {
      success: false,
      error: 'Only SELECT queries are allowed. Use executeMigration for DDL operations.',
    };
  }

  // Block dangerous patterns
  const dangerous = [
    'drop ',
    'delete ',
    'truncate ',
    'alter ',
    'insert ',
    'update ',
    'create ',
    'grant ',
    'revoke ',
  ];
  if (dangerous.some((d) => trimmed.includes(d))) {
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
