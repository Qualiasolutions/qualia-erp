import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Daily research task creator cron job
 * Runs daily at 3:05 AM UTC (6:05 AM Cyprus) - configured in vercel.json
 *
 * Creates a research task for each employee:
 * - Moayad: scheduled 9-10 AM (morning shift)
 * - Hasan: scheduled 6-7 PM (evening shift), weekdays only
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

interface Employee {
  id: string;
  full_name: string;
  scheduleStart: string; // HH:MM+TZ
  scheduleEnd: string;
  weekdaysOnly: boolean;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[cron/research-tasks] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/research-tasks] Starting daily research task creation...');

    const supabase = getSupabaseClient();
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });
    const dayOfWeek = new Date(today + 'T12:00:00+03:00').getDay(); // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Find employee profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['employee', 'manager']);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('[cron/research-tasks] No employee profiles found:', profilesError);
      return NextResponse.json({ success: false, error: 'No employees found' }, { status: 500 });
    }

    // Build employee config with schedules
    const employees: Employee[] = profiles.map((p) => {
      const name = (p.full_name || '').toLowerCase();
      const isHasan = name.includes('hasan');
      return {
        id: p.id,
        full_name: p.full_name || 'Employee',
        scheduleStart: isHasan ? '18:00+03:00' : '09:00+03:00',
        scheduleEnd: isHasan ? '19:00+03:00' : '10:00+03:00',
        weekdaysOnly: isHasan,
      };
    });

    // Get workspace from first employee
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('profile_id', employees[0].id)
      .eq('is_default', true)
      .single();

    if (!membership?.workspace_id) {
      console.error('[cron/research-tasks] Could not find workspace');
      return NextResponse.json({ success: false, error: 'No workspace found' }, { status: 500 });
    }

    const workspaceId = membership.workspace_id;

    // Pick topic via day-of-year rotation
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const topicIndex = dayOfYear % RESEARCH_TOPICS.length;
    const topic = RESEARCH_TOPICS[topicIndex];

    const results: { employee: string; created: boolean; reason?: string }[] = [];

    for (const emp of employees) {
      // Skip weekend employees
      if (emp.weekdaysOnly && !isWeekday) {
        results.push({ employee: emp.full_name, created: false, reason: 'weekend' });
        continue;
      }

      // Dedup check
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('assignee_id', emp.id)
        .eq('due_date', today)
        .ilike('title', '%Daily Research%')
        .limit(1);

      if (existingTask && existingTask.length > 0) {
        results.push({ employee: emp.full_name, created: false, reason: 'already exists' });
        continue;
      }

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
        title: `Daily Research: ${topic}`,
        description: `Research topic: ${topic}\n\nWorkflow:\n1. Use Gemini Deep Research to explore this topic\n2. Paste output into NotebookLM for summarization\n3. Add useful snippets to /knowledge\n4. Mark this task Done`,
        status: 'Todo',
        priority: 'Medium',
        item_type: 'task',
        workspace_id: workspaceId,
        creator_id: emp.id,
        assignee_id: emp.id,
        due_date: today,
        sort_order: nextSortOrder,
        show_in_inbox: true,
        scheduled_start_time: `${today}T${emp.scheduleStart}`,
        scheduled_end_time: `${today}T${emp.scheduleEnd}`,
      });

      if (createError) {
        console.error(
          `[cron/research-tasks] Error creating task for ${emp.full_name}:`,
          createError
        );
        results.push({ employee: emp.full_name, created: false, reason: createError.message });
      } else {
        console.log(`[cron/research-tasks] Created research task for ${emp.full_name}: "${topic}"`);
        results.push({ employee: emp.full_name, created: true });
      }
    }

    return NextResponse.json({
      success: true,
      topic,
      date: today,
      results,
    });
  } catch (error) {
    console.error('[cron/research-tasks] Unexpected error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
