import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope, type AuthResult } from '@/lib/api-auth';
import { mcpRateLimiter } from '@/lib/rate-limit';

/**
 * Qualia ERP — Remote MCP Server
 *
 * Exposes the ERP to Claude connectors and the qualia-framework. Auth reuses
 * the qlt_* bearer-token system from `/api/v1/reports`. Tokens must carry
 * `mcp:read` (read tools) and/or `mcp:write` (mutations).
 *
 * Endpoint: POST /api/mcp/mcp (streamable HTTP — current MCP spec).
 *
 * Scoping (matches the server-action access model):
 *  - Client-role tokens are rejected entirely; clients use the portal UI.
 *  - Every read query is filtered by the token owner's workspace_id.
 *  - Mutations verify the target row's workspace_id before writing.
 */

const ALLOWED_TRANSPORT = 'mcp';

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

type AuthContext = {
  profileId: string;
  workspaceId: string;
  role: 'admin' | 'employee';
};

/**
 * Resolve the token owner's workspace + role. Cached on the authInfo.extra
 * object so repeated tool calls in the same request don't re-query.
 */
async function getAuthContext(
  authInfo: { extra?: Record<string, unknown> } | undefined
): Promise<AuthContext | { error: string }> {
  const cached = authInfo?.extra?.context as AuthContext | undefined;
  if (cached) return cached;

  const profileId = authInfo?.extra?.profileId as string | undefined;
  if (!profileId) {
    return { error: 'Token has no associated profile (legacy key not allowed on MCP).' };
  }

  const supabase = createAdminClient();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', profileId).maybeSingle(),
    supabase
      .from('workspace_members')
      .select('workspace_id, is_default')
      .eq('profile_id', profileId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile?.role) return { error: 'Profile not found.' };
  if (profile.role === 'client') {
    return { error: 'Client-role tokens cannot use the MCP server.' };
  }
  if (!membership?.workspace_id) {
    return { error: 'No workspace membership for this profile.' };
  }

  const ctx: AuthContext = {
    profileId,
    workspaceId: membership.workspace_id,
    role: profile.role as 'admin' | 'employee',
  };
  if (authInfo?.extra) authInfo.extra.context = ctx;
  return ctx;
}

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      'whoami',
      'Returns the authenticated profile, role, and workspace for the current bearer token.',
      {},
      async (_args, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', ctx.profileId)
          .maybeSingle();
        return jsonText({
          authenticated: true,
          method: authInfo?.extra?.method,
          scope: authInfo?.scopes,
          workspace_id: ctx.workspaceId,
          profile,
        });
      }
    );

    server.tool(
      'list_projects',
      "List projects in the token owner's workspace. Optional status filter.",
      {
        status: z
          .enum(['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled', 'Done'])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ status, limit }, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        let query = supabase
          .from('projects')
          .select(
            'id, name, status, start_date, target_date, project_type, client:clients(id, name)'
          )
          .eq('workspace_id', ctx.workspaceId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) return errorText(error.message);
        return jsonText({ count: data?.length ?? 0, projects: data ?? [] });
      }
    );

    server.tool(
      'list_tasks',
      "List tasks in the token owner's workspace. Filter by project_id, assignee_id, status.",
      {
        project_id: z.string().uuid().optional(),
        assignee_id: z.string().uuid().optional(),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']).optional(),
        mine_only: z
          .boolean()
          .default(false)
          .describe('If true, only tasks assigned to the token owner.'),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ project_id, assignee_id, status, mine_only, limit }, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        let query = supabase
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, assignee_id, project_id, project:projects(id, name)'
          )
          .eq('workspace_id', ctx.workspaceId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (project_id) query = query.eq('project_id', project_id);
        if (assignee_id) query = query.eq('assignee_id', assignee_id);
        if (status) query = query.eq('status', status);
        if (mine_only) query = query.eq('assignee_id', ctx.profileId);
        const { data, error } = await query;
        if (error) return errorText(error.message);
        return jsonText({ count: data?.length ?? 0, tasks: data ?? [] });
      }
    );

    server.tool(
      'list_clients',
      "List clients in the token owner's workspace. Optional lead_status filter.",
      {
        lead_status: z
          .enum(['dropped', 'cold', 'hot', 'active_client', 'inactive_client', 'dead_lead'])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ lead_status, limit }, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        let query = supabase
          .from('clients')
          .select('id, name, display_name, phone, website, lead_status, created_at')
          .eq('workspace_id', ctx.workspaceId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (lead_status) query = query.eq('lead_status', lead_status);
        const { data, error } = await query;
        if (error) return errorText(error.message);
        return jsonText({ count: data?.length ?? 0, clients: data ?? [] });
      }
    );

    server.tool(
      'list_meetings',
      "List meetings in the token owner's workspace, defaulting to upcoming.",
      {
        past: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
      },
      async ({ past, limit }, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        const nowIso = new Date().toISOString();
        const builder = supabase
          .from('meetings')
          .select('id, title, start_time, end_time, meeting_link, project_id, client_id')
          .eq('workspace_id', ctx.workspaceId);
        const filtered = past
          ? builder.lt('start_time', nowIso)
          : builder.gte('start_time', nowIso);
        const { data, error } = await filtered
          .order('start_time', { ascending: !past })
          .limit(limit);
        if (error) return errorText(error.message);
        return jsonText({ count: data?.length ?? 0, meetings: data ?? [] });
      }
    );

    server.tool(
      'create_task',
      "Create a task in the token owner's workspace. Requires mcp:write.",
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
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();

        // If a project is specified, verify it belongs to the same workspace.
        if (args.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('workspace_id')
            .eq('id', args.project_id)
            .maybeSingle();
          if (!project) return errorText('Project not found.');
          if (project.workspace_id !== ctx.workspaceId) {
            return errorText('Project belongs to a different workspace.');
          }
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
            creator_id: ctx.profileId,
            workspace_id: ctx.workspaceId,
          })
          .select('id, title, status, project_id, assignee_id')
          .single();

        if (error) return errorText(error.message);
        return jsonText({ created: true, task: data });
      }
    );

    server.tool(
      'update_task_status',
      'Update a task status. Requires mcp:write. Verifies the task is in your workspace.',
      {
        task_id: z.string().uuid(),
        status: z.enum(['Todo', 'In Progress', 'Done', 'Canceled']),
      },
      async ({ task_id, status }, { authInfo }) => {
        const denied = requireWrite(authInfo);
        if (denied) return errorText(denied);
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        const { data: existing } = await supabase
          .from('tasks')
          .select('id, workspace_id')
          .eq('id', task_id)
          .maybeSingle();
        if (!existing) return errorText('Task not found.');
        if (existing.workspace_id !== ctx.workspaceId) {
          return errorText('Task belongs to a different workspace.');
        }

        const update: { status: typeof status; completed_at: string | null } = {
          status,
          completed_at: status === 'Done' ? new Date().toISOString() : null,
        };

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
      'Append a client activity entry. Requires mcp:write. Verifies the client is in your workspace.',
      {
        client_id: z.string().uuid(),
        type: z.enum(['call', 'email', 'meeting', 'note', 'status_change']),
        description: z.string().min(1).max(5000),
      },
      async ({ client_id, type, description }, { authInfo }) => {
        const denied = requireWrite(authInfo);
        if (denied) return errorText(denied);
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        const { data: client } = await supabase
          .from('clients')
          .select('id, workspace_id')
          .eq('id', client_id)
          .maybeSingle();
        if (!client) return errorText('Client not found.');
        if (client.workspace_id !== ctx.workspaceId) {
          return errorText('Client belongs to a different workspace.');
        }

        const { data, error } = await supabase
          .from('client_activities')
          .insert({
            client_id,
            type,
            description,
            created_by: ctx.profileId,
          })
          .select('id, type, description, created_at')
          .single();

        if (error) return errorText(error.message);
        return jsonText({ logged: true, activity: data });
      }
    );

    server.tool(
      'get_session_reports',
      'Recent qualia-framework session reports for the workspace (excludes dry_run).',
      {
        project_name: z.string().optional(),
        include_dry_run: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
      },
      async ({ project_name, include_dry_run, limit }, { authInfo }) => {
        const ctx = await getAuthContext(authInfo);
        if ('error' in ctx) return errorText(ctx.error);

        const supabase = createAdminClient();
        // session_reports do not have workspace_id directly; scope through
        // framework_project_id → projects.workspace_id when present, fall
        // back to the join via project_name match for legacy rows.
        const { data: workspaceProjectIds } = await supabase
          .from('projects')
          .select('id, name')
          .eq('workspace_id', ctx.workspaceId);
        const ids = (workspaceProjectIds ?? []).map((p) => p.id);
        const names = (workspaceProjectIds ?? []).map((p) => p.name);

        let query = supabase
          .from('session_reports')
          .select(
            'id, client_report_id, project_name, framework_project_id, milestone, phase, phase_name, status, verification, tasks_done, tasks_total, deployed_url, submitted_by, submitted_at, dry_run'
          )
          .or(
            [
              ids.length ? `framework_project_id.in.(${ids.join(',')})` : null,
              names.length ? `project_name.in.(${names.map((n) => `"${n}"`).join(',')})` : null,
            ]
              .filter(Boolean)
              .join(',') || 'id.eq.00000000-0000-0000-0000-000000000000'
          )
          .order('submitted_at', { ascending: false })
          .limit(limit);
        if (!include_dry_run) query = query.neq('dry_run', true);
        if (project_name) query = query.eq('project_name', project_name);
        const { data, error } = await query;
        if (error) return errorText(error.message);
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
    disableSse: true,
    verboseLogs: process.env.NODE_ENV !== 'production',
  }
);

async function verifyToken(req: Request, bearer?: string) {
  if (!bearer) return undefined;
  const fakeReq = { headers: req.headers } as unknown as Parameters<typeof authenticateRequest>[0];
  const auth: AuthResult = await authenticateRequest(fakeReq);
  if (!auth.ok) return undefined;
  if (!hasScope(auth, 'mcp:read')) return undefined;
  if (auth.method !== 'per_user_token') return undefined;

  return {
    token: bearer,
    scopes: auth.scope.split(/\s+/).filter(Boolean),
    clientId: auth.tokenId,
    extra: {
      method: auth.method,
      profileId: auth.profileId,
    },
  };
}

const authenticated = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  requiredScopes: ['mcp:read'],
});

/**
 * Outer wrapper: validates the [transport] segment and applies a per-token
 * rate limit before handing off to mcp-handler.
 */
async function handler(req: Request, ctx: { params: Promise<{ transport: string }> }) {
  const { transport } = await ctx.params;
  if (transport !== ALLOWED_TRANSPORT) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Rate-limit by bearer token (anonymous → IP-ish fallback so unauth floods
  // are still throttled before we even hit the auth check).
  const bearer = req.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();
  const ratelimitKey =
    bearer ?? req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anon';
  const rate = await mcpRateLimiter(ratelimitKey);
  if (!rate.success) {
    const retryAfter = Math.ceil((rate.reset - Date.now()) / 1000);
    return new Response(JSON.stringify({ error: 'rate_limited', retryAfter }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(retryAfter),
        'x-ratelimit-limit': String(rate.limit),
        'x-ratelimit-remaining': String(rate.remaining),
      },
    });
  }

  return authenticated(req);
}

export { handler as GET, handler as POST, handler as DELETE };
