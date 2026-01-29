import type { Metadata } from 'next';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getTasks, type Task } from '@/app/actions/inbox';
import { InboxView } from './inbox-view';

export const metadata: Metadata = {
  title: 'Inbox | Qualia',
  description: 'Your task inbox',
};

export default async function InboxPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your inbox</p>
      </div>
    );
  }

  // Fetch inbox tasks
  const tasksRaw = await getTasks(workspaceId, {
    status: ['Todo', 'In Progress', 'Done'],
    limit: 200,
    inboxOnly: true,
  });

  // Filter to only show tasks (not notes/resources)
  const today = new Date().toISOString().split('T')[0];
  const tasks = tasksRaw
    .filter((t) => {
      if (t.item_type !== 'task') return false;
      if (t.status !== 'Done') return true;
      // If done, only show if completed today
      return t.completed_at?.startsWith(today);
    })
    .map((t) => ({
      ...t,
      status: t.status as 'Todo' | 'In Progress' | 'Done',
      priority: t.priority as 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low',
    })) as Task[];

  return <InboxView initialTasks={tasks} />;
}
