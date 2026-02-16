import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Daily research task creator cron job
 * Runs daily at 3:05 AM UTC (6:05 AM Jordan) - configured in vercel.json
 *
 * Creates a task in Moayad's inbox to research a rotating topic
 * using Gemini Deep Research + NotebookLM.
 */

const RESEARCH_TOPICS = [
  'Lead generation opportunities in healthcare',
  'Competitor analysis for AI automation agencies',
  'New AI tools and platforms for business automation',
  'Market trends in voice AI and conversational AI',
  'Potential partnership opportunities for Qualia',
  'Client industry deep dive: e-commerce automation',
  'SEO and content marketing strategies for AI agencies',
  'Pricing strategies for AI services',
];

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
        console.error('[cron/research-tasks] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[cron/research-tasks] Starting daily research task creation...');

    const supabase = getSupabaseClient();

    // 1. Find Moayad's profile
    const { data: moayad, error: moayadError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', '%moayad%')
      .limit(1)
      .single();

    if (moayadError || !moayad) {
      console.error('[cron/research-tasks] Could not find Moayad:', moayadError);
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
      console.error('[cron/research-tasks] Could not find workspace for Moayad');
      return NextResponse.json({ success: false, error: 'No workspace found' }, { status: 500 });
    }

    const workspaceId = membership.workspace_id;

    // 3. Pick topic via day-of-year rotation (8 topics cycling)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const topicIndex = dayOfYear % RESEARCH_TOPICS.length;
    const topic = RESEARCH_TOPICS[topicIndex];

    // 4. Dedup check: no existing research task for today
    const today = now.toISOString().split('T')[0];
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', moayad.id)
      .eq('due_date', today)
      .ilike('title', '%Daily Research%')
      .limit(1);

    if (existingTask && existingTask.length > 0) {
      console.log(
        '[cron/research-tasks] Research task already exists for today:',
        existingTask[0].title
      );
      return NextResponse.json({
        success: true,
        message: 'Research task already exists for today',
        skipped: true,
      });
    }

    // 5. Get next sort order
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .eq('status', 'Todo')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastTask ? lastTask.sort_order + 1 : 0;

    // 6. Create the task (scheduled 9-10 AM Cyprus time)
    const scheduleStart = `${today}T09:00:00+02:00`;
    const scheduleEnd = `${today}T10:00:00+02:00`;

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert({
        title: `Daily Research: ${topic} — See /knowledge for guides and snippets (Guide: /guides/daily-research)`,
        description: `Research topic: ${topic}\n\nWorkflow:\n1. Use Gemini Deep Research to explore this topic\n2. Paste output into NotebookLM for summarization\n3. Add useful snippets to /knowledge\n4. Mark this task Done`,
        status: 'Todo',
        priority: 'Medium',
        item_type: 'task',
        workspace_id: workspaceId,
        creator_id: moayad.id,
        assignee_id: moayad.id,
        due_date: today,
        sort_order: nextSortOrder,
        show_in_inbox: true,
        scheduled_start_time: scheduleStart,
        scheduled_end_time: scheduleEnd,
      })
      .select()
      .single();

    if (createError) {
      console.error('[cron/research-tasks] Error creating task:', createError);
      return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
    }

    console.log(`[cron/research-tasks] Created research task: "${topic}" (ID: ${newTask.id})`);

    return NextResponse.json({
      success: true,
      message: `Created research task: ${topic}`,
      task: {
        id: newTask.id,
        title: newTask.title,
        topic,
        due_date: today,
      },
    });
  } catch (error) {
    console.error('[cron/research-tasks] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
