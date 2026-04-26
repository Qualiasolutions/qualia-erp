import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope, type AuthResult } from '@/lib/api-auth';

/**
 * Qualia ERP — Remote MCP Server
 *
 * Exposes a read-only view of the ERP for Claude connectors and other
 * MCP-speaking clients. Auth reuses the qlt_* bearer-token system from
 * `/api/v1/reports`. Tokens must carry scope `mcp:read` (or `*`).
 *
 * Endpoint: POST /api/mcp/mcp (streamable HTTP — current MCP spec)
 *
 * To register with Claude.ai: add a Custom Connector pointing at
 * https://portal.qualiasolutions.net/api/mcp/mcp with the bearer token.
 *
 * Scopes:
 *   mcp:read  — required for all read tools (list_*, get_*, whoami)
 *   mcp:write — required for mutation tools (create_*, update_*, log_*)
 *   *         — grants both
 */

type ToolText = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function jsonText(value: unknown): ToolText {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function errorText(message: string): ToolText {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

function requireWrite(authInfo: { scopes?: string[] } | undefined): string | null {
  const scopes = authInfo?.scopes ?? [];
  if (scopes.includes('*') || scopes.includes('mcp:write')) return null;
  return 'This tool requires mcp:write scope. Current scopes: ' + scopes.join(', ');
}

async function resolveWorkspaceId(profileId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id, is_default')
    .eq('profile_id', profileId)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      'whoami',
      'Returns the authenticated profile and scope for the current bearer token.',
      {},
      async (_args, { authInfo }) => {
        const profileId = authInfo?.extra?.profileId as string | undefined;
        const supabase = createAdminClient();
        if (!profileId) {
          return jsonText({
            authenticated: true,
            method: authInfo?.extra?.method,
            scope: authInfo?.scopes,
          });
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', profileId)
          .maybeSingle();
        return jsonText({
          authenticated: true,
          method: authInfo?.extra?.method,
          scope: authInfo?.scopes,
          profile,
        });
      }
    );

    server.tool(
      'list_projects',
      'List projects with optional status filter. Returns id, name, status, target_date, client.',
      {
        status: z
          .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled', 'Done'])
          .optional()
          .describe('Filter by project status'),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ status, limit }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from('projects')
          .select(
            'id, name, status, start_date, target_date, project_type, client:clients(id, name)'
          )
          .order('created_at', { ascending: false })
          .limit(limit);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) return jsonText({ error: error.message });
        return jsonText({ count: data?.length ?? 0, projects: data ?? [] });
      }
    );

    server.tool(
      'list_tasks',
      'List tasks. Filter by project_id, assignee_id, or status.',
      {
        project_id: z.string().uuid().optional(),
        assignee_id: z.string().uuid().optional(),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ project_id, assignee_id, status, limit }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, assignee_id, project_id, project:projects(id, name)'
          )
          .order('created_at', { ascending: false })
          .limit(limit);
        if (project_id) query = query.eq('project_id', project_id);
        if (assignee_id) query = query.eq('assignee_id', assignee_id);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) return jsonText({ error: error.message });
        return jsonText({ count: data?.length ?? 0, tasks: data ?? [] });
      }
    );

    server.tool(
      'list_clients',
      'List clients with optional lead_status filter.',
      {
        lead_status: z
          .enum(['dropped', 'cold', 'hot', 'active_client', 'inactive_client', 'dead_lead'])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ lead_status, limit }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from('clients')
          .select('id, name, display_name, phone, website, lead_status, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (lead_status) query = query.eq('lead_status', lead_status);
        const { data, error } = await query;
        if (error) return jsonText({ error: error.message });
        return jsonText({ count: data?.length ?? 0, clients: data ?? [] });
      }
    );

    server.tool(
      'list_meetings',
      'List meetings, defaulting to upcoming. Set past=true to query historical.',
      {
        past: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
      },
      async ({ past, limit }) => {
        const supabase = createAdminClient();
        const nowIso = new Date().toISOString();
        const builder = supabase
          .from('meetings')
          .select('id, title, start_time, end_time, meeting_link, project_id, client_id');
        const filtered = past
          ? builder.lt('start_time', nowIso)
          : builder.gte('start_time', nowIso);
        const { data, error } = await filtered
          .order('start_time', { ascending: !past })
          .limit(limit);
        if (error) return jsonText({ error: error.message });
        return jsonText({ count: data?.length ?? 0, meetings: data ?? [] });
      }
    );

    server.tool(
      'create_task',
      'Create a task. Requires mcp:write scope. Workspace is resolved from the token owner.',
      {
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        project_id: z.string().uuid().optional(),
        assignee_id: z.string().uuid().optional(),
        priority: z.enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low']).default('Medium'),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']).default('Todo'),
        due_date: z.string().date().optional().describe('YYYY-MM-DD'),
      },
      async (args, { authInfo }) => {
        const denied = requireWrite(authInfo);
        if (denied) return errorText(denied);

        const profileId = authInfo?.extra?.profileId as string | undefined;
        if (!profileId) return errorText('Token has no associated profile (legacy key?).');

        const workspaceId = args.project_id ? null : await resolveWorkspaceId(profileId);

        const supabase = createAdminClient();
        let resolvedWorkspaceId = workspaceId;
        if (args.project_id && !resolvedWorkspaceId) {
          const { data: project } = await supabase
            .from('projects')
            .select('workspace_id')
            .eq('id', args.project_id)
            .maybeSingle();
          resolvedWorkspaceId = project?.workspace_id ?? null;
        }
        if (!resolvedWorkspaceId) {
          return errorText('Could not resolve a workspace for this token owner.');
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title: args.title,
            description: args.description ?? null,
            project_id: args.project_id ?? null,
            assignee_id: args.assignee_id ?? null,
            priority: args.priority,
            status: args.status,
            due_date: args.due_date ?? null,
            creator_id: profileId,
            workspace_id: resolvedWorkspaceId,
          })
          .select('id, title, status, project_id, assignee_id')
          .single();

        if (error) return errorText(error.message);
        return jsonText({ created: true, task: data });
      }
    );

    server.tool(
      'update_task_status',
      'Update a task status. Requires mcp:write scope.',
      {
        task_id: z.string().uuid(),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']),
      },
      async ({ task_id, status }, { authInfo }) => {
        const denied = requireWrite(authInfo);
        if (denied) return errorText(denied);

        const supabase = createAdminClient();
        const update: { status: typeof status; completed_at?: string | null } = { status };
        if (status === 'Done') update.completed_at = new Date().toISOString();
        if (status !== 'Done') update.completed_at = null;

        const { data, error } = await supabase
          .from('tasks')
          .update(update)
          .eq('id', task_id)
          .select('id, title, status, completed_at')
          .single();

        if (error) return errorText(error.message);
        return jsonText({ updated: true, task: data });
      }
    );

    server.tool(
      'log_client_activity',
      'Append a client activity entry (call, email, meeting, note). Requires mcp:write scope.',
      {
        client_id: z.string().uuid(),
        type: z.enum(['call', 'email', 'meeting', 'note', 'status_change']),
        description: z.string().min(1).max(5000),
      },
      async ({ client_id, type, description }, { authInfo }) => {
        const denied = requireWrite(authInfo);
        if (denied) return errorText(denied);

        const profileId = authInfo?.extra?.profileId as string | undefined;
        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from('client_activities')
          .insert({
            client_id,
            type,
            description,
            created_by: profileId ?? null,
          })
          .select('id, type, description, created_at')
          .single();

        if (error) return errorText(error.message);
        return jsonText({ logged: true, activity: data });
      }
    );

    server.tool(
      'get_session_reports',
      'Fetch recent qualia-framework session reports (excludes dry_run by default).',
      {
        project_name: z.string().optional().describe('Filter by framework project name'),
        include_dry_run: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
      },
      async ({ project_name, include_dry_run, limit }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from('session_reports')
          .select(
            'id, client_report_id, project_name, milestone, phase, phase_name, status, verification, tasks_done, tasks_total, deployed_url, submitted_by, submitted_at, dry_run'
          )
          .order('submitted_at', { ascending: false })
          .limit(limit);
        if (!include_dry_run) query = query.neq('dry_run', true);
        if (project_name) query = query.eq('project_name', project_name);
        const { data, error } = await query;
        if (error) return jsonText({ error: error.message });
        return jsonText({ count: data?.length ?? 0, reports: data ?? [] });
      }
    );
  },
  {
    serverInfo: { name: 'qualia-erp', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp',
    maxDuration: 60,
    // Modern MCP clients (Claude.ai, Cursor, etc.) all use streamable HTTP.
    // SSE is deprecated by the spec and would require Redis for session
    // persistence on serverless — we don't need it.
    disableSse: true,
    verboseLogs: process.env.NODE_ENV !== 'production',
  }
);

/**
 * Bridge our existing api-auth module to the MCP handler's AuthInfo shape.
 * We re-issue authenticateRequest against a synthetic NextRequest-shaped
 * wrapper since mcp-handler hands us a plain Request.
 */
async function verifyToken(req: Request, bearer?: string) {
  if (!bearer) return undefined;
  // authenticateRequest reads from headers — passthrough is sufficient.
  const fakeReq = {
    headers: req.headers,
  } as unknown as Parameters<typeof authenticateRequest>[0];
  const auth: AuthResult = await authenticateRequest(fakeReq);
  if (!auth.ok) return undefined;
  if (!hasScope(auth, 'mcp:read')) return undefined;

  return {
    token: bearer,
    scopes: auth.scope.split(/\s+/).filter(Boolean),
    clientId: auth.method === 'per_user_token' ? auth.tokenId : 'legacy',
    extra: {
      method: auth.method,
      profileId: auth.method === 'per_user_token' ? auth.profileId : null,
    },
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  requiredScopes: ['mcp:read'],
});

export { handler as GET, handler as POST, handler as DELETE };
