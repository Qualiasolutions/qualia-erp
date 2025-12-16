import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { setProjectProgress } from '@/app/actions/roadmap';

interface ProjectUpdate {
  namePattern: string;
  targetProgress: number;
}

const projectUpdates: ProjectUpdate[] = [
  { namePattern: 'alexis', targetProgress: 90 },
  { namePattern: 'joc', targetProgress: 10 },
  { namePattern: 'haamah', targetProgress: 100 },
  { namePattern: 'znso', targetProgress: 75 },
  { namePattern: 'woodlocation', targetProgress: 90 },
];

export async function POST() {
  const supabase = await createClient();

  // Check authentication
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
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const results: Array<{
    name: string;
    targetProgress: number;
    success: boolean;
    error?: string;
    data?: unknown;
  }> = [];

  // First, check if Woodlocation.com exists and create it if not
  const { data: woodlocationExists } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%woodlocation%')
    .limit(1);

  if (!woodlocationExists || woodlocationExists.length === 0) {
    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single();

    if (workspace) {
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Woodlocation.com',
          workspace_id: workspace.id,
          status: 'in_progress',
          project_type: 'web_design',
          project_group: 'active',
        })
        .select()
        .single();

      if (createError) {
        results.push({
          name: 'Woodlocation.com (create)',
          targetProgress: 90,
          success: false,
          error: createError.message,
        });
      } else {
        results.push({
          name: 'Woodlocation.com (create)',
          targetProgress: 90,
          success: true,
          data: { id: newProject.id },
        });
      }
    }
  }

  // Update each project
  for (const update of projectUpdates) {
    const { data: projects, error: searchError } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${update.namePattern}%`)
      .limit(1);

    if (searchError || !projects || projects.length === 0) {
      results.push({
        name: update.namePattern,
        targetProgress: update.targetProgress,
        success: false,
        error: searchError?.message || 'Project not found',
      });
      continue;
    }

    const project = projects[0];
    const result = await setProjectProgress(project.id, update.targetProgress);

    results.push({
      name: project.name,
      targetProgress: update.targetProgress,
      success: result.success,
      error: result.error,
      data: result.data,
    });
  }

  return NextResponse.json({
    message: 'Progress update complete',
    results,
  });
}
