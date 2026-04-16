import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, LEGACY_DEPRECATION_HEADERS } from '@/lib/api-auth';

/**
 * POST /api/v1/reports
 *
 * Receives structured phase reports from qualia-framework's /qualia-report skill.
 *
 * Auth (dual path, v3.4.2 compat):
 *  1. Bearer token from api_tokens (qlt_*) — preferred, per-user.
 *  2. Legacy CLAUDE_API_KEY — grandfathered with Deprecation + Sunset headers.
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
 * Contract: see qualia-framework docs/erp-contract.md.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gapCyclesSchema = z.union([
  z.number().int().nonnegative(),
  z.record(z.string(), z.number().int().nonnegative()),
]);

const payloadSchema = z.object({
  project: z.string().min(1),
  client: z.string().optional().default(''),
  milestone: z.number().int().optional(),
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
});

type Payload = z.infer<typeof payloadSchema>;

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

  const deprecationHeaders =
    auth.method === 'legacy_shared_key' ? LEGACY_DEPRECATION_HEADERS : undefined;

  // Parse Idempotency-Key header (optional, UUID). Invalid format → 400.
  const idempotencyHeader = request.headers.get('idempotency-key');
  let idempotencyKey: string | null = null;
  if (idempotencyHeader) {
    const trimmed = idempotencyHeader.trim();
    if (!UUID_REGEX.test(trimmed)) {
      return errorResponse(
        400,
        { error: 'INVALID_IDEMPOTENCY_KEY', message: 'Idempotency-Key must be a UUID' },
        deprecationHeaders
      );
    }
    idempotencyKey = trimmed.toLowerCase();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(
      400,
      { error: 'INVALID_JSON', message: 'Invalid JSON body' },
      deprecationHeaders
    );
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(
      422,
      {
        error: 'VALIDATION_FAILED',
        message: 'Payload failed validation',
        details: parsed.error.flatten(),
      },
      deprecationHeaders
    );
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
      return NextResponse.json(
        { ok: true, report_id: existing.report_id, replayed: true, message: 'Idempotent replay' },
        { headers: { ...(deprecationHeaders ?? {}), 'Idempotent-Replay': 'true' } }
      );
    }
  }

  const gapFlat = flattenGapCycles(body.gap_cycles, body.phase);

  const { data: insertedReport, error: insertError } = await supabase
    .from('session_reports')
    .insert({
      project_name: body.project,
      client: body.client || null,
      milestone: body.milestone ?? null,
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
      idempotency_key: idempotencyKey,
      token_id: auth.method === 'per_user_token' ? auth.tokenId : null,
      auth_method: auth.method,
    })
    .select('id')
    .single();

  if (insertError || !insertedReport) {
    console.error('[api/v1/reports] Insert error:', insertError);
    return errorResponse(
      500,
      { error: 'INSERT_FAILED', message: insertError?.message ?? 'unknown' },
      deprecationHeaders
    );
  }

  // Record idempotency key AFTER successful report insert.
  // If this fails (e.g. race where another request claimed the same key), that's fine —
  // the other request already succeeded and the duplicate row will exist but be rare.
  if (idempotencyKey) {
    await supabase.from('idempotency_keys').insert({
      key: idempotencyKey,
      report_id: insertedReport.id,
      profile_id: auth.method === 'per_user_token' ? auth.profileId : null,
    });
  }

  return NextResponse.json(
    { ok: true, report_id: insertedReport.id, message: 'Report received' },
    { headers: deprecationHeaders }
  );
}
