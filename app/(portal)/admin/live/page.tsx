import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalAuthUser } from '@/lib/portal-cache';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { LivePresencePanel } from '@/components/admin/live-presence-panel';

export const metadata: Metadata = {
  title: 'Live presence | Qualia',
  description: 'See which page each online user is on, in real time.',
};

export default async function AdminLivePage() {
  const user = await getPortalAuthUser();
  if (!user) redirect('/auth/login');

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/');

  return (
    <div className="mx-auto w-full max-w-4xl p-6 lg:p-8">
      <LivePresencePanel workspaceId={workspaceId} selfUserId={user.id} />
    </div>
  );
}
