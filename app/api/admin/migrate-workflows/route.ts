import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyWorkflowToExistingProjects } from '@/app/actions/phases';

/**
 * POST /api/admin/migrate-workflows
 * One-time migration to apply workflow templates to existing projects
 * Only admins can run this
 */
export async function POST() {
  const supabase = await createClient();

  // Check if user is authenticated and is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Apply workflows to existing projects
  const result = await applyWorkflowToExistingProjects();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Migration complete',
    applied: result.applied,
    skipped: result.skipped,
    total: result.total,
  });
}
