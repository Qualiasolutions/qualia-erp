import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * POST /api/gsd/update-phase
 *
 * Called by Claude Code hooks to auto-update phase status when work is completed.
 * Auth: X-API-Key header checked against GSD_WEBHOOK_SECRET env var.
 * Uses service role client to bypass RLS (this is a trusted server-to-server call).
 *
 * Body:
 *   project_id: string (UUID)
 *   phase_name: string (e.g., "SETUP", "EXECUTE")
 *   status: "not_started" | "in_progress" | "completed" | "skipped"
 *
 * Example Claude Code hook:
 *   curl -s -X POST https://portal.qualiasolutions.net/api/gsd/update-phase \
 *     -H "X-API-Key: $GSD_WEBHOOK_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"project_id":"...","phase_name":"EXECUTE","status":"completed"}'
 */

const VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'] as const;
type PhaseStatus = (typeof VALID_STATUSES)[number];

export async function POST(request: NextRequest) {
  try {
    // Auth: check API key
    const apiKey = request.headers.get('x-api-key');
    const secret = process.env.GSD_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[/api/gsd/update-phase] GSD_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (
      !apiKey ||
      apiKey.length !== secret.length ||
      !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(secret))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service role client for DB operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { project_id, phase_name, status } = body as {
      project_id?: string;
      phase_name?: string;
      status?: string;
    };

    // Validate inputs
    if (!project_id || !phase_name || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, phase_name, status' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status as PhaseStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the phase
    const { data: phase, error: fetchError } = await supabase
      .from('project_phases')
      .select('id, sort_order, name')
      .eq('project_id', project_id)
      .ilike('name', phase_name)
      .single();

    if (fetchError || !phase) {
      return NextResponse.json(
        { error: `Phase "${phase_name}" not found in project ${project_id}` },
        { status: 404 }
      );
    }

    // Update the phase
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('project_phases')
      .update(updateData)
      .eq('id', phase.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If completed, unlock next phase and mark tasks done
    if (status === 'completed') {
      const { data: nextPhase } = await supabase
        .from('project_phases')
        .select('id, name')
        .eq('project_id', project_id)
        .gt('sort_order', phase.sort_order)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (nextPhase) {
        await supabase
          .from('project_phases')
          .update({ is_locked: false, status: 'in_progress' })
          .eq('id', nextPhase.id);
      }

      // Mark all tasks in this phase as Done
      await supabase
        .from('tasks')
        .update({ status: 'Done' })
        .eq('project_id', project_id)
        .ilike('phase_name', phase_name);

      return NextResponse.json({
        success: true,
        phase: phase.name,
        status: 'completed',
        next_phase: nextPhase?.name || null,
      });
    }

    return NextResponse.json({
      success: true,
      phase: phase.name,
      status,
    });
  } catch (error) {
    console.error('[/api/gsd/update-phase] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
