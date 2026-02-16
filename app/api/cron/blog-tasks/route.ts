import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Daily blog task creator cron job
 * Runs daily at 8am (configured in vercel.json)
 *
 * Creates a task in the inbox assigned to Moayad to write a blog post
 * for one of the tracked SEO businesses, rotating through them.
 */

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/blog-tasks] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[cron/blog-tasks] Starting daily blog task creation...');

    const supabase = getSupabaseClient();

    // 1. Find Moayad's profile
    const { data: moayad, error: moayadError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', '%moayad%')
      .limit(1)
      .single();

    if (moayadError || !moayad) {
      console.error('[cron/blog-tasks] Could not find Moayad:', moayadError);
      return NextResponse.json(
        { success: false, error: 'Could not find Moayad profile' },
        { status: 500 }
      );
    }

    // 2. Get Moayad's workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', moayad.id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      console.error('[cron/blog-tasks] Could not find workspace for Moayad');
      return NextResponse.json({ success: false, error: 'No workspace found' }, { status: 500 });
    }

    const workspaceId = membership.workspace_id;

    // 3. Get all SEO-tracked projects
    const { data: seoProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, project_type')
      .eq('workspace_id', workspaceId)
      .or(
        'project_type.eq.seo,name.ilike.%Qualia Solutions%,name.ilike.%Aquador%,name.ilike.%ZNSO%'
      )
      .order('name');

    if (projectsError || !seoProjects || seoProjects.length === 0) {
      console.error('[cron/blog-tasks] No SEO projects found:', projectsError);
      return NextResponse.json({ success: false, error: 'No SEO projects found' }, { status: 500 });
    }

    // 4. Determine which project is next in rotation
    // Count existing blog tasks per project to find the one with fewest
    const { data: taskCounts } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', moayad.id)
      .ilike('title', '%blog post%')
      .in(
        'project_id',
        seoProjects.map((p) => p.id)
      );

    // Count tasks per project
    const countsMap: Record<string, number> = {};
    for (const project of seoProjects) {
      countsMap[project.id] = 0;
    }
    if (taskCounts) {
      for (const task of taskCounts) {
        if (task.project_id && countsMap[task.project_id] !== undefined) {
          countsMap[task.project_id]++;
        }
      }
    }

    // Pick project with fewest blog tasks (round-robin effect)
    const sortedProjects = [...seoProjects].sort(
      (a, b) => (countsMap[a.id] || 0) - (countsMap[b.id] || 0)
    );
    const nextProject = sortedProjects[0];

    // 5. Check if ANY blog task already exists for today (one task per day)
    const today = new Date().toISOString().split('T')[0];
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', moayad.id)
      .eq('due_date', today)
      .ilike('title', '%blog post%')
      .limit(1);

    if (existingTask && existingTask.length > 0) {
      console.log('[cron/blog-tasks] Blog task already exists for today:', existingTask[0].title);
      return NextResponse.json({
        success: true,
        message: 'Blog task already exists for today',
        skipped: true,
      });
    }

    // 6. Get next sort order
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .eq('status', 'Todo')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastTask ? lastTask.sort_order + 1 : 0;

    // 7. Create the task (scheduled 9-10 AM Cyprus time)
    const scheduleStart = `${today}T09:00:00+02:00`;
    const scheduleEnd = `${today}T10:00:00+02:00`;

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        title: `Write blog post for ${nextProject.name}`,
        description: `Daily SEO blog task: Write and publish a blog post for ${nextProject.name}. Use relevant keywords and ensure the content is optimized for search engines.`,
        status: 'Todo',
        priority: 'Medium',
        item_type: 'task',
        workspace_id: workspaceId,
        creator_id: moayad.id,
        assignee_id: moayad.id,
        project_id: nextProject.id,
        due_date: today,
        sort_order: nextSortOrder,
        show_in_inbox: true,
        scheduled_start_time: scheduleStart,
        scheduled_end_time: scheduleEnd,
      })
      .select()
      .single();

    if (createError) {
      console.error('[cron/blog-tasks] Error creating task:', createError);
      return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
    }

    console.log(`[cron/blog-tasks] Created blog task for ${nextProject.name} (ID: ${newTask.id})`);

    return NextResponse.json({
      success: true,
      message: `Created blog task for ${nextProject.name}`,
      task: {
        id: newTask.id,
        title: newTask.title,
        project: nextProject.name,
        due_date: today,
      },
    });
  } catch (error) {
    console.error('[cron/blog-tasks] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
