import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { safeCompare } from '@/lib/auth-utils';

// M-B2: Length caps on string fields to prevent row-bloat via compromised key.
const SessionLogSchema = z.object({
  project: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  working_directory: z.string().max(500).optional(),
  git: z
    .object({
      branch: z.string().max(200).optional(),
      files_changed: z.number().int().min(0).max(100000).optional(),
    })
    .optional(),
});

/**
 * POST /api/claude/session-log
 *
 * Receives session summaries from save-session-state.sh and stores them.
 * This is the "write" side — every Claude session end pushes a summary here.
 *
 * Auth: X-API-Key header must match CLAUDE_API_KEY env var.
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.CLAUDE_API_KEY;

  if (!expectedKey || !safeCompare(apiKey, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SessionLogSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid request body' },
      { status: 400 }
    );
  }

  const body = parsed.data;

  const { error } = await supabase.from('claude_sessions').insert({
    project_name: body.project,
    branch: body.git?.branch ?? null,
    files_changed: body.git?.files_changed ?? 0,
    summary: body.summary ?? null,
    working_directory: body.working_directory ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
