import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/gsd/update-phase
 *
 * Called by Claude Code hooks to auto-update phase status when work is completed.
 * Requires Supabase auth token in Authorization header.
 *
 * Body:
 *   project_id: string (UUID)
 *   phase_name: string (e.g., "SETUP", "EXECUTE")
 *   status: "not_started" | "in_progress" | "completed" | "skipped"
 *
 * Example Claude Code hook (.claude/hooks/post-commit.sh):
 *   curl -X POST https://qualia-erp.vercel.app/api/gsd/update-phase \
 *     -H "Authorization: Bearer $SUPABASE_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"project_id":"...","phase_name":"EXECUTE","status":"completed"}'
 */

const VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'] as const;
type PhaseStatus = (typeof VALID_STATUSES)[number];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      // Unlock next phase
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
