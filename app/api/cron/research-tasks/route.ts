import { NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-utils';
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
  'Latest Claude Code updates, new features, and workflow tips',
  'New GitHub repos and open-source tools for AI-assisted development',
  'Supabase updates: new features, edge functions, RLS patterns',
  'Next.js and Vercel updates: new releases, performance improvements',
  'AI coding assistants: Cursor, Windsurf, Claude Code comparisons',
  'Voice AI platforms: VAPI, Retell, ElevenLabs latest updates',
  'Tailwind CSS and UI libraries: shadcn/ui, Radix updates',
  'TypeScript ecosystem: new tools, libraries, best practices',
  'MCP servers and AI tool integrations: new protocols and servers',
  'React 19 and Server Components: patterns and real-world usage',
  'Vercel AI SDK and LLM orchestration: new patterns and tools',
  'Cloudflare Workers and edge computing: latest capabilities',
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

    if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.error('[cron/research-tasks] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/research-tasks] Starting daily research task creation...');

    const supabase = getSupabaseClient();
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' });
    const dayOfWeek = new Date(today + 'T12:00:00+03:00').getDay(); // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // Only create research tasks for Moayad (weekdays, 8:00-8:40 AM Cyprus)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', '%moayad%');

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('[cron/research-tasks] Moayad profile not found:', profilesError);
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 500 });
    }

    const employees: Employee[] = profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name || 'Employee',
      scheduleStart: '08:00+03:00',
      scheduleEnd: '08:40+03:00',
      weekdaysOnly: true,
    }));

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
        description: `Research topic: ${topic}\n\nWorkflow:\n1. Use Gemini Deep Research or Perplexity to explore this topic\n2. Summarize key findings, new tools, and actionable insights\n3. Share a brief summary in the Qualia WhatsApp group\n4. Mark this task Done`,
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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
