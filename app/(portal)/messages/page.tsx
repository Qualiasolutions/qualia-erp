import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalAuthUser, getPortalProfile } from '@/lib/portal-cache';
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

  const userName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const userRole = profile?.role || 'client';

  return <MessagesContent userId={user.id} userName={userName} userRole={userRole} />;
}
