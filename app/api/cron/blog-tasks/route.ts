import { NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Daily blog task creator cron job
 * Runs daily at 5:05 AM UTC (8:05 AM Cyprus) - configured in vercel.json
 *
 * Creates a blog-writing task for Moayad, rotating through:
 * Aquador, Qualia Solutions, ZNSO
 * Scheduled 8:40-9:20 AM Cyprus, weekdays only
 */

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Employee {
  id: string;
  full_name: string;
  scheduleStart: string;
  scheduleEnd: string;
  weekdaysOnly: boolean;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/blog-tasks] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/blog-tasks] Starting daily blog task creation...');

    const supabase = getSupabaseClient();
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });
    const dayOfWeek = new Date(today + 'T12:00:00+03:00').getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Only create blog tasks for Moayad (weekdays, 8:40-9:20 AM Cyprus)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', '%moayad%');

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('[cron/blog-tasks] Moayad profile not found:', profilesError);
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 500 });
    }

    const employees: Employee[] = profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name || 'Employee',
      scheduleStart: '08:40+03:00',
      scheduleEnd: '09:20+03:00',
      weekdaysOnly: true,
    }));

    // Get workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', employees[0].id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      console.error('[cron/blog-tasks] Could not find workspace');
      return NextResponse.json({ success: false, error: 'No workspace found' }, { status: 500 });
    }

    const workspaceId = membership.workspace_id;

    // Get blog target projects: Aquador, Qualia Solutions, ZNSO only
    const { data: seoProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, project_type')
      .eq('workspace_id', workspaceId)
      .or('name.ilike.%Aquador%,name.ilike.%Qualia Solutions%,name.ilike.%ZNSO%')
      .order('name');

    if (projectsError || !seoProjects || seoProjects.length === 0) {
      console.error('[cron/blog-tasks] No SEO projects found:', projectsError);
      return NextResponse.json({ success: false, error: 'No SEO projects found' }, { status: 500 });
    }

    const results: { employee: string; created: boolean; project?: string; reason?: string }[] = [];

    for (const emp of employees) {
      // Skip weekend employees
      if (emp.weekdaysOnly && !isWeekday) {
        results.push({ employee: emp.full_name, created: false, reason: 'weekend' });
        continue;
      }

      // Dedup check — one blog task per employee per day
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', emp.id)
        .eq('due_date', today)
        .ilike('title', '%blog post%')
        .limit(1);

      if (existingTask && existingTask.length > 0) {
        results.push({ employee: emp.full_name, created: false, reason: 'already exists' });
        continue;
      }

      // Pick project with fewest blog tasks for this employee (round-robin)
      const { data: taskCounts } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', emp.id)
        .ilike('title', '%blog post%')
        .in(
          'project_id',
          seoProjects.map((p) => p.id)
        );

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

      const sortedProjects = [...seoProjects].sort(
        (a, b) => (countsMap[a.id] || 0) - (countsMap[b.id] || 0)
      );
      const nextProject = sortedProjects[0];

      // Get next sort order
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('workspace_id', workspaceId)
        .eq('status', 'Todo')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = lastTask ? lastTask.sort_order + 1 : 0;

      const { error: createError } = await supabase.from('tasks').insert({
        title: `Write blog post for ${nextProject.name}`,
        description: `Daily SEO blog task: Write and publish a blog post for ${nextProject.name}. Use relevant keywords and ensure the content is optimized for search engines.`,
        status: 'Todo',
        priority: 'Medium',
        item_type: 'task',
        workspace_id: workspaceId,
        creator_id: emp.id,
        assignee_id: emp.id,
        project_id: nextProject.id,
        due_date: today,
        sort_order: nextSortOrder,
        show_in_inbox: true,
        scheduled_start_time: `${today}T${emp.scheduleStart}`,
        scheduled_end_time: `${today}T${emp.scheduleEnd}`,
      });

      if (createError) {
        console.error(`[cron/blog-tasks] Error creating task for ${emp.full_name}:`, createError);
        results.push({ employee: emp.full_name, created: false, reason: createError.message });
      } else {
        console.log(
          `[cron/blog-tasks] Created blog task for ${emp.full_name}: ${nextProject.name}`
        );
        results.push({ employee: emp.full_name, created: true, project: nextProject.name });
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      results,
    });
  } catch (error) {
    console.error('[cron/blog-tasks] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
