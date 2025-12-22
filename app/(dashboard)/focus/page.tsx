import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FocusMode } from '@/components/focus-mode';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Focus Mode',
  description: 'Deep work mode with Pomodoro timer and distraction-free interface',
};

async function getFocusTasks(userId: string, workspaceId: string) {
  const supabase = await createClient();

  // Get tasks assigned to user that are high priority or due soon
  const { data: assignedTasks } = await supabase
    .from('issue_assignees')
    .select(
      `
      issue:issues(
        id,
        title,
        priority,
        status,
        due_date,
        project:projects(name)
      )
    `
    )
    .eq('assignee_id', userId);

  // Also get high priority tasks in the workspace
  const { data: highPriorityTasks } = await supabase
    .from('issues')
    .select(
      `
      id,
      title,
      priority,
      status,
      due_date,
      project:projects(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .in('priority', ['high', 'critical'])
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(10);

  // Combine and dedupe tasks
  const taskMap = new Map();

  // Add assigned tasks first
  assignedTasks?.forEach((item) => {
    const task = Array.isArray(item.issue) ? item.issue[0] : item.issue;
    if (task && task.status !== 'done') {
      taskMap.set(task.id, {
        id: task.id,
        title: task.title,
        completed: false,
        priority: task.priority,
        project: Array.isArray(task.project) ? task.project[0] : task.project,
      });
    }
  });

  // Add high priority tasks
  highPriorityTasks?.forEach((task) => {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, {
        id: task.id,
        title: task.title,
        completed: false,
        priority: task.priority,
        project: Array.isArray(task.project) ? task.project[0] : task.project,
      });
    }
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const tasks = Array.from(taskMap.values()).sort((a, b) => {
    return (
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
    );
  });

  return tasks.slice(0, 8); // Limit to 8 tasks for focus mode
}

export default async function FocusPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  const workspaceId = membership?.workspace_id;

  if (!workspaceId) {
    redirect('/onboarding');
  }

  const tasks = await getFocusTasks(user.id, workspaceId);

  return <FocusMode tasks={tasks} />;
}
