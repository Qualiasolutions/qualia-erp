import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope } from '@/lib/api-auth';
import { apiRateLimiter } from '@/lib/rate-limit';

/**
 * POST /api/v1/reports
 *
 * Receives structured phase reports from qualia-framework's /qualia-report skill.
 *
 * Auth: Bearer token from api_tokens (qlt_*) — per-user.
 *
 * Idempotency:
 *  Clients SHOULD send `Idempotency-Key: <uuid>` per report. Replays within
 *  24h return the original report_id with 200 and header `Idempotent-Replay: true`.
 *
 * gap_cycles polymorphism:
 *  Accepts either a number (legacy v3.4.1) or an object keyed by phase
 *  (v3.5+, e.g. {"1": 0, "2": 1}). Object is flattened to current phase for
 *  the integer column and stored in full in gap_cycles_raw.
 *
 * client_report_id (v4.0.4+):
 *  Per-project sequential identifier (format: QS-REPORT-NN) sent by the
 *  framework. When BOTH `project_id` and `client_report_id` are present, they
 *  form a composite dedupe key — the insert becomes an UPSERT on the partial
 *  unique index `(framework_project_id, client_report_id)`. This is the
 *  preferred idempotency mechanism for v4.0.4+ clients (cheaper than UUID
 *  Idempotency-Key headers). When present, the response echoes
 *  `client_report_id` as `report_id` instead of the internal UUID.
 *
 * dry_run (v4.0.4+):
 *  Boolean flag (default false). When true, the report is persisted but marked
 *  as a dry-run. Downstream read queries filter dry-run reports from aggregate
 *  views and dashboards — the write path stores them identically.
 *
 * Contract: see qualia-framework docs/erp-contract.md.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gapCyclesSchema = z.union([
  z.number().int().nonnegative(),
  z.record(z.string(), z.number().int().nonnegative()),
]);

const milestoneSummarySchema = z.object({
  num: z.number().int(),
  name: z.string(),
  closed_at: z.string().optional(),
  phases_completed: z.number().int().optional(),
  tasks_completed: z.number().int().optional(),
});

const payloadSchema = z.object({
  project: z.string().min(1),
  client: z.string().optional().default(''),
  milestone: z.number().int().optional(),
  milestone_name: z.string().optional(),
  milestones: z.array(milestoneSummarySchema).optional(),
  phase: z.number().int().optional(),
  phase_name: z.string().optional(),
  total_phases: z.number().int().optional(),
  status: z.string().optional(),
  tasks_done: z.number().int().optional().default(0),
  tasks_total: z.number().int().optional().default(0),
  verification: z.string().optional().default('pending'),
  gap_cycles: gapCyclesSchema.optional().default(0),
  deployed_url: z.string().optional().default(''),
  lifetime: z.record(z.string(), z.unknown()).optional().default({}),
  commits: z.array(z.string()).optional().default([]),
  notes: z.string().max(65000).optional().default(''),
  submitted_by: z.string().optional().default(''),
  submitted_at: z.string().datetime().optional(),
  // v3.6+ / v4.0 stable identifiers + telemetry
  project_id: z.string().optional(),
  team_id: z.string().optional(),
  git_remote: z.string().optional(),
  session_started_at: z.string().datetime().optional(),
  last_pushed_at: z.string().datetime().optional(),
  build_count: z.number().int().nonnegative().optional(),
  deploy_count: z.number().int().nonnegative().optional(),
  // v4.0.4 — per-project sequential report ID + dry-run flag
  client_report_id: z
    .string()
    .regex(/^QS-REPORT-\d+$/)
    .optional(),
  dry_run: z.boolean().optional().default(false),
  // B1 — observed-vs-self-reported. 'auto' = captured at ship/session-end without
  // a human running /qualia-report; 'manual' = a deliberate /qualia-report. Defaults
  // to 'manual' so every pre-B1 caller keeps its existing meaning. Not part of the
  // dedupe key — purely a provenance flag for dashboards.
  source: z.enum(['auto', 'manual']).optional().default('manual'),
  // v4.2 — ERP linkage. client_id is a UUID FK to public.clients;
  // erp_project_id is a UUID FK to public.projects and is the strongest
  // Framework -> ERP project link when the framework already knows it.
  // framework_version is the semver that produced this payload. Both are
  // optional — pre-v4.2 framework installs simply don't send them and
  // legacy rows persist with NULL.
  erp_project_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  framework_version: z.string().optional(),
});

type Payload = z.infer<typeof payloadSchema>;

type AdminClient = ReturnType<typeof createAdminClient>;

type OpenWorkSession = {
  id: string;
  started_at: string;
  project_id: string | null;
  report_url: string | null;
  project: { id: string; name: string } | { id: string; name: string }[] | null;
};

type ProjectCandidate = {
  id: string;
  name: string;
  client_id: string | null;
  github_repo_url: string | null;
  is_pre_production: boolean | null;
  metadata: unknown;
};

type ProjectIntegrationCandidate = {
  project_id: string;
  external_url: string | null;
  external_id: string | null;
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

function repoCandidates(...values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(normalizeRepo(value)));
}

function projectNamesOverlap(reportProject: string, sessionProject: string): boolean {
  const report = normalizeProjectName(reportProject);
  const session = normalizeProjectName(sessionProject);
  if (!report || !session) return false;
  return report.includes(session) || session.includes(report);
}

function buildFrameworkReportUrl(request: NextRequest, reportId: string): string {
  const origin = new URL(request.url).origin;
  return `${origin}/admin/reports?tab=framework&report=${encodeURIComponent(reportId)}`;
}

async function resolveErpProject(
  supabase: AdminClient,
  body: Payload
): Promise<{ id: string; name: string; client_id: string | null } | null> {
  if (body.dry_run) return null;

  if (body.erp_project_id) {
    const { data: directProject, error: directError } = await supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('id', body.erp_project_id)
      .maybeSingle();

    if (directError) {
      console.warn(
        `[api/v1/reports] Direct ERP project lookup failed for erp_project_id="${body.erp_project_id}":`,
        directError.message
      );
    }

    if (directProject) {
      return directProject;
    }

    console.warn(
      `[api/v1/reports] erp_project_id="${body.erp_project_id}" was not found; falling back to repo/name matching`
    );
  }

  const [projectsResult, integrationsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, client_id, github_repo_url, is_pre_production, metadata')
      .limit(1000),
    supabase
      .from('project_integrations')
      .select('project_id, external_url, external_id, metadata')
      .eq('service_type', 'github')
      .limit(2000),
  ]);

  if (projectsResult.error || !projectsResult.data) {
    console.warn('[api/v1/reports] Could not resolve ERP project:', projectsResult.error?.message);
    return null;
  }

  if (integrationsResult.error) {
    console.warn(
      '[api/v1/reports] Could not read project integrations:',
      integrationsResult.error.message
    );
  }

  const integrationsByProject = new Map<string, ProjectIntegrationCandidate[]>();
  for (const integration of (integrationsResult.data ?? []) as ProjectIntegrationCandidate[]) {
    const current = integrationsByProject.get(integration.project_id) ?? [];
    current.push(integration);
    integrationsByProject.set(integration.project_id, current);
  }

  const reportProject = normalizeProjectName(body.project);
  const frameworkProjectId = normalizeProjectName(body.project_id);
  const incomingRemote = normalizeRepo(body.git_remote);
  const incomingRepoSlug =
    repoSlug(body.git_remote) || normalizeProjectName(body.project_id) || reportProject;

  const scored = (projectsResult.data as ProjectCandidate[])
    .map((project) => {
      const projectName = normalizeProjectName(project.name);
      const integrations = integrationsByProject.get(project.id) ?? [];
      const repos = repoCandidates(
        project.github_repo_url,
        ...integrations.flatMap((integration) => [
          integration.external_url,
          integration.external_id,
        ])
      );
      const aliases = [
        ...projectAliases(project.metadata),
        ...integrations.flatMap((integration) => projectAliases(integration.metadata)),
      ].map(normalizeProjectName);
      let score = 0;

      if (incomingRemote && repos.some((repo) => incomingRemote === normalizeRepo(repo)))
        score = 130;
      else if (
        incomingRepoSlug &&
        repos.some((repo) => {
          const candidateSlug = repoSlug(repo);
          return candidateSlug && incomingRepoSlug === candidateSlug;
        })
      )
        score = 110;
      else if (
        (reportProject && aliases.includes(reportProject)) ||
        (frameworkProjectId && aliases.includes(frameworkProjectId)) ||
        (incomingRepoSlug && aliases.includes(incomingRepoSlug))
      )
        score = 100;
      else if (reportProject && projectName && reportProject === projectName) score = 90;
      else if (frameworkProjectId && projectName && frameworkProjectId === projectName) score = 85;
      else if (reportProject && projectName && projectNamesOverlap(reportProject, projectName))
        score = 60;

      if (score > 0 && project.is_pre_production) score += 5;

      return { id: project.id, name: project.name, client_id: project.client_id, score };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    console.warn(
      `[api/v1/reports] Ambiguous ERP project match for project="${body.project}" git_remote="${body.git_remote ?? ''}"; skipping canonical link`
    );
    return null;
  }

  return { id: scored[0].id, name: scored[0].name, client_id: scored[0].client_id };
}

async function linkReportToActiveWorkSession({
  supabase,
  request,
  profileId,
  body,
  responseReportId,
  erpProjectId,
}: {
  supabase: AdminClient;
  request: NextRequest;
  profileId: string | null;
  body: Payload;
  responseReportId: string;
  erpProjectId: string | null;
}): Promise<{ linked_session_id: string | null; link_method: string | null }> {
  if (!profileId || body.dry_run) {
    return { linked_session_id: null, link_method: null };
  }

  const submittedAt = new Date(body.submitted_at ?? new Date().toISOString()).getTime();
  const graceMs = 5 * 60 * 1000;

  const { data: sessions, error } = await supabase
    .from('work_sessions')
    .select(
      'id, started_at, project_id, report_url, project:projects!work_sessions_project_id_fkey(id, name)'
    )
    .eq('profile_id', profileId)
    .not('project_id', 'is', null)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(5);

  if (error || !sessions || sessions.length === 0) {
    if (error) console.warn('[api/v1/reports] Active session lookup failed:', error.message);
    return { linked_session_id: null, link_method: null };
  }

  const candidates = (sessions as OpenWorkSession[]).filter((session) => {
    const startedAt = new Date(session.started_at).getTime();
    return Number.isFinite(startedAt) && startedAt <= submittedAt + graceMs;
  });

  if (candidates.length === 0) return { linked_session_id: null, link_method: null };

  const projectIdMatched = erpProjectId
    ? candidates.find((session) => session.project_id === erpProjectId)
    : undefined;

  const projectMatched = candidates.find((session) => {
    const project = Array.isArray(session.project) ? session.project[0] : session.project;
    return project?.name ? projectNamesOverlap(body.project, project.name) : false;
  });

  // A user can only have one meaningful active session in the UI; if stale
  // rows exist, use the newest one, matching getActiveSession().
  const selected = projectIdMatched ?? projectMatched ?? candidates[0];
  const reportUrl = buildFrameworkReportUrl(request, responseReportId);

  if (!selected.report_url) {
    const { error: updateError } = await supabase
      .from('work_sessions')
      .update({ report_url: reportUrl })
      .eq('id', selected.id)
      .is('ended_at', null);

    if (updateError) {
      console.warn(
        '[api/v1/reports] Could not attach report to work session:',
        updateError.message
      );
      return { linked_session_id: null, link_method: null };
    }
  }

  return {
    linked_session_id: selected.id,
    link_method: projectIdMatched
      ? 'profile_active_session_canonical_project'
      : projectMatched
        ? 'profile_active_session_project_match'
        : 'profile_active_session',
  };
}

function flattenGapCycles(
  raw: Payload['gap_cycles'],
  phase: number | undefined
): { current: number; raw: Record<string, number> | null } {
  if (typeof raw === 'number') {
    return { current: raw, raw: null };
  }
  const key = String(phase ?? '');
  const current = key && typeof raw[key] === 'number' ? raw[key] : 0;
  return { current, raw };
}

function errorResponse(status: number, body: Record<string, unknown>, extraHeaders?: HeadersInit) {
  return NextResponse.json({ ok: false, ...body }, { status, headers: extraHeaders });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return errorResponse(401, { error: auth.error, message: auth.message });
  }
  if (!hasScope(auth, 'reports:write')) {
    return errorResponse(403, {
      error: 'INSUFFICIENT_SCOPE',
      message: 'Token must include reports:write scope',
    });
  }

  const rateLimitResult = await apiRateLimiter(`v1:reports:${auth.profileId ?? 'unknown'}`);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return errorResponse(
      429,
      { error: 'RATE_LIMITED', message: 'Rate limit exceeded', retryAfter },
      { 'Retry-After': retryAfter.toString() }
    );
  }

  // Parse Idempotency-Key header (optional, UUID). Invalid format → 400.
  const idempotencyHeader = request.headers.get('idempotency-key');
  let idempotencyKey: string | null = null;
  if (idempotencyHeader) {
    const trimmed = idempotencyHeader.trim();
    if (!UUID_REGEX.test(trimmed)) {
      return errorResponse(400, {
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a UUID',
      });
    }
    idempotencyKey = trimmed.toLowerCase();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, { error: 'INVALID_JSON', message: 'Invalid JSON body' });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(422, {
      error: 'VALIDATION_FAILED',
      message: 'Payload failed validation',
      details: parsed.error.flatten(),
    });
  }

  const body = parsed.data;
  const supabase = createAdminClient();

  // Idempotency replay check — 24h window enforced via created_at filter.
  if (idempotencyKey) {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('idempotency_keys')
      .select('report_id, created_at')
      .eq('key', idempotencyKey)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (existing) {
      // If the stored report has a client_report_id, return that instead of the UUID
      // so replay responses are consistent with the original response shape.
      const { data: replayRow } = await supabase
        .from('session_reports')
        .select('client_report_id')
        .eq('id', existing.report_id)
        .single();
      const replayId = replayRow?.client_report_id ?? existing.report_id;
      return NextResponse.json(
        { ok: true, report_id: replayId, replayed: true, message: 'Idempotent replay' },
        { headers: { 'Idempotent-Replay': 'true' } }
      );
    }
  }

  const gapFlat = flattenGapCycles(body.gap_cycles, body.phase);
  const erpProject = await resolveErpProject(supabase, body);
  const erpProjectId = erpProject?.id ?? null;
  const reportClientId = body.client_id ?? erpProject?.client_id ?? null;

  // Build the row object once — used by both insert and upsert paths.
  const row = {
    project_name: erpProject?.name ?? body.project,
    client: body.client || null,
    milestone: body.milestone ?? null,
    milestone_name: body.milestone_name || null,
    milestones: body.milestones ?? null,
    phase: body.phase ?? null,
    phase_name: body.phase_name || null,
    total_phases: body.total_phases ?? null,
    status: body.status || null,
    tasks_done: body.tasks_done,
    tasks_total: body.tasks_total,
    verification: body.verification,
    gap_cycles: gapFlat.current,
    gap_cycles_raw: gapFlat.raw,
    deployed_url: body.deployed_url || null,
    lifetime: body.lifetime,
    commits: body.commits,
    notes: body.notes,
    submitted_by: body.submitted_by || null,
    submitted_at: body.submitted_at ?? new Date().toISOString(),
    framework_project_id: body.project_id || null,
    team_id: body.team_id || null,
    git_remote: body.git_remote || null,
    session_started_at: body.session_started_at || null,
    last_pushed_at: body.last_pushed_at || null,
    build_count: body.build_count ?? null,
    deploy_count: body.deploy_count ?? null,
    client_report_id: body.client_report_id || null,
    dry_run: body.dry_run,
    source: body.source,
    client_id: reportClientId,
    erp_project_id: erpProjectId,
    framework_version: body.framework_version || null,
    idempotency_key: idempotencyKey,
    token_id: auth.tokenId,
    auth_method: auth.method,
  };

  // Case A (v4.0.4): both project_id AND client_report_id present — UPSERT on
  // the partial unique index (framework_project_id, client_report_id).
  // Case B (legacy): plain insert, no conflict handling.
  // Case C (partial): only one of project_id/client_report_id — plain insert + warn.
  const hasProjectId = Boolean(body.project_id);
  const hasClientReportId = Boolean(body.client_report_id);

  if (hasProjectId !== hasClientReportId) {
    console.warn(
      `[api/v1/reports] Partial v4.0.4 payload: project_id=${hasProjectId}, client_report_id=${hasClientReportId}, project=${body.project}`
    );
  }

  const useUpsert = hasProjectId && hasClientReportId;

  const query = useUpsert
    ? supabase
        .from('session_reports')
        .upsert(row, { onConflict: 'framework_project_id,client_report_id' })
    : supabase.from('session_reports').insert(row);

  const { data: insertedReport, error: insertError } = await query.select('id').single();

  if (insertError || !insertedReport) {
    console.error('[api/v1/reports] Insert error:', insertError);
    return errorResponse(500, {
      error: 'INSERT_FAILED',
      message: insertError?.message ?? 'unknown',
    });
  }

  // Record idempotency key AFTER successful report insert.
  // If this fails (e.g. race where another request claimed the same key), that's fine —
  // the other request already succeeded and the duplicate row will exist but be rare.
  if (idempotencyKey) {
    await supabase.from('idempotency_keys').insert({
      key: idempotencyKey,
      report_id: insertedReport.id,
      profile_id: auth.profileId,
    });
  }

  // v4.0.4: echo client_report_id as the response report_id when present;
  // otherwise fall back to the internal UUID (legacy behavior).
  const responseReportId = body.client_report_id ?? insertedReport.id;

  const profileId = auth.profileId;

  const sessionLink = await linkReportToActiveWorkSession({
    supabase,
    request,
    profileId,
    body,
    responseReportId,
    erpProjectId,
  });

  return NextResponse.json({
    ok: true,
    report_id: responseReportId,
    erp_project_id: erpProjectId,
    erp_project_name: erpProject?.name ?? null,
    linked_session_id: sessionLink.linked_session_id,
    link_method: sessionLink.link_method,
    message: 'Report received',
  });
}
