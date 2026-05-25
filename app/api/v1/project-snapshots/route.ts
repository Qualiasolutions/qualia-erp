import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope } from '@/lib/api-auth';
import { apiRateLimiter } from '@/lib/rate-limit';
import { refreshActiveWorkPacketsForProject } from '@/app/actions/work-packets';

/**
 * POST /api/v1/project-snapshots
 *
 * Receives project-level progress snapshots from qualia-framework.
 * Reports describe one work session; snapshots describe the current project
 * state from kickoff to handoff for ERP/admin dashboards.
 */

const snapshotIdentifiersSchema = z.object({
  project_id: z.string().min(1),
  team_id: z.string().optional(),
  git_remote: z.string().optional(),
  erp_project_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  workspace_id: z.string().uuid().optional(),
  work_packet_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  assignment_deadline: z.string().date().optional(),
});

const snapshotSchema = z.object({
  snapshot_version: z.literal(1),
  generated_at: z.string().datetime(),
  source: z.literal('qualia-framework'),
  framework_version: z.string().optional().default(''),
  identifiers: snapshotIdentifiersSchema,
  project: z.object({
    name: z.string().min(1),
    client: z.string().optional().default(''),
    status: z.string().optional().default(''),
    deployed_url: z.string().optional().default(''),
    progress_percent: z.number().int().min(0).max(100),
  }),
  current: z
    .object({
      milestone: z.number().int().optional(),
      milestone_name: z.string().optional(),
      phase: z.number().int().optional(),
      phase_name: z.string().optional(),
      total_phases: z.number().int().optional(),
      tasks_done: z.number().int().optional(),
      tasks_total: z.number().int().optional(),
      verification: z.string().optional(),
      gap_cycles: z.number().int().nonnegative().optional(),
    })
    .passthrough(),
  journey: z
    .object({
      total_milestones: z.number().int().nonnegative().optional(),
      milestones: z.array(z.record(z.string(), z.unknown())).optional(),
      closed_milestones: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .passthrough(),
  lifetime: z.record(z.string(), z.unknown()).optional().default({}),
  timestamps: z.record(z.string(), z.unknown()).optional().default({}),
});

type SnapshotPayload = z.infer<typeof snapshotSchema>;
type AdminClient = ReturnType<typeof createAdminClient>;

type ProjectCandidate = {
  id: string;
  name: string;
  client_id: string | null;
  github_repo_url: string | null;
  is_pre_production: boolean | null;
  metadata: unknown;
};

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeProjectName(value: string | null | undefined): string {
  return normalizeToken(value)
    .replace(/\b(project|portal|website|app|demo|v2)\b/g, '')
    .trim();
}

function normalizeRepo(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^git@github\.com:/, 'github.com/')
    .replace(/^https?:\/\//, '')
    .replace(/^ssh:\/\/git@github\.com\//, 'github.com/')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
}

function repoSlug(value: string | null | undefined): string {
  const normalized = normalizeRepo(value);
  const parts = normalized.split('/').filter(Boolean);
  return normalizeProjectName(parts[parts.length - 1]);
}

function projectAliases(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const aliases = (metadata as { framework_aliases?: unknown }).framework_aliases;
  if (!Array.isArray(aliases)) return [];
  return aliases.filter((alias): alias is string => typeof alias === 'string');
}

function projectNamesOverlap(snapshotProject: string, erpProject: string): boolean {
  const snapshot = normalizeProjectName(snapshotProject);
  const erp = normalizeProjectName(erpProject);
  if (!snapshot || !erp) return false;
  return snapshot.includes(erp) || erp.includes(snapshot);
}

function metadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function resolveErpProject(
  supabase: AdminClient,
  body: SnapshotPayload
): Promise<{ id: string; name: string; client_id: string | null; metadata: unknown } | null> {
  if (body.identifiers.erp_project_id) {
    const { data: directProject, error: directError } = await supabase
      .from('projects')
      .select('id, name, client_id, metadata')
      .eq('id', body.identifiers.erp_project_id)
      .maybeSingle();

    if (directError) {
      console.warn(
        `[api/v1/project-snapshots] Direct ERP project lookup failed for erp_project_id="${body.identifiers.erp_project_id}":`,
        directError.message
      );
    }

    if (directProject) return directProject;

    console.warn(
      `[api/v1/project-snapshots] erp_project_id="${body.identifiers.erp_project_id}" was not found; falling back to repo/name matching`
    );
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_id, github_repo_url, is_pre_production, metadata')
    .limit(1000);

  if (error || !data) {
    console.warn('[api/v1/project-snapshots] Could not resolve ERP project:', error?.message);
    return null;
  }

  const snapshotProject = normalizeProjectName(body.project.name);
  const frameworkProjectId = normalizeProjectName(body.identifiers.project_id);
  const incomingRemote = normalizeRepo(body.identifiers.git_remote);
  const incomingRepoSlug =
    repoSlug(body.identifiers.git_remote) || frameworkProjectId || snapshotProject;

  const scored = (data as ProjectCandidate[])
    .map((project) => {
      const projectName = normalizeProjectName(project.name);
      const projectRepo = normalizeRepo(project.github_repo_url);
      const projectRepoSlug = repoSlug(project.github_repo_url);
      const aliases = projectAliases(project.metadata).map(normalizeProjectName);
      let score = 0;

      if (incomingRemote && projectRepo && incomingRemote === projectRepo) score = 130;
      else if (incomingRepoSlug && projectRepoSlug && incomingRepoSlug === projectRepoSlug)
        score = 110;
      else if (
        (snapshotProject && aliases.includes(snapshotProject)) ||
        (frameworkProjectId && aliases.includes(frameworkProjectId)) ||
        (incomingRepoSlug && aliases.includes(incomingRepoSlug))
      )
        score = 100;
      else if (snapshotProject && projectName && snapshotProject === projectName) score = 90;
      else if (frameworkProjectId && projectName && frameworkProjectId === projectName) score = 85;
      else if (snapshotProject && projectName && projectNamesOverlap(snapshotProject, projectName))
        score = 60;

      if (score > 0 && project.is_pre_production) score += 5;

      return {
        id: project.id,
        name: project.name,
        client_id: project.client_id,
        metadata: project.metadata,
        score,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    console.warn(
      `[api/v1/project-snapshots] Ambiguous ERP project match for project="${body.project.name}" git_remote="${body.identifiers.git_remote ?? ''}"; skipping snapshot import`
    );
    return null;
  }

  return {
    id: scored[0].id,
    name: scored[0].name,
    client_id: scored[0].client_id,
    metadata: scored[0].metadata,
  };
}

function errorResponse(status: number, body: Record<string, unknown>, extraHeaders?: HeadersInit) {
  return NextResponse.json({ ok: false, ...body }, { status, headers: extraHeaders });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(401, { error: auth.error, message: auth.message });
  }
  if (!hasScope(auth, 'reports:write') && !hasScope(auth, 'projects:write')) {
    return errorResponse(403, {
      error: 'INSUFFICIENT_SCOPE',
      message: 'Token must include reports:write or projects:write scope',
    });
  }

  const rateLimitResult = await apiRateLimiter(`v1:project-snapshots:${auth.profileId}`);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return errorResponse(
      429,
      { error: 'RATE_LIMITED', message: 'Rate limit exceeded', retryAfter },
      { 'Retry-After': retryAfter.toString() }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, { error: 'INVALID_JSON', message: 'Invalid JSON body' });
  }

  const parsed = snapshotSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(422, {
      error: 'VALIDATION_FAILED',
      message: 'Snapshot failed validation',
      details: parsed.error.flatten(),
    });
  }

  const body = parsed.data;
  const supabase = createAdminClient();
  const project = await resolveErpProject(supabase, body);

  if (!project) {
    return errorResponse(404, {
      error: 'PROJECT_NOT_FOUND',
      message: 'No ERP project matched the snapshot identifiers',
    });
  }

  const receivedAt = new Date().toISOString();
  const existingMetadata = metadataObject(project.metadata);
  const frameworkSnapshot = {
    ...body,
    received_at: receivedAt,
    token_id: auth.tokenId,
    profile_id: auth.profileId,
    auth_method: auth.method,
  };
  const nextMetadata = {
    ...existingMetadata,
    framework_snapshot: frameworkSnapshot,
    framework_progress_percent: body.project.progress_percent,
    framework_current: body.current,
    framework_lifetime: body.lifetime,
    framework_identifiers: body.identifiers,
  };

  const updateRow: Record<string, unknown> = {
    metadata: nextMetadata,
    updated_at: receivedAt,
  };
  if (!project.client_id && body.identifiers.client_id) {
    updateRow.client_id = body.identifiers.client_id;
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update(updateRow)
    .eq('id', project.id);

  if (updateError) {
    console.error('[api/v1/project-snapshots] Update error:', updateError);
    return errorResponse(500, {
      error: 'UPDATE_FAILED',
      message: updateError.message,
    });
  }

  const packetRefresh = await refreshActiveWorkPacketsForProject(supabase, project.id);
  if (!packetRefresh.success) {
    console.warn('[api/v1/project-snapshots] Work packet refresh failed:', packetRefresh.error);
  }

  return NextResponse.json({
    ok: true,
    project_id: project.id,
    project_name: project.name,
    progress_percent: body.project.progress_percent,
    snapshot_generated_at: body.generated_at,
    message: 'Project snapshot received',
  });
}
