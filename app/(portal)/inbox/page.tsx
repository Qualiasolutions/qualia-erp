import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentWorkspaceId } from '@/app/actions';
import { getTasks, type Task } from '@/app/actions/inbox';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { InboxView } from './inbox-view';

export const metadata: Metadata = {
  title: 'Inbox | Qualia',
  description: 'Your task inbox',
};

export default async function PortalInboxPage() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');
  const profile = await getPortalProfile(user.id);
  if (profile?.role === 'client') redirect('/');

  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your inbox</p>
      </div>
    );
  }

  // Hide completed tasks by default — keeps inbox clean for everyone
  const tasks = (await getTasks(workspaceId, {
    status: ['Todo', 'In Progress'],
    limit: 200,
    inboxOnly: true,
  })) as Task[];

  return <InboxView initialTasks={tasks} />;
}
