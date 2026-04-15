import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { safeCompare } from '@/lib/auth-utils';

/**
 * POST /api/v1/reports
 *
 * Receives structured phase reports from the `/qualia-report` skill
 * and persists them to the `session_reports` table.
 *
 * Auth: `Authorization: Bearer <token>` header must match CLAUDE_API_KEY env var.
 *
 * Contract is defined by ~/.claude/skills/qualia-report/SKILL.md — do not
 * break it without updating the skill in lockstep.
 */

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
  gap_cycles: z.number().int().optional().default(0),
  deployed_url: z.string().optional().default(''),
  lifetime: z.record(z.string(), z.unknown()).optional().default({}),
  commits: z.array(z.string()).optional().default([]),
  notes: z.string().max(65000).optional().default(''),
  submitted_by: z.string().optional().default(''),
  submitted_at: z.string().datetime().optional(),
});

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  const token = extractBearer(request.headers.get('authorization'));
  const expectedKey = process.env.CLAUDE_API_KEY;

  if (!expectedKey || !safeCompare(token, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
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
      gap_cycles: body.gap_cycles,
      deployed_url: body.deployed_url || null,
      lifetime: body.lifetime,
      commits: body.commits,
      notes: body.notes,
      submitted_by: body.submitted_by || null,
      submitted_at: body.submitted_at ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[api/v1/reports] Insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
