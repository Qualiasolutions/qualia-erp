import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
import { assertAppEnabledForClient } from '@/lib/portal-utils';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { MessagesContent } from './messages-content';

export const metadata: Metadata = {
  title: 'Messages | Portal',
};

export default async function PortalMessagesPage() {
  const user = await getPortalAuthUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getPortalProfile(user.id);

  // App Library guard: block clients if the "messages" app is disabled
  if (profile?.role === 'client') {
    const workspaceId = await getCurrentWorkspaceId();
    const allowed = await assertAppEnabledForClient(user.id, workspaceId, 'messages', profile.role);
    if (!allowed) redirect('/');
  }

  const userName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const userRole = profile?.role || 'client';

  return <MessagesContent userId={user.id} userName={userName} userRole={userRole} />;
}
