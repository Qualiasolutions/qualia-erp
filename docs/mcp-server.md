# Qualia ERP — MCP Server

Remote MCP server exposing the ERP to Claude connectors, the qualia-framework,
and any other MCP-speaking client.

## Endpoint

| Transport       | URL                                              |
| --------------- | ------------------------------------------------ |
| Streamable HTTP | `https://portal.qualiasolutions.net/api/mcp/mcp` |

SSE is intentionally disabled — modern MCP clients (Claude.ai, Cursor, the SDK)
all use streamable HTTP, and SSE would require Redis for serverless session
persistence.

## Auth

Bearer tokens minted from the `api_tokens` table (same `qlt_*` tokens used by
`/api/v1/reports`).

| Scope       | Tools unlocked                                             |
| ----------- | ---------------------------------------------------------- |
| `mcp:read`  | `whoami`, `list_*`, `get_*`                                |
| `mcp:write` | `create_task`, `update_task_status`, `log_client_activity` |
| `*`         | All scopes (use sparingly — service / break-glass)         |

The legacy shared `CLAUDE_API_KEY` is **not** accepted on this endpoint.

### Mint a token

Admins go to **`/admin?tab=system` → API tokens → New token**:

1. Pick a name and the user that owns the token
2. Tick the scopes you need (`mcp:read` is the common case for connectors)
3. Pick an expiry (default 90 days)
4. Copy the plaintext immediately — it is shown once and never stored

## Tools

### Read (mcp:read)

| Tool                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `whoami`              | Returns authenticated profile + scope (debugging).         |
| `list_projects`       | Projects with optional `status` filter.                    |
| `list_tasks`          | Tasks filterable by `project_id`, `assignee_id`, `status`. |
| `list_clients`        | Clients with optional `lead_status` filter.                |
| `list_meetings`       | Upcoming meetings (`past=true` for historical).            |
| `get_session_reports` | Recent framework reports; excludes `dry_run` by default.   |

### Write (mcp:write)

| Tool                  | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `create_task`         | Insert a task. Workspace inferred from project or token owner.  |
| `update_task_status`  | Move a task between Todo / In Progress / Done / Canceled.       |
| `log_client_activity` | Append a `call`/`email`/`meeting`/`note`/`status_change` entry. |

All mutations record `creator_id` / `created_by` from the token's profile, so
audit trails work the same as session-based mutations.

## Connect from Claude.ai

1. Settings → Connectors → Add custom connector
2. URL: `https://portal.qualiasolutions.net/api/mcp/mcp`
3. Auth: Bearer token (paste your `qlt_*` token)
4. Save → tools appear under the connector name `qualia-erp`

## Connect from another MCP client

```json
{
  "mcpServers": {
    "qualia-erp": {
      "transport": "http",
      "url": "https://portal.qualiasolutions.net/api/mcp/mcp",
      "headers": { "Authorization": "Bearer qlt_..." }
    }
  }
}
```

## Local dev

```bash
npm run dev
# in another shell:
curl -X POST http://localhost:3000/api/mcp/mcp \
  -H "Authorization: Bearer qlt_..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Adding new tools

Edit `app/api/mcp/[transport]/route.ts`. Each tool registers via
`server.tool(name, description, zodSchema, handler)`.

- Read tools: gated by the global `requiredScopes: ['mcp:read']`.
- Write tools: call `requireWrite(authInfo)` first and return early on denial.
- Mutations should set `creator_id` / `created_by` from
  `authInfo.extra.profileId` so the same audit guarantees apply as session
  flows.

## Files

| Path                                     | Purpose                         |
| ---------------------------------------- | ------------------------------- |
| `app/api/mcp/[transport]/route.ts`       | MCP server (tools + auth)       |
| `lib/api-auth.ts` (`hasScope`)           | Scope helper                    |
| `app/actions/api-tokens.ts`              | Mint / list / revoke / list-all |
| `components/portal/api-tokens-panel.tsx` | Admin UI panel                  |
| `app/actions/admin-control/system.ts`    | Loads `tokenAssignableProfiles` |
